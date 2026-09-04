import { validateForm, VoucherFormValues } from '../utils/validateForm';

const validValues: VoucherFormValues = {
  crewName: 'Sarah',
  crewId: '98123',
  flightNumber: 'ID102',
  flightDate: '12-07-2025',
  aircraft: 'AIRBUS_320',
};

describe('validateForm', () => {
  it('returns no errors for fully valid values', () => {
    expect(validateForm(validValues)).toEqual({});
  });

  it('flags each missing required field', () => {
    expect(validateForm({ ...validValues, crewName: '' }).crewName).toBeDefined();
    expect(validateForm({ ...validValues, crewId: '' }).crewId).toBeDefined();
    expect(validateForm({ ...validValues, flightNumber: '' }).flightNumber).toBeDefined();
    expect(validateForm({ ...validValues, flightDate: '' }).flightDate).toBeDefined();
    expect(validateForm({ ...validValues, aircraft: '' }).aircraft).toBeDefined();
  });

  it('flags an invalid flight date format or value', () => {
    expect(validateForm({ ...validValues, flightDate: '31-02-2026' }).flightDate).toBeDefined();
    expect(validateForm({ ...validValues, flightDate: '2025-07-12' }).flightDate).toBeDefined();
  });
});

describe('validateForm flight date range', () => {
  it('accepts a date inside the supported range', () => {
    expect(validateForm({ ...validValues, flightDate: '12-07-2025' }).flightDate).toBeUndefined();
  });

  it('rejects a date before the supported range', () => {
    const error = validateForm({ ...validValues, flightDate: '01-01-1900' }).flightDate;
    expect(error).toBeDefined();
    expect(error).toMatch(/between/);
  });

  it('rejects a year-1 date', () => {
    const error = validateForm({ ...validValues, flightDate: '01-01-0001' }).flightDate;
    expect(error).toBeDefined();
    expect(error).toMatch(/between/);
  });

  it('rejects a date after the supported range', () => {
    const error = validateForm({ ...validValues, flightDate: '01-01-2101' }).flightDate;
    expect(error).toBeDefined();
    expect(error).toMatch(/between/);
  });

  it('accepts both boundaries', () => {
    expect(validateForm({ ...validValues, flightDate: '01-01-2000' }).flightDate).toBeUndefined();
    expect(validateForm({ ...validValues, flightDate: '31-12-2100' }).flightDate).toBeUndefined();
  });
});
