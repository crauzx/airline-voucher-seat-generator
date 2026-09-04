# Airline Voucher Seat Assignment

Web app for an airline promotional campaign: crew members enter flight details and the app randomly assigns 3 unique, aircraft-valid seat numbers as voucher prizes, preventing duplicate assignments per flight number and date.

## Architecture overview

```
React SPA  --(fetch /api/*)-->  Express REST API  -->  SQLite (vouchers.db)
(Vite dev server / nginx)        (Node.js)
```

- **Frontend**: a single-page React + TypeScript app (Tailwind CSS). The crew member fills in the form and clicks **Generate Vouchers**, which first calls `POST /api/check`, then only calls `POST /api/generate` if no voucher exists yet for that flight/date.
- **Backend**: Express + TypeScript, layered as `routes -> service -> repository/seat-generation`:
  - **routes** (`checkRoute.ts`, `generateRoute.ts`) parse and validate the HTTP request (via `zod`) and translate the result into an HTTP response.
  - **service** (`voucherService.ts`) is the orchestration seam: checks existence, generates seats, and performs the race-safe insert — this is what both the routes and the tests depend on.
  - **repository** (`voucherRepository.ts`) is the only place that touches SQL, using parameterized queries exclusively.
  - **seatGeneration** (`generateSeats.ts`, `aircraftLayouts.ts`) is a pure, dependency-free module that turns an aircraft type into 3 unique valid seats.
  - **middleware** (`rateLimit.ts`, `errorHandler.ts`) holds the cross-cutting concerns: a dependency-free fixed-window per-IP rate limiter, and the handlers that turn any thrown `ApiError` into the shared JSON error shape.
  - `app.ts` builds the Express app without starting a listener (so tests can `supertest` it directly against an in-memory database) and owns the middleware order: CORS allowlist, then the rate limiter, then JSON body parsing with a 16kb cap, then the handler that maps malformed and oversized bodies to `400`. The limiter deliberately sits *before* parsing so abuse is rejected without paying the parse cost. `index.ts` is the real process entrypoint that opens the SQLite file, runs migrations, and starts listening.
- **Database**: SQLite, a single file (`vouchers.db`). A `UNIQUE(flight_number, flight_date)` index enforces "one voucher assignment per flight per date" at the database layer, independent of the frontend's check-then-generate flow.

## Prerequisites

- **Node.js** >= 20.x and npm (for local dev/build)
- **Docker Desktop** with Compose (only needed for the Docker-based run)
- No external database server is required — SQLite is a local file, created automatically on first run.

## Project structure

```
airline-voucher-seat-generator/
├── backend/     # Express + TypeScript API, SQLite database, Jest tests
├── frontend/    # React + TypeScript UI, Tailwind CSS, Vitest tests
├── docker-compose.yml
└── README.md
```

## Install

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Run in dev mode (no Docker)

Run these in two separate terminals:

```bash
cd backend && npm run dev
```
Starts the API on `http://localhost:4000` and creates/migrates `backend/data/vouchers.db` automatically.

```bash
cd frontend && npm run dev
```
Starts the Vite dev server (default `http://localhost:5173`), which proxies `/api/*` requests to `http://localhost:4000`.

Open `http://localhost:5173` in your browser.

## Run tests

```bash
cd backend && npm test
```
Jest + Supertest, 79 tests: seat-generation validity/uniqueness and its CSPRNG
draw, the request-schema rules (flight-number normalization, field caps, the
calendar and date-range refinements), the migration's NOCASE index rebuild and
its non-destructive failure path, the DB unique-constraint duplicate check,
service-layer race-safety, the rate limiter (window rollover, per-client
isolation, eviction cap), env-var parsing, the app seam (malformed and oversized
JSON bodies, CORS allowlist, 429s), and both routes' happy/error paths.

```bash
cd frontend && npm test
```
Vitest + React Testing Library, 50 tests: date and validation utilities
including the masked-date edit helpers and caret positioning, the API client's
error parsing, the date field's mid-string editing and calendar year clamping,
the full check-then-generate form flow (including the duplicate, stale-result
and validation-error paths), and the 404 page.

## Production build (without Docker)

