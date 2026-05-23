# Allo Health — Inventory Reservations

Production-oriented internal platform for warehouse inventory reservations with concurrency-safe stock holds, operational dashboards, and deployment-ready reliability patterns.

## Stack

| Layer | Technology |
|-------|------------|
| Application | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Database | PostgreSQL via Prisma 6 (Neon / Supabase compatible) |
| Idempotency | Upstash Redis (HTTP) with dev in-memory fallback |
| UI | Tailwind CSS v4, shadcn/ui patterns |
| Validation | Zod |

## Quick start

```bash
cp .env.example .env
# Set DATABASE_URL (pooled), DIRECT_URL (direct), and (recommended) Upstash Redis credentials

npm install --include=dev
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Live URL : https://reserveflow-tau.vercel.app/

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Pooled PostgreSQL URL (`?pgbouncer=true` for Supabase pooler) — app + Prisma Client |
| `DIRECT_URL` | Yes | Direct PostgreSQL URL — Prisma `db push` / `migrate` only |
| `UPSTASH_REDIS_REST_URL` | Production | Upstash Redis REST URL for distributed idempotency |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Upstash Redis REST token |
| `IDEMPOTENCY_TTL_SECONDS` | No | Idempotency record TTL (default `86400`) |
| `NODE_ENV` | No | `development` \| `test` \| `production` |
| `SKIP_ENV_VALIDATION` | No | Set `true` for CI builds without live services |



## Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App Router                                         │
│  ├─ (dashboard)     Server components for reads             │
│  ├─ Client islands  Reserve / confirm / countdown / tools   │
│  └─ /api/*          Route handlers → domain services        │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   PostgreSQL          Upstash Redis       Domain services
   (inventory,         (idempotency        (create, confirm,
    reservations)        cache)              release, expire)
```

**Design principles**

- Domain logic lives in `src/lib/services/reservation/` — route handlers stay thin.
- Available stock is **never stored**; it is always `totalQuantity - reservedQuantity`.
- Reads and mutations that touch reservations run **lazy expiration** for pending holds past TTL.
- API responses use a consistent envelope: `{ success, data, meta? }`.

## Concurrency strategy

### Problem

Two clients reserving the last available unit must not both succeed.

### Solution: atomic conditional SQL

Reservation creation performs a single guarded `UPDATE` inside a database transaction:

```sql
UPDATE inventory
SET reserved_quantity = reserved_quantity + :quantity
WHERE id = :inventoryId
  AND total_quantity - reserved_quantity >= :quantity
```

- `rowsAffected = 0` → `InsufficientInventoryError` (HTTP 409)
- `rowsAffected = 1` → proceed to insert the reservation row

This avoids read-then-write races. Row-level locking on the inventory row serializes concurrent updates.

### Confirmation

Confirmation uses:

1. `updateMany` on the reservation (`PENDING` + unexpired) as an optimistic lock
2. Atomic `UPDATE` decrementing both `total_quantity` and `reserved_quantity`

### Why not only Prisma ORM updates?

ORM read-modify-write patterns race under parallel requests. Conditional SQL expresses the invariant in one round-trip.

## Transaction guarantees

| Operation | Transaction scope |
|-----------|-------------------|
| Create | Inventory atomic reserve + reservation insert |
| Confirm | State transition + inventory allocation |
| Release / Expire | State transition + reserved stock release |

Failures roll back the full transaction. Domain errors (4xx) are mapped explicitly; Prisma/internal errors are never returned raw to clients.

## Expiry strategy (serverless)

Reservations expire **10 minutes** after creation.

- **Proactive**: client countdown calls `POST /api/reservations/:id/expire`
- **Lazy**: `lazyExpireIfNeeded()` runs on reads and mutating actions (`getReservationById`, confirm, release)

Lazy expiration protects serverless deployments where background cron may be delayed or absent. Stale pending reservations cannot be confirmed after TTL.

## Idempotency implementation

Supported on:

