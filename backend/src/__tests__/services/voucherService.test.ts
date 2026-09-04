import Database from 'better-sqlite3';
import { createTestDb } from '../testUtils/createTestDb';
import { createVoucherRepository } from '../../db/voucherRepository';
import { createVoucherService, VoucherService } from '../../services/voucherService';
import { AIRCRAFT_LAYOUTS } from '../../seatGeneration/aircraftLayouts';
import { ApiError } from '../../errors/ApiError';
import { GenerateRequest } from '../../validation/schemas';

const sampleRequest: GenerateRequest = {
  name: 'Sarah',
  id: '98123',
  flightNumber: 'ID102',
  date: '2025-07-12',
  aircraft: 'AIRBUS_320',
};

describe('voucherService', () => {
  let db: Database.Database;
  let service: VoucherService;

  beforeEach(() => {
    db = createTestDb();
    service = createVoucherService(createVoucherRepository(db));
  });

  afterEach(() => {
    db.close();
  });

  it('generates 3 seats valid for the requested aircraft and persists them', () => {
    const seats = service.generateVoucher(sampleRequest);
    const layout = AIRCRAFT_LAYOUTS.AIRBUS_320;
    const seatPattern = /^(\d+)([A-Z])$/;

    expect(seats).toHaveLength(3);
    expect(new Set(seats).size).toBe(3);
    for (const seat of seats) {
      const match = seatPattern.exec(seat);
      expect(match).not.toBeNull();
      expect(layout.letters).toContain(match![2]);
    }
    expect(service.checkExists(sampleRequest.flightNumber, sampleRequest.date)).toBe(true);
  });

  it('rejects a second generate call for the same flight and date with a 409 ApiError', () => {
    service.generateVoucher(sampleRequest);

    expect.assertions(3);
    try {
      service.generateVoucher(sampleRequest);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(409);
      expect((error as ApiError).code).toBe('VOUCHER_EXISTS');
    }
  });

  it('allows generating vouchers for the same flight number on a different date', () => {
    service.generateVoucher(sampleRequest);
    expect(() =>
      service.generateVoucher({ ...sampleRequest, date: '2025-07-13' })
    ).not.toThrow();
  });
});