```bash
cd backend && npm run build && npm start
```
Compiles to `backend/dist` and runs `node dist/index.js`.

```bash
cd frontend && npm run build
```
Outputs static assets to `frontend/dist`, which can be served by any static file server (this is what the frontend Docker image does with nginx).

## Run with Docker Compose

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API directly: `http://localhost:4000`

`vouchers.db` is persisted in a named Docker volume (`vouchers-data`) so data survives container restarts. To wipe it and start fresh:

```bash
docker compose down -v
```

## Data model

SQLite database file: `vouchers.db`. Table `vouchers`:

| Field           | Type    | Constraint                  |
|-----------------|---------|------------------------------|
| id              | INTEGER | PRIMARY KEY, AUTOINCREMENT   |
| crew_name       | TEXT    | NOT NULL                     |
| crew_id         | TEXT    | NOT NULL                     |
| flight_number   | TEXT    | NOT NULL                     |
| flight_date     | TEXT    | NOT NULL                     |
| aircraft_type   | TEXT    | NOT NULL                     |
| seat1           | TEXT    | NOT NULL                     |
| seat2           | TEXT    | NOT NULL                     |
| seat3           | TEXT    | NOT NULL                     |
| created_at      | TEXT    | ISO 8601 timestamp           |

A unique index on `(flight_number, flight_date)` is created alongside the table. It is the authoritative guard against duplicate voucher assignments — `POST /api/generate` relies on the resulting constraint violation (rather than a separate check-then-insert race) to decide whether to return `409 VOUCHER_EXISTS`.

The index uses `COLLATE NOCASE`, and the API normalizes `flightNumber` to
upper-case without whitespace before it reaches the database, so casing and
spacing cannot be used to obtain a second set of vouchers for one flight.

## API contract

