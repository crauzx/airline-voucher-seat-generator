import { applyDateInputEdit, caretPositionForDigitIndex, convertDisplayDateToIso, formatDateInput } from '../utils/date';

describe('convertDisplayDateToIso', () => {
  it('converts a valid DD-MM-YYYY date to ISO', () => {
    expect(convertDisplayDateToIso('12-07-2025')).toBe('2025-07-12');
  });

  it('accepts a valid leap day', () => {
    expect(convertDisplayDateToIso('29-02-2028')).toBe('2028-02-29');
  });

  it('rejects an impossible calendar date', () => {
    expect(convertDisplayDateToIso('31-02-2026')).toBeNull();
  });

  it('rejects Feb 29 on a non-leap year', () => {
    expect(convertDisplayDateToIso('29-02-2026')).toBeNull();
  });

  it('rejects malformed strings', () => {
    expect(convertDisplayDateToIso('2025-07-12')).toBeNull();
    expect(convertDisplayDateToIso('12/07/2025')).toBeNull();
    expect(convertDisplayDateToIso('not-a-date')).toBeNull();
  });
});

describe('formatDateInput', () => {
  it('inserts dashes as digits accumulate', () => {
    expect(formatDateInput('1')).toBe('1');
    expect(formatDateInput('12')).toBe('12');
    expect(formatDateInput('120')).toBe('12-0');
    expect(formatDateInput('12072025')).toBe('12-07-2025');
  });

  it('strips non-digit characters', () => {
    expect(formatDateInput('12-07-2025')).toBe('12-07-2025');
    expect(formatDateInput('ab12cd07ef2025')).toBe('12-07-2025');
  });

  it('caps input at 8 digits', () => {
    expect(formatDateInput('1234567890')).toBe('12-34-5678');
  });
});

describe('caretPositionForDigitIndex', () => {
  it('returns 0 for a caret before any digit', () => {
    expect(caretPositionForDigitIndex('12-07-2025', 0)).toBe(0);
  });

  it('returns the position just after the nth digit', () => {
    expect(caretPositionForDigitIndex('12-07-2025', 1)).toBe(1);
    expect(caretPositionForDigitIndex('12-07-2025', 2)).toBe(2);
    expect(caretPositionForDigitIndex('12-07-2025', 3)).toBe(4);
    expect(caretPositionForDigitIndex('12-07-2025', 4)).toBe(5);
  });

  it('clamps past the end of the string', () => {
    expect(caretPositionForDigitIndex('12-07-2025', 99)).toBe(10);
  });
});

describe('applyDateInputEdit', () => {
  it('inserts a digit typed in the middle of a full date', () => {
    // "12-07-2025" with "3" typed at index 1 arrives as "132-07-2025", caret 2.
    const edit = applyDateInputEdit('12-07-2025', '132-07-2025', 2);
    expect(edit.value).toBe('13-20-7202');
    expect(edit.caret).toBe(2);
  });

  it('deletes the preceding digit when a separator is backspaced', () => {
    // "12-07-2025" with the hyphen at index 2 deleted arrives as "1207-2025", caret 2.
    const edit = applyDateInputEdit('12-07-2025', '1207-2025', 2);
    expect(edit.value).toBe('10-72-025');
    expect(edit.caret).toBe(1);
  });

  it('deletes a digit normally', () => {
    const edit = applyDateInputEdit('12-07-2025', '1-07-2025', 1);
    expect(edit.value).toBe('10-72-025');
    expect(edit.caret).toBe(1);
  });

  it('appends as the user types from empty', () => {
    expect(applyDateInputEdit('', '1', 1)).toEqual({ value: '1', caret: 1 });
    expect(applyDateInputEdit('12', '120', 3)).toEqual({ value: '12-0', caret: 4 });
  });

  it('caps at 8 digits', () => {
    const edit = applyDateInputEdit('12-07-2025', '12-07-20259', 11);
    expect(edit.value).toBe('12-07-2025');
  });

  it('strips pasted non-digits', () => {
    expect(applyDateInputEdit('', '12/07/2025', 10).value).toBe('12-07-2025');
  });
});

describe('convertDisplayDateToIso year handling', () => {
  it('does not remap years below 100 onto the 1900s', () => {
    expect(convertDisplayDateToIso('01-01-0001')).toBe('0001-01-01');
  });
});

import { MAX_FLIGHT_YEAR, MIN_FLIGHT_YEAR, isFlightYearInRange } from '../utils/date';

describe('isFlightYearInRange', () => {
  it('accepts years inside the range, including both boundaries', () => {
    expect(isFlightYearInRange(MIN_FLIGHT_YEAR)).toBe(true);
    expect(isFlightYearInRange(2025)).toBe(true);
    expect(isFlightYearInRange(MAX_FLIGHT_YEAR)).toBe(true);
  });

  it('rejects years outside the range', () => {
    expect(isFlightYearInRange(1)).toBe(false);
    expect(isFlightYearInRange(1900)).toBe(false);
    expect(isFlightYearInRange(MAX_FLIGHT_YEAR + 1)).toBe(false);
  });

  it('matches the backend constants', () => {
    expect(MIN_FLIGHT_YEAR).toBe(2000);
    expect(MAX_FLIGHT_YEAR).toBe(2100);
  });
});
