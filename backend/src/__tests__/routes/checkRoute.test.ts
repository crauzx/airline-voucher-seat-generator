import request from 'supertest';
import Database from 'better-sqlite3';
import { createTestDb } from '../testUtils/createTestDb';
import { createVoucherRepository } from '../../db/voucherRepository';
import { buildApp } from '../../app';
import { Express } from 'express';

describe('POST /api/check', () => {
  let db: Database.Database;
  let app: Express;

  beforeEach(() => {
    db = createTestDb();
    app = buildApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('returns exists:false when no voucher has been generated', async () => {
    const response = await request(app)
      .post('/api/check')
      .send({ flightNumber: 'GA102', date: '2025-07-12' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ exists: false });
  });

  it('returns exists:true when a voucher already exists for that flight and date', async () => {
    createVoucherRepository(db).insertVoucher({
      crewName: 'Sarah',
      crewId: '98123',
      flightNumber: 'GA102',
      flightDate: '2025-07-12',
      aircraftType: 'ATR',
      seat1: '1A',
      seat2: '2C',
      seat3: '3D',
    });

    const response = await request(app)
      .post('/api/check')
      .send({ flightNumber: 'GA102', date: '2025-07-12' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ exists: true });
  });

  it('returns 400 when flightNumber is missing', async () => {
    const response = await request(app).post('/api/check').send({ date: '2025-07-12' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for a malformed date', async () => {
    const response = await request(app)
      .post('/api/check')
      .send({ flightNumber: 'GA102', date: '12-07-2025' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for an impossible calendar date', async () => {
    const response = await request(app)
      .post('/api/check')
      .send({ flightNumber: 'GA102', date: '2025-02-30' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