All error responses share one JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable explanation"
  }
}
```

`code` is one of `VALIDATION_ERROR` (400, including a malformed or oversized
JSON body), `VOUCHER_EXISTS` (409), `RATE_LIMITED` (429), `NOT_FOUND` (404,
unmatched route), or `INTERNAL_ERROR` (500).

### `POST /api/check`

Checks whether vouchers already exist for a flight number + date.

Request body:
```json
{ "flightNumber": "GA102", "date": "2025-07-12" }
```
`flightNumber` is required, at most 10 characters, and is normalized to
upper-case with all whitespace removed, so `ga 102` and `GA102` are the same
flight. `date` must be `YYYY-MM-DD`, a real calendar date, and fall between
`2000-01-01` and `2100-12-31`.

Success response — `200 OK`:
```json
{ "exists": true }
```

Error responses:
| Status | code               | When                                              |
|--------|--------------------|----------------------------------------------------|
| 400    | `VALIDATION_ERROR` | `flightNumber` missing/empty, or `date` missing/malformed/not a real date |
| 429    | `RATE_LIMITED`     | More than `RATE_LIMIT_MAX` requests from one client inside the window |
| 500    | `INTERNAL_ERROR`   | Unexpected server/database error                  |

### `POST /api/generate`

Generates and persists 3 unique random seats valid for the given aircraft.

Request body:
```json
{
  "name": "Sarah",
  "id": "98123",
  "flightNumber": "ID102",
  "date": "2025-07-12",
  "aircraft": "AIRBUS_320"
}
```
`name` is required and at most 100 characters; `id` is required and at most 50
characters; `flightNumber` and `date` follow the same rules as `/api/check`;
`aircraft` must be one of `ATR`, `AIRBUS_320`, `BOEING_737_MAX`. The whole
request body must be 16kb or smaller.

Success response — `201 Created`:
```json
{ "success": true, "seats": ["3B", "7C", "14D"] }
```

Error responses:
| Status | code               | When                                                              |
|--------|--------------------|--------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Any required field missing/empty, or `aircraft` not one of the 3 valid types |
| 409    | `VOUCHER_EXISTS`   | A voucher was already generated for this `flightNumber` + `date`  |
| 429    | `RATE_LIMITED`     | More than `RATE_LIMIT_MAX` requests from one client inside the window |
| 500    | `INTERNAL_ERROR`   | Unexpected server/database error                                  |

## Security posture

- The API is **unauthenticated by design** for this campaign tool. Do not expose
  it to the public internet without putting authentication in front of it.
- CORS is restricted to `CORS_ORIGINS`. Both documented run modes proxy `/api`
  from the same origin, so the default list only exists for direct local testing.
- `/api` is rate limited per client IP (`RATE_LIMIT_MAX` per
  `RATE_LIMIT_WINDOW_MS`). Behind a proxy, set `TRUST_PROXY` so the limiter sees
  the real client address instead of the proxy's.
- Seat draws use `crypto.randomInt`, not `Math.random`.

### Outstanding dependency advisories

`npm audit` currently reports advisories in both tiers that `npm audit fix`
(without `--force`) cannot resolve, because the vulnerable packages are
already at the newest version their parent's declared semver range allows:

- **Backend** — `qs` (pulled in by `body-parser`, pulled in by `express`):
  moderate severity, [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx)
  and [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g).
  The installed `express@4.22.2` pins `qs` to `~6.15.1` and `body-parser` to
  `~1.20.5`, both already at the latest patch on that line; the fix lives on
  `qs@6.16.0`, which is only reachable by moving `express` to its 5.x major.
- **Frontend** — `esbuild` (pulled in by `vite`, pulled in by `vitest`):
  moderate, [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
  (dev server accepts requests from any origin). The fix requires `vite@8.x`,
  a breaking jump from the installed `vite@5.4.21`. Separately,
  `react-router-dom@6.30.6` carries two moderate advisories,
  [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) and
  [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg);
  its only fix is `react-router-dom@7.x`, also a major.

`npm audit fix` without `--force` is a no-op in both tiers for this reason.
Leaving these upgrades for later is a deliberate decision, not an oversight —
each is a major version bump (Express 5's routing/error-handling changes,
Vite 8's Node/plugin requirements, React Router 7's data APIs) that needs its
own compatibility pass rather than being forced through unattended.

## Aircraft seat layouts

| Aircraft Type   | Row Range | Seats per Row      | Seat Pool Size | Example Seats |
|-----------------|-----------|---------------------|----------------|----------------|
| ATR             | 1–18      | A, C, D, F          | 72             | 1A, 18F        |
| Airbus 320      | 1–32      | A, B, C, D, E, F    | 192            | 1A, 32F        |
| Boeing 737 Max  | 1–32      | A, B, C, D, E, F    | 192            | 1A, 32F        |

Seats are generated by shuffling the full valid pool for the selected aircraft and taking the first 3, so a seat like `5B` can never be produced for an ATR (it is simply not in that aircraft's pool).

## Environment variables (backend)

| Variable                | Default                                        | Purpose                                                       |
|-------------------------|------------------------------------------------|---------------------------------------------------------------|
| `PORT`                  | `4000`                                         | HTTP port the API listens on                                  |
| `DB_PATH`               | `backend/data/vouchers.db`                     | Path to the SQLite database file                              |
| `CORS_ORIGINS`          | `http://localhost:5173,http://localhost:3000`  | Comma-separated browser origins allowed cross-origin. Empty disables CORS |
| `TRUST_PROXY`           | `0`                                            | Proxy hops to trust for client IPs. `1` behind the nginx container |
| `RATE_LIMIT_WINDOW_MS`  | `60000`                                        | Rate-limit window length in milliseconds                      |
| `RATE_LIMIT_MAX`        | `60`                                           | Requests allowed per client per window on `/api`. `0` blocks every request; a negative or non-numeric value falls back to the default |

Copy `backend/.env.example` to `backend/.env` to override locally.

## Troubleshooting

- **Port already in use**: something else is already listening on `4000` (backend) or `5173`/`3000` (frontend) — stop it or change `PORT`.
- **`better-sqlite3` native module errors**: it ships a prebuilt binary for common platforms; if you switch Node versions locally, run `npm rebuild better-sqlite3` inside `backend/`. The Docker image builds it fresh inside the container, so this normally isn't an issue there.
- **Reset local data**: stop the backend and delete `backend/data/vouchers.db` (and any `-wal`/`-shm` files next to it) to start with an empty database.
