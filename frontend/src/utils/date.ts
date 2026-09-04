const DISPLAY_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

function isRealCalendarDate(day: number, month: number, year: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC maps years 0-99 onto 1900-1999; undo that so year 1 stays year 1.
  if (year >= 0 && year < 100) {
    date.setUTCFullYear(year);
  }
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function convertDisplayDateToIso(displayDate: string): string | null {
  const match = DISPLAY_DATE_PATTERN.exec(displayDate.trim());
  if (!match) return null;

  const [, dayStr, monthStr, yearStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);

  if (!isRealCalendarDate(day, month, year)) return null;

  return `${yearStr}-${monthStr}-${dayStr}`;
}

export function formatDateInput(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join('-');
}

/** Position in `formatted` immediately after its `digitIndex`-th digit. */
export function caretPositionForDigitIndex(formatted: string, digitIndex: number): number {
  if (digitIndex <= 0) return 0;

  let seen = 0;
  for (let index = 0; index < formatted.length; index++) {
    const character = formatted[index];
    if (character >= '0' && character <= '9') {
      seen += 1;
      if (seen === digitIndex) return index + 1;
    }
  }
  return formatted.length;
}

export interface MaskedDateEdit {
  value: string;
  caret: number;
}

/**
 * Re-applies the DD-MM-YYYY mask to a raw edit and works out where the caret should
 * land, so typing in the middle of a filled date behaves the way the typist expects.
 */
export function applyDateInputEdit(
  previousValue: string,
  rawValue: string,
  caret: number
): MaskedDateEdit {
  const previousDigits = previousValue.replace(/\D/g, '');
  const rawDigits = rawValue.replace(/\D/g, '');
  let digitsBeforeCaret = rawValue.slice(0, caret).replace(/\D/g, '').length;
  let nextDigits = rawDigits;

  // A backspace that only removed a separator leaves the digits untouched, so the
  // mask would immediately put the separator back and the keypress would look dead.
  // Delete the digit in front of the separator instead.
  if (
    rawValue.length < previousValue.length &&
    rawDigits === previousDigits &&
    digitsBeforeCaret > 0
  ) {
    nextDigits = rawDigits.slice(0, digitsBeforeCaret - 1) + rawDigits.slice(digitsBeforeCaret);
    digitsBeforeCaret -= 1;
  }

  const value = formatDateInput(nextDigits);
  return { value, caret: caretPositionForDigitIndex(value, digitsBeforeCaret) };
}

// Sanity bounds on a flight date, mirroring MIN_FLIGHT_YEAR / MAX_FLIGHT_YEAR in
// backend/src/validation/schemas.ts. Fixed rather than clock-derived so tests are
// deterministic. This is not a business rule about past flights.
export const MIN_FLIGHT_YEAR = 2000;
export const MAX_FLIGHT_YEAR = 2100;

export function isFlightYearInRange(year: number): boolean {
  return year >= MIN_FLIGHT_YEAR && year <= MAX_FLIGHT_YEAR;
}
