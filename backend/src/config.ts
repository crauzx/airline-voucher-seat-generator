import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// The two origins the README documents for the frontend: the Vite dev server and
// the nginx container. Both documented run modes proxy /api, so cross-origin access
// is not needed by default — set CORS_ORIGINS to override, or to "" to disable CORS.
const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];

function parseOrigins(raw: string | undefined): string[] {
  if (raw === undefined) {
    return DEFAULT_CORS_ORIGINS;
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Number(x) || fallback treats an explicit 0 the same as "unset", which is wrong for
// settings where 0 is a meaningful value (RATE_LIMIT_MAX=0 means "block everything").
// This parses explicitly instead: unset/empty/non-numeric/below-minValue all fall back
// to the default without throwing, so a bad env var degrades gracefully rather than
// crashing startup. `minValue` lets callers decide whether 0 itself is acceptable.
export function parseIntEnv(raw: string | undefined, defaultValue: number, minValue = 0): number {
  if (raw === undefined || raw.trim() === '') {
    return defaultValue;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < minValue) {
    return defaultValue;
  }
  return parsed;
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.resolve(__dirname, '../data/vouchers.db'),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  rateLimit: {
    // A zero-length window is not sensible, so only positive values are accepted here.
    windowMs: parseIntEnv(process.env.RATE_LIMIT_WINDOW_MS, 60_000, 1),
    // 0 is a meaningful, deliberate value ("block everything"), so it must be accepted.
    max: parseIntEnv(process.env.RATE_LIMIT_MAX, 60, 0),
  },
};
