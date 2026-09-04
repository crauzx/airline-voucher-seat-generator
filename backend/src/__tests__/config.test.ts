import { parseIntEnv } from '../config';

describe('parseIntEnv', () => {
  it('falls back to the default when the env var is unset', () => {
    expect(parseIntEnv(undefined, 60, 0)).toBe(60);
  });

  it('falls back to the default when the env var is an empty string', () => {
    expect(parseIntEnv('', 60, 0)).toBe(60);
  });

  it('falls back to the default when the env var is only whitespace', () => {
    expect(parseIntEnv('   ', 60, 0)).toBe(60);
  });

  it('parses a valid positive number', () => {
    expect(parseIntEnv('120', 60, 0)).toBe(120);
  });

  it('accepts 0 when minValue is 0 (RATE_LIMIT_MAX=0 means block everything)', () => {
    expect(parseIntEnv('0', 60, 0)).toBe(0);
  });

  it('falls back to the default when the value is 0 but minValue is 1 (zero-length window is invalid)', () => {
    expect(parseIntEnv('0', 60_000, 1)).toBe(60_000);
  });

  it('falls back to the default for a negative value', () => {
    expect(parseIntEnv('-5', 60, 0)).toBe(60);
  });

  it('falls back to the default for a non-numeric value', () => {
    expect(parseIntEnv('not-a-number', 60, 0)).toBe(60);
  });

  it('does not throw for malformed input', () => {
    expect(() => parseIntEnv('abc', 60, 0)).not.toThrow();
    expect(() => parseIntEnv('-1', 60_000, 1)).not.toThrow();
  });
});
