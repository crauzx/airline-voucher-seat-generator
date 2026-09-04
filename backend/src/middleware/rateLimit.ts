import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors/ApiError';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Hard cap on distinct clients tracked at once. Bounds memory under address rotation. */
  maxTrackedKeys?: number;
}

interface WindowState {
  count: number;
  resetAt: number;
}

const DEFAULT_MAX_TRACKED_KEYS = 10_000;

/**
 * Fixed-window per-client limiter. In-memory on purpose: this app runs as a single
 * process against a single SQLite file, so a shared store would buy nothing.
 */
export function createRateLimiter({
  windowMs,
  max,
  maxTrackedKeys = DEFAULT_MAX_TRACKED_KEYS,
}: RateLimitOptions) {
  const windows = new Map<string, WindowState>();

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();

    // Sweep expired entries so the map cannot grow without bound across windows.
    for (const [key, state] of windows) {
      if (state.resetAt <= now) {
        windows.delete(key);
      }
    }

    const key = req.ip ?? 'unknown';
    let state = windows.get(key);

    if (!state) {
      // Bound growth *within* a single window too: a client rotating source
      // addresses (IPv6 rotation, a botnet) would otherwise add one live entry
      // per address, none sweepable until its own window elapses. Evict the
      // oldest-inserted entry once at capacity, and only when admitting a
      // genuinely new key -- never to make room for a key already tracked.
      // Trade-off, taken deliberately: under an address-rotation attack this
      // can reset a legitimate client's counter early, which is preferable to
      // unbounded memory growth.
      if (windows.size >= maxTrackedKeys) {
        const oldestKey = windows.keys().next().value;
        if (oldestKey !== undefined) {
          windows.delete(oldestKey);
        }
      }
      state = { count: 0, resetAt: now + windowMs };
      windows.set(key, state);
    }

    state.count += 1;
    if (state.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((state.resetAt - now) / 1000)));
      next(ApiError.rateLimited());
      return;
    }

    next();
  };
}
