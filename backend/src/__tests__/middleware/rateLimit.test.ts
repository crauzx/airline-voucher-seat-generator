import { NextFunction, Request, Response } from 'express';
import { createRateLimiter } from '../../middleware/rateLimit';
import { ApiError } from '../../errors/ApiError';

function fakeRequest(ip: string): Request {
  return { ip } as unknown as Request;
}

function fakeResponse(): Response & { headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
  } as unknown as Response & { headers: Record<string, string> };
}

describe('createRateLimiter', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('passes requests through while under the limit', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 3 });
    const next = jest.fn() as unknown as NextFunction;

    for (let i = 0; i < 3; i++) {
      limiter(fakeRequest('1.2.3.4'), fakeResponse(), next);
    }

    expect(next).toHaveBeenCalledTimes(3);
    expect((next as jest.Mock).mock.calls.every((call) => call.length === 0)).toBe(true);
  });

  it('rejects the request that exceeds the limit with a 429 ApiError', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2 });
    const next = jest.fn() as unknown as NextFunction;
    const response = fakeResponse();

    limiter(fakeRequest('1.2.3.4'), response, next);
    limiter(fakeRequest('1.2.3.4'), response, next);
    limiter(fakeRequest('1.2.3.4'), response, next);

    const lastArgument = (next as jest.Mock).mock.calls[2][0];
    expect(lastArgument).toBeInstanceOf(ApiError);
    expect((lastArgument as ApiError).statusCode).toBe(429);
    expect((lastArgument as ApiError).code).toBe('RATE_LIMITED');
    expect(response.headers['Retry-After']).toBeDefined();
  });

  it('counts each client address separately', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    const next = jest.fn() as unknown as NextFunction;

    limiter(fakeRequest('1.1.1.1'), fakeResponse(), next);
    limiter(fakeRequest('2.2.2.2'), fakeResponse(), next);

    expect((next as jest.Mock).mock.calls.every((call) => call.length === 0)).toBe(true);
  });

  it('starts a fresh window once the old one has elapsed', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-03T00:00:00.000Z'));

    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    const next = jest.fn() as unknown as NextFunction;

    limiter(fakeRequest('1.2.3.4'), fakeResponse(), next);
    limiter(fakeRequest('1.2.3.4'), fakeResponse(), next);
    expect((next as jest.Mock).mock.calls[1][0]).toBeInstanceOf(ApiError);

    jest.setSystemTime(new Date('2026-09-03T00:00:01.500Z'));
    limiter(fakeRequest('1.2.3.4'), fakeResponse(), next);

    expect((next as jest.Mock).mock.calls[2].length).toBe(0);
  });

  // The tracked-client Map is a private implementation detail with no getter
  // exposed on the returned middleware function, and adding one purely so a
  // test can read `windows.size` would leak an internal into the public
  // surface for no reason other than test convenience. So these eviction
  // tests instead assert the *behavioural consequence* of bounded tracking:
  // once capacity is exceeded, the oldest-inserted client is dropped and is
  // therefore treated as brand new (its budget resets) on its next request.
  // That is externally observable through `next`'s arguments alone.

  it('keeps the tracked-client map bounded under address rotation', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, maxTrackedKeys: 3 });
    const next = jest.fn() as unknown as NextFunction;

    // Three distinct addresses fill the map to capacity.
    limiter(fakeRequest('1.1.1.1'), fakeResponse(), next);
    limiter(fakeRequest('2.2.2.2'), fakeResponse(), next);
    limiter(fakeRequest('3.3.3.3'), fakeResponse(), next);

    // Two more distinct addresses rotate in, each past capacity -- if the map
    // grew without bound, address 1.1.1.1 would still be tracked below.
    limiter(fakeRequest('4.4.4.4'), fakeResponse(), next);
    limiter(fakeRequest('5.5.5.5'), fakeResponse(), next);

    // A second request from the very first address is admitted as if it were
    // new, proving its entry was evicted rather than retained forever.
    limiter(fakeRequest('1.1.1.1'), fakeResponse(), next);

    const lastCall = (next as jest.Mock).mock.calls[(next as jest.Mock).mock.calls.length - 1];
    expect(lastCall.length).toBe(0);
  });

  it('evicts the oldest-inserted key, not an arbitrary one', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, maxTrackedKeys: 2 });
    const next = jest.fn() as unknown as NextFunction;

    limiter(fakeRequest('1.1.1.1'), fakeResponse(), next); // oldest
    limiter(fakeRequest('2.2.2.2'), fakeResponse(), next); // newest, map now at cap

    // A third, brand-new address forces an eviction. It must take the oldest
    // entry (1.1.1.1), leaving 2.2.2.2 tracked.
    limiter(fakeRequest('3.3.3.3'), fakeResponse(), next);

    // 2.2.2.2 is still tracked, so its second request (against max: 1) is
    // rejected. If eviction had instead dropped 2.2.2.2, this would be
    // treated as a brand-new key and admitted.
    limiter(fakeRequest('2.2.2.2'), fakeResponse(), next);

    const calls = (next as jest.Mock).mock.calls;
    expect(calls[3][0]).toBeInstanceOf(ApiError);
  });

  it('does not evict when a request for an existing key arrives at capacity', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2, maxTrackedKeys: 2 });
    const next = jest.fn() as unknown as NextFunction;

    limiter(fakeRequest('1.1.1.1'), fakeResponse(), next); // count 1, map at cap
    limiter(fakeRequest('2.2.2.2'), fakeResponse(), next); // count 1, map at cap

    // Repeat requests for an EXISTING key while the map sits at capacity must
    // not evict anything -- the eviction path only runs for a new key.
    limiter(fakeRequest('1.1.1.1'), fakeResponse(), next); // count 2, still admitted
    limiter(fakeRequest('2.2.2.2'), fakeResponse(), next); // count 2, still admitted

    // If 2.2.2.2 had been wrongly evicted by 1.1.1.1's repeat visits above,
    // this would be treated as a fresh key and admitted instead of rejected.
    limiter(fakeRequest('2.2.2.2'), fakeResponse(), next); // count 3, rejected

    const calls = (next as jest.Mock).mock.calls;
    expect(calls[2].length).toBe(0);
    expect(calls[3].length).toBe(0);
    expect(calls[4][0]).toBeInstanceOf(ApiError);
  });

  it('rejects the first request when max is 0', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 0 });
    const next = jest.fn() as unknown as NextFunction;

    limiter(fakeRequest('1.2.3.4'), fakeResponse(), next);

    const lastArgument = (next as jest.Mock).mock.calls[0][0];
    expect(lastArgument).toBeInstanceOf(ApiError);
    expect((lastArgument as ApiError).statusCode).toBe(429);
  });

  it('admits exactly one request when max is 1 and rejects the second', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    const next = jest.fn() as unknown as NextFunction;

    limiter(fakeRequest('1.2.3.4'), fakeResponse(), next);
    limiter(fakeRequest('1.2.3.4'), fakeResponse(), next);

    const calls = (next as jest.Mock).mock.calls;
    expect(calls[0].length).toBe(0);
    expect(calls[1][0]).toBeInstanceOf(ApiError);
  });
});
