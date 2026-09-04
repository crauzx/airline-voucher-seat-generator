import Database from 'better-sqlite3';
import { migrate } from '../../db/migrate';

const LEGACY_SCHEMA = `
  CREATE TABLE vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crew_name TEXT NOT NULL,
    crew_id TEXT NOT NULL,
    flight_number TEXT NOT NULL,
    flight_date TEXT NOT NULL,
    aircraft_type TEXT NOT NULL,
    seat1 TEXT NOT NULL,
    seat2 TEXT NOT NULL,
    seat3 TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX idx_vouchers_flight_date ON vouchers (flight_number, flight_date);
`;

function insert(db: Database.Database, flightNumber: string, flightDate: string): void {
  db.prepare(
    `INSERT INTO vouchers (crew_name, crew_id, flight_number, flight_date, aircraft_type,
      seat1, seat2, seat3, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'Sarah',
    '98123',
    flightNumber,
    flightDate,
    'ATR',
    '1A',
    '2C',
    '3D',
    '2025-07-12T00:00:00.000Z'
  );
}

describe('migrate', () => {
  it('is idempotent on a fresh database', () => {
    const db = new Database(':memory:');
    expect(() => {
      migrate(db);
      migrate(db);
    }).not.toThrow();
    db.close();
  });

  it('rejects a case-variant duplicate insert after migrating', () => {
    const db = new Database(':memory:');
    migrate(db);
    insert(db, 'GA102', '2025-07-12');

    expect(() => insert(db, 'ga102', '2025-07-12')).toThrow(
      expect.objectContaining({ code: 'SQLITE_CONSTRAINT_UNIQUE' })
    );
    db.close();
  });

  it('normalizes legacy rows written before flight numbers were normalized', () => {
    const db = new Database(':memory:');
    db.exec(LEGACY_SCHEMA);
    insert(db, ' ga 102 ', '2025-07-12');

    migrate(db);

    const row = db.prepare('SELECT flight_number FROM vouchers').get() as {
      flight_number: string;
    };
    expect(row.flight_number).toBe('GA102');
    db.close();
  });

  it('throws an actionable error when legacy rows collide under NOCASE', () => {
    const db = new Database(':memory:');
    db.exec(LEGACY_SCHEMA);
    insert(db, 'GA102', '2025-07-12');
    insert(db, 'ga102', '2025-07-12');

    expect(() => migrate(db)).toThrow(/differ only by flight-number casing or spacing/);
    db.close();
  });

  it('does not delete or mutate rows when it fails', () => {
    const db = new Database(':memory:');
    db.exec(LEGACY_SCHEMA);
    insert(db, 'GA102', '2025-07-12');
    insert(db, 'ga102', '2025-07-12');

    expect(() => migrate(db)).toThrow();

    const rows = db.prepare('SELECT flight_number FROM vouchers ORDER BY id').all() as {
      flight_number: string;
    }[];
    expect(rows.map((row) => row.flight_number)).toEqual(['GA102', 'ga102']);
    db.close();
  });

  it('leaves the old index in place when it fails', () => {
    const db = new Database(':memory:');
    db.exec(LEGACY_SCHEMA);
    insert(db, 'GA102', '2025-07-12');
    insert(db, 'ga102', '2025-07-12');

    expect(() => migrate(db)).toThrow();

    const index = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_vouchers_flight_date'"
      )
      .get();
    expect(index).toBeDefined();
    db.close();
  });
});
