import request from 'supertest';
import Database from 'better-sqlite3';
import { Express } from 'express';
import { createTestDb } from './testUtils/createTestDb';
import { buildApp } from '../app';

const validPayload = {
  name: 'Sarah',
  id: '98123',
  flightNumber: 'ID102',
  date: '2025-07-12',
  aircraft: 'AIRBUS_320',
};

describe('app seam', () => {
  let db: Database.Database;
  let app: Express;

  beforeEach(() => {
    db = createTestDb();
    app = buildApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('returns 400 VALIDATION_ERROR for a malformed JSON body', async () => {
    const response = await request(app)
      .post('/api/check')
      .set('Content-Type', 'application/json')
      .send('{"flightNumber": "GA102",');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR for a body over the size limit', async () => {
    const response = await request(app)
      .post('/api/generate')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ ...validPayload, name: 'x'.repeat(40_000) }));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not send a wildcard Access-Control-Allow-Origin', async () => {
    const response = await request(app)
      .post('/api/check')
      .set('Origin', 'https://evil.example')
      .send({ flightNumber: 'GA102', date: '2025-07-12' });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows a configured origin', async () => {
    const scopedDb = createTestDb();
    const scopedApp = buildApp(scopedDb, { corsOrigins: ['https://ops.example'] });

    const response = await request(scopedApp)
      .post('/api/check')
      .set('Origin', 'https://ops.example')
      .send({ flightNumber: 'GA102', date: '2025-07-12' });

    expect(response.headers['access-control-allow-origin']).toBe('https://ops.example');
    scopedDb.close();
  });

  it('returns 429 RATE_LIMITED once the configured limit is exceeded', async () => {
    const scopedDb = createTestDb();
    const scopedApp = buildApp(scopedDb, { rateLimit: { windowMs: 60_000, max: 2 } });
    const body = { flightNumber: 'GA102', date: '2025-07-12' };

    expect((await request(scopedApp).post('/api/check').send(body)).status).toBe(200);
    expect((await request(scopedApp).post('/api/check').send(body)).status).toBe(200);

    const limited = await request(scopedApp).post('/api/check').send(body);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after']).toBeDefined();

    scopedDb.close();
  });

  it('can disable rate limiting entirely', async () => {
    const scopedDb = createTestDb();
    const scopedApp = buildApp(scopedDb, { rateLimit: false });
    const body = { flightNumber: 'GA102', date: '2025-07-12' };

    for (let i = 0; i < 5; i++) {
      expect((await request(scopedApp).post('/api/check').send(body)).status).toBe(200);
    }

    scopedDb.close();
  });

  it('counts malformed-JSON requests against the rate limit', async () => {
    // The rate limiter must run before express.json() so a client cannot dodge
    // the limit by sending bodies that fail to parse. If the limiter were
    // mounted after express.json() (the old ordering), the body-parser error
    // handler would short-circuit past it on every request and this would
    // never see 429 no matter how many malformed requests were sent.
    const scopedDb = createTestDb();
    const scopedApp = buildApp(scopedDb, { rateLimit: { windowMs: 60_000, max: 2 } });
    const malformedBody = '{"flightNumber": "GA102",';

    for (let i = 0; i < 2; i++) {
      const response = await request(scopedApp)
        .post('/api/generate')
        .set('Content-Type', 'application/json')
        .send(malformedBody);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }

    const limited = await request(scopedApp)
      .post('/api/generate')
      .set('Content-Type', 'application/json')
      .send(malformedBody);

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after']).toBeDefined();

    scopedDb.close();
  });
});
