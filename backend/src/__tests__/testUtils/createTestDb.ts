import Database from 'better-sqlite3';
import { migrate } from '../../db/migrate';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  migrate(db);
  return db;
}
