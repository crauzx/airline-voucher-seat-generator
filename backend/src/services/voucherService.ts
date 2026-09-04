import { VoucherRepository } from '../db/voucherRepository';
import { generateSeats } from '../seatGeneration/generateSeats';
import { AircraftType } from '../seatGeneration/aircraftLayouts';
import { ApiError } from '../errors/ApiError';
import { GenerateRequest } from '../validation/schemas';

interface SqliteConstraintError extends Error {
  code?: string;
}

function isUniqueConstraintError(error: unknown): error is SqliteConstraintError {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as SqliteConstraintError).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

export interface VoucherService {
  checkExists(flightNumber: string, date: string): boolean;
  generateVoucher(request: GenerateRequest): string[];
}

export function createVoucherService(repository: VoucherRepository): VoucherService {
  return {
    checkExists(flightNumber: string, date: string): boolean {
      return repository.existsForFlight(flightNumber, date);
    },

    generateVoucher(request: GenerateRequest): string[] {
      const seats = generateSeats(request.aircraft as AircraftType);

      try {
        repository.insertVoucher({
          crewName: request.name,
          crewId: request.id,
          flightNumber: request.flightNumber,
          flightDate: request.date,
          aircraftType: request.aircraft,
          seat1: seats[0],
          seat2: seats[1],
          seat3: seats[2],
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw ApiError.conflict(
            'Vouchers have already been generated for this flight and date'
          );
        }
        throw error;
      }

      return seats;
    },
  };
}
