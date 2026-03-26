-- GrünBilanz database initialization script
--
-- NOTE: Table creation is handled exclusively by `prisma migrate deploy`
-- (run inside healthcheck.sh on container startup). Seed data is inserted
-- by `prisma/seed.ts` via `npx tsx prisma/seed.ts`.
--
-- This file is kept as a reference / fallback no-op.
-- DO NOT add CREATE TABLE statements here — they would conflict with Prisma migrations.

-- Enable pgcrypto extension (optional — used if UUID helpers are needed later)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sanity-check query so Docker can verify this file ran without errors
SELECT 1;
