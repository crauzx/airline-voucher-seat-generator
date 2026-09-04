import Database from 'better-sqlite3';

export interface NewVoucher {
  crewName: string;
  crewId: string;
  flightNumber: string;
  flightDate: string;
  aircraftType: string;
  seat1: string;
  seat2: string;
  seat3: string;
}

export interface VoucherRepository {
  existsForFlight(flightNumber: string, flightDate: string): boolean;
  insertVoucher(voucher: NewVoucher): void;
}

export function createVoucherRepository(db: Database.Database): VoucherRepository {
  const existsStatement = db.prepare(
    'SELECT 1 FROM vouchers WHERE flight_number = ? AND flight_date = ? LIMIT 1'
  );

  const insertStatement = db.prepare(`
    INSERT INTO vouchers (
      crew_name, crew_id, flight_number, flight_date, aircraft_type,
      seat1, seat2, seat3, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return {
    existsForFlight(flightNumber: string, flightDate: string): boolean {
      return existsStatement.get(flightNumber, flightDate) !== undefined;
    },

    insertVoucher(voucher: NewVoucher): void {
      insertStatement.run(
        voucher.crewName,
        voucher.crewId,
        voucher.flightNumber,
        voucher.flightDate,
        voucher.aircraftType,
        voucher.seat1,
        voucher.seat2,
        voucher.seat3,
        new Date().toISOString()
      );
    },
  };
}
