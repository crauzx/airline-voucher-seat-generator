import request from 'supertest';
import Database from 'better-sqlite3';
import { Express } from 'express';
import { createTestDb } from '../testUtils/createTestDb';
import { buildApp } from '../../app';

const validPayload = {
  name: 'Sarah',
  id: '98123',
  flightNumber: 'ID102',
  date: '2025-07-12',
  aircraft: 'AIRBUS_320',
};

describe('POST /api/generate', () => {
  let db: Database.Database;
  let app: Express;

  beforeEach(() => {
    db = createTestDb();
    app = buildApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('generates and returns 3 seats for a valid, fresh request', async () => {
    const response = await request(app).post('/api/generate').send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.seats).toHaveLength(3);
    expect(new Set(response.body.seats).size).toBe(3);
  });

  it('returns 400 when a required field is missing', async () => {
    const { name, ...rest } = validPayload;
    void name;

    const response = await request(app).post('/api/generate').send(rest);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for an invalid aircraft type', async () => {
    const response = await request(app)
      .post('/api/generate')
      .send({ ...validPayload, aircraft: 'Concorde' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when generating twice for the same flight and date', async () => {
    const first = await request(app).post('/api/generate').send(validPayload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/generate').send(validPayload);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('VOUCHER_EXISTS');
  });

  it('returns 409 for the same flight number in a different case', async () => {
    const first = await request(app)
      .post('/api/generate')
      .send({ ...validPayload, flightNumber: 'GA102' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/generate')
      .send({ ...validPayload, flightNumber: 'ga102' });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('VOUCHER_EXISTS');
  });

  it('returns 409 for the same flight number written with inner spaces', async () => {
    const first = await request(app)
      .post('/api/generate')
      .send({ ...validPayload, flightNumber: 'GA102' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/generate')
      .send({ ...validPayload, flightNumber: 'GA 102' });
    expect(second.status).toBe(409);
  });

  it('reports a case-variant flight number as already existing on check', async () => {
    await request(app).post('/api/generate').send({ ...validPayload, flightNumber: 'GA102' });

    const response = await request(app)
      .post('/api/check')
      .send({ flightNumber: 'ga102', date: validPayload.date });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ exists: true });
  });
});
