import { postJson, ApiRequestError } from '../api/client';

describe('postJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves with parsed JSON on a successful response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ exists: false }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await postJson('/api/check', { flightNumber: 'GA102', date: '2025-07-12' });

    expect(result).toEqual({ exists: false });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/check',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws an ApiRequestError parsed from the error JSON shape on a non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: { code: 'VOUCHER_EXISTS', message: 'Vouchers already generated' },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(postJson('/api/generate', {})).rejects.toMatchObject({
      status: 409,
      code: 'VOUCHER_EXISTS',
      message: 'Vouchers already generated',
    });
  });

  it('falls back to a generic message when the error body cannot be parsed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('invalid json');
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(postJson('/api/generate', {})).rejects.toBeInstanceOf(ApiRequestError);
  });
});
