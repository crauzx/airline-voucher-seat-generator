import Database from 'better-sqlite3';
import { createTestDb } from '../testUtils/createTestDb';
import { createVoucherRepository, NewVoucher, VoucherRepository } from '../../db/voucherRepository';

const sampleVoucher: NewVoucher = {
  crewName: 'Sarah',
  crewId: '98123',
  flightNumber: 'ID102',
  flightDate: '2025-07-12',
  aircraftType: 'AIRBUS_320',
  seat1: '3B',
  seat2: '7C',
  seat3: '14D',
};

describe('voucherRepository', () => {
  let db: Database.Database;
  let repository: VoucherRepository;

  beforeEach(() => {
    db = createTestDb();
    repository = createVoucherRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('reports no voucher exists before one is inserted', () => {
    expect(repository.existsForFlight('ID102', '2025-07-12')).toBe(false);
  });

  it('reports a voucher exists after it is inserted', () => {
    repository.insertVoucher(sampleVoucher);
    expect(repository.existsForFlight('ID102', '2025-07-12')).toBe(true);
  });

  it('throws a unique-constraint error on duplicate flight+date', () => {
    repository.insertVoucher(sampleVoucher);
    expect(() => repository.insertVoucher(sampleVoucher)).toThrow(
      expect.objectContaining({ code: 'SQLITE_CONSTRAINT_UNIQUE' })
    );
  });

  it('allows the same flight number on a different date', () => {
    repository.insertVoucher(sampleVoucher);
    expect(() =>
      repository.insertVoucher({ ...sampleVoucher, flightDate: '2025-07-13' })
    ).not.toThrow();
    expect(repository.existsForFlight('ID102', '2025-07-13')).toBe(true);
  });
});
