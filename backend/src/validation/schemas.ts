import { z } from 'zod';
import { VALID_AIRCRAFT_TYPES } from '../seatGeneration/aircraftLayouts';

export const MIN_FLIGHT_YEAR = 2000;
export const MAX_FLIGHT_YEAR = 2100;

export function isRealUtcDate(year: number, month: number, day: number): boolean {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC maps years 0-99 onto 1900-1999; undo that so year 1 stays year 1.
  if (year >= 0 && year < 100) {
    parsed.setUTCFullYear(year);
  }
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const isoDateSchema = z
  .string({ required_error: 'date is required' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    return isRealUtcDate(year, month, day);
  }, 'date must be a valid calendar date')
  .refine((value) => {
    const year = Number(value.slice(0, 4));
    return year >= MIN_FLIGHT_YEAR && year <= MAX_FLIGHT_YEAR;
  }, `date must be between ${MIN_FLIGHT_YEAR}-01-01 and ${MAX_FLIGHT_YEAR}-12-31`);

export function normalizeFlightNumber(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

const flightNumberSchema = z
  .string({ required_error: 'flightNumber is required' })
  .trim()
  .min(1, 'flightNumber is required')
  .max(10, 'flightNumber must be at most 10 characters')
  .transform(normalizeFlightNumber);

export const checkRequestSchema = z.object({
  flightNumber: flightNumberSchema,
  date: isoDateSchema,
});

export type CheckRequest = z.infer<typeof checkRequestSchema>;

export const generateRequestSchema = z.object({
  name: z
    .string({ required_error: 'name is required' })
    .trim()
    .min(1, 'name is required')
    .max(100, 'name must be at most 100 characters'),
  id: z
    .string({ required_error: 'id is required' })
    .trim()
    .min(1, 'id is required')
    .max(50, 'id must be at most 50 characters'),
  flightNumber: flightNumberSchema,
  date: isoDateSchema,
  aircraft: z.enum(VALID_AIRCRAFT_TYPES as [string, ...string[]], {
    errorMap: () => ({
      message: `aircraft must be one of: ${VALID_AIRCRAFT_TYPES.join(', ')}`,
    }),
  }),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
