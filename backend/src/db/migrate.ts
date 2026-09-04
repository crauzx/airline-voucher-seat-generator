import Database from 'better-sqlite3';

const UNIQUE_INDEX_NAME = 'idx_vouchers_flight_date';

export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vouchers (
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
  `);

  // The first version of this index used SQLite's default BINARY collation, so
  // "GA102" and "ga102" counted as two different flights. Rebuild it as NOCASE and
  // bring rows written before the API normalized flight numbers into line. Dropping
  // first is required: the UPDATE below would otherwise collide with the old index
  // while it runs.
  //
  // All three statements run inside one transaction. Without it, each db.exec() call
  // auto-commits on its own: if CREATE UNIQUE INDEX then failed, the DROP and the
  // UPDATE would already be permanent, leaving the old index gone and every row's
  // flight_number overwritten with its normalized form — destroying the original
  // casing/spacing an operator needs to resolve the duplicates by hand. Wrapping in a
  // transaction rolls back the DROP and the UPDATE too when CREATE UNIQUE INDEX throws.
  const rebuildIndex = db.transaction(() => {
    db.exec(`DROP INDEX IF EXISTS ${UNIQUE_INDEX_NAME};`);
    db.exec(`UPDATE vouchers SET flight_number = REPLACE(UPPER(TRIM(flight_number)), ' ', '');`);
    db.exec(`
      CREATE UNIQUE INDEX ${UNIQUE_INDEX_NAME}
        ON vouchers (flight_number COLLATE NOCASE, flight_date);
    `);
  });

  try {
    rebuildIndex();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      'Cannot create the unique (flight_number, flight_date) index: the vouchers table ' +
        'already holds rows that differ only by flight-number casing or spacing. No rows ' +
        'have been deleted. Resolve the duplicates by hand, then restart. Find them with: ' +
        'SELECT UPPER(flight_number), flight_date, COUNT(*) FROM vouchers ' +
        'GROUP BY UPPER(flight_number), flight_date HAVING COUNT(*) > 1; ' +
        `(sqlite reported: ${detail})`
    );
  }
}
