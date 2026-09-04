import { AircraftType } from '../types/api';
import {
  MAX_FLIGHT_YEAR,
  MIN_FLIGHT_YEAR,
  convertDisplayDateToIso,
  isFlightYearInRange,
} from './date';

export interface VoucherFormValues {
  crewName: string;
  crewId: string;
  flightNumber: string;
  flightDate: string;
  aircraft: AircraftType | '';
}

export type FormErrors = Partial<Record<keyof VoucherFormValues, string>>;

export function validateForm(values: VoucherFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.crewName.trim()) errors.crewName = 'Crew name is required';
  if (!values.crewId.trim()) errors.crewId = 'Crew ID is required';
  if (!values.flightNumber.trim()) errors.flightNumber = 'Flight number is required';

  if (!values.flightDate.trim()) {
    errors.flightDate = 'Flight date is required';
  } else {
    const isoDate = convertDisplayDateToIso(values.flightDate);
    if (!isoDate) {
      errors.flightDate = 'Flight date must be a valid date in DD-MM-YYYY format';
    } else if (!isFlightYearInRange(Number(isoDate.slice(0, 4)))) {
      errors.flightDate = `Flight date must be between 01-01-${MIN_FLIGHT_YEAR} and 31-12-${MAX_FLIGHT_YEAR}`;
    }
  }

  if (!values.aircraft) errors.aircraft = 'Aircraft type is required';

  return errors;
}
