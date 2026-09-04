import {
  MAX_FLIGHT_YEAR,
  MIN_FLIGHT_YEAR,
  checkRequestSchema,
  generateRequestSchema,
  isRealUtcDate,
  normalizeFlightNumber,
} from '../../validation/schemas';

const validPayload = {
  name: 'Sarah',
  id: '98123',
  flightNumber: 'ID102',
  date: '2025-07-12',
  aircraft: 'AIRBUS_320',
};

describe('normalizeFlightNumber', () => {
  it('upper-cases and strips all whitespace', () => {
    expect(normalizeFlightNumber('ga102')).toBe('GA102');
    expect(normalizeFlightNumber('  ga 102  ')).toBe('GA102');
    expect(normalizeFlightNumber('GA\t102')).toBe('GA102');
  });
});

describe('flightNumber normalization through the schemas', () => {
  it('normalizes flightNumber on generate requests', () => {
    const parsed = generateRequestSchema.parse({ ...validPayload, flightNumber: ' ga 102 ' });
    expect(parsed.flightNumber).toBe('GA102');
  });

  it('normalizes flightNumber on check requests', () => {
    const parsed = checkRequestSchema.parse({ flightNumber: 'ga102', date: '2025-07-12' });
    expect(parsed.flightNumber).toBe('GA102');
  });

  it('still rejects a flightNumber longer than 10 characters', () => {
    const result = checkRequestSchema.safeParse({ flightNumber: 'ABCDEFGHIJK', date: '2025-07-12' });
    expect(result.success).toBe(false);
  });

  it('still rejects a whitespace-only flightNumber', () => {
    const result = checkRequestSchema.safeParse({ flightNumber: '   ', date: '2025-07-12' });
    expect(result.success).toBe(false);
  });
});

describe('isRealUtcDate', () => {
  it('accepts a leap day', () => {
    expect(isRealUtcDate(2028, 2, 29)).toBe(true);
  });

  it('rejects Feb 29 on a non-leap year', () => {
    expect(isRealUtcDate(2026, 2, 29)).toBe(false);
  });

  it('does not silently remap years below 100 onto the 1900s', () => {
    expect(isRealUtcDate(1, 1, 1)).toBe(true);
  });
});

describe('flight date range', () => {
  it('accepts a date inside the supported range', () => {
    const result = checkRequestSchema.safeParse({ flightNumber: 'GA102', date: '2025-07-12' });
    expect(result.success).toBe(true);
  });

  it('rejects a date before the supported range', () => {
    const result = checkRequestSchema.safeParse({ flightNumber: 'GA102', date: '1900-01-01' });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].message).toMatch(/between/);
  });

  it('rejects a year-1 date even though it is a real calendar date', () => {
    const result = checkRequestSchema.safeParse({ flightNumber: 'GA102', date: '0001-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects a date after the supported range', () => {
    const result = checkRequestSchema.safeParse({ flightNumber: 'GA102', date: '2101-01-01' });
    expect(result.success).toBe(false);
  });

  it('accepts both range boundaries', () => {
    expect(
      checkRequestSchema.safeParse({ flightNumber: 'GA102', date: `${MIN_FLIGHT_YEAR}-01-01` })
        .success
    ).toBe(true);
    expect(
      checkRequestSchema.safeParse({ flightNumber: 'GA102', date: `${MAX_FLIGHT_YEAR}-12-31` })
        .success
    ).toBe(true);
  });

  it('still rejects an impossible calendar date', () => {
    const result = checkRequestSchema.safeParse({ flightNumber: 'GA102', date: '2025-02-30' });
    expect(result.success).toBe(false);
  });
});

describe('name and id length caps', () => {
  it('rejects a name longer than 100 characters', () => {
    const result = generateRequestSchema.safeParse({ ...validPayload, name: 'x'.repeat(101) });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].message).toMatch(/at most 100/);
  });

  it('rejects an id longer than 50 characters', () => {
    const result = generateRequestSchema.safeParse({ ...validPayload, id: 'y'.repeat(51) });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].message).toMatch(/at most 50/);
  });

  it('accepts values exactly at the caps', () => {
    const result = generateRequestSchema.safeParse({
      ...validPayload,
      name: 'x'.repeat(100),
      id: 'y'.repeat(50),
    });
    expect(result.success).toBe(true);
  });
});