- `POST /api/reservations`
- `POST /api/reservations/:id/confirm`

Send header: `Idempotency-Key: <unique-client-key>`

| Scenario | Behavior |
|----------|----------|
| Same key + same payload | Returns cached response (`Idempotent-Replayed: true`) |
| Same key + different payload | `422 IDEMPOTENCY_CONFLICT` |
| Concurrent retries | First request acquires lock (`SET NX`); others poll until complete |
| Missing key | Normal non-idempotent execution |

Implementation: `src/lib/idempotency/`

- Payload hashed (SHA-256 of canonical JSON)
- Stored in Redis with TTL (default 24h)
- 4xx responses are cached; 5xx are not (allow retry)
- Local dev falls back to in-memory store (single instance only)

## API reference

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/health` | DB + dependency status |
| `GET` | `/api/products` | Product catalog |
| `GET` | `/api/warehouses` | Warehouse list |
| `POST` | `/api/reservations` | Create hold (idempotent) |
| `GET` | `/api/reservations/:id` | Reservation detail |
| `POST` | `/api/reservations/:id/confirm` | Confirm (idempotent) |
| `POST` | `/api/reservations/:id/release` | Cancel / release |
| `POST` | `/api/reservations/:id/expire` | Expire pending hold |

### Error codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 404 | `*_NOT_FOUND` | Missing entity |
| 409 | `INSUFFICIENT_INVENTORY` | Not enough stock |
| 410 | `RESERVATION_EXPIRED` | Hold expired |
| 422 | `IDEMPOTENCY_CONFLICT` | Key reused with different payload |
| 500 | `INTERNAL_ERROR` | Unexpected failure (sanitized in production) |

## Operational UI

- **Inventory** — warehouse-grouped stock, health badges, reserve flow
- **Reservations** — list + detail with activity timeline, countdown urgency, confirm/cancel
- **Concurrency tools** (`/tools/concurrency`) — parallel reservation simulator for demo/verification

### Inventory health

| State | Condition |
|-------|-----------|
| Healthy | Adequate available stock |
| Low stock | Available ≤ 10 units or ≤ 10% of total |
| Fully reserved | Available = 0 |

## Project structure

```
src/
  app/
    (dashboard)/          # Operations UI
    api/                  # Route handlers
  components/
    inventory/            # Stock tables, reserve dialog
    reservations/           # Detail, timeline, countdown
    tools/                # Concurrency simulator
  lib/
    api/                  # Response envelope, logging, idempotent routes
    data/                 # Read models
    idempotency/          # Redis-backed idempotency
    inventory/            # Health classification
    services/reservation/ # Domain commands
prisma/
  schema.prisma
  seed.ts
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Prisma generate + production build |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed sample warehouses and stock |
| `npm run db:studio` | Prisma Studio |

## Tradeoffs and future improvements

| Decision | Tradeoff | Future option |
|----------|----------|---------------|
| Lazy vs cron expiry | Simple, serverless-friendly | Scheduled job for batch expiry metrics |
| In-memory idempotency fallback | Dev-only, not multi-instance | Require Redis in all non-local envs |
| No auth | Faster iteration for internal ops | API keys or SSO |
| Polling for stock refresh | Simple | SSE or short-cache headers |
| Single-region Redis | Operational simplicity | Multi-region with conflict resolution |

## Scaling considerations

- **Database**: index on `reservations(status, expires_at)` supports expiry scans; inventory hot rows serialize per SKU/warehouse (expected).
- **App tier**: Next.js stateless routes scale horizontally; idempotency requires shared Redis.
- **Redis**: Upstash HTTP client suits Vercel edge/serverless; tune `IDEMPOTENCY_TTL_SECONDS` to client retry windows.
- **Connection pooling**: `DATABASE_URL` must use the Supabase pooler (`:6543`, `?pgbouncer=true`); schema changes use `DIRECT_URL` (`:5432`).

## Build without live services

```bash
SKIP_ENV_VALIDATION=true npm run build
```
