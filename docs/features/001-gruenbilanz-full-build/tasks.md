# Tasks: GrünBilanz Full Application Build

## Overview

This document breaks down the complete GrünBilanz application build (Feature 001) into
actionable, independently-testable tasks. The application is a self-hosted, single-tenant
CO₂ footprint and ESG reporting tool for German craft businesses (Handwerksbetriebe). The
entire stack runs via `docker compose up` with no manual setup steps.

**References:**
- [`docs/features/001-gruenbilanz-full-build/specification.md`](specification.md)
- [`docs/features/001-gruenbilanz-full-build/architecture.md`](architecture.md)
- [`docs/features/001-gruenbilanz-full-build/test-plan.md`](test-plan.md)
- [`docs/architecture.md`](../../architecture.md) — arc42 v1.1 (single source of truth)
- [`docs/conventions.md`](../../conventions.md) — coding standards

---

## Implementation Order

Recommended sequence (each phase builds on the previous):

1. **Phase 1** — Infrastructure: Dockerfile, Docker Compose, Prisma schema, seed data
2. **Phase 2** — Core lib modules: Prisma client, utilities, emissions engine, stubs
3. **Phase 3** — Server Actions: all data-mutating operations + API routes
4. **Phase 4** — Dashboard page: layout, charts, KPIs, audit panel
5. **Phase 5** — Data entry wizard: all 7 screens + shared wizard components
6. **Phase 6** — Reports & exports: PDF generation, CSRD questionnaire, badge
7. **Phase 7** — Settings page: year management
8. **Phase 8** — Unit tests: ≥ 80% coverage for `emissions.ts` and `factors.ts`
9. **Phase 9** — E2E tests: Playwright scenarios covering primary user journeys

---

## Phase 1 — Infrastructure

### Task 1.1: Prisma Schema

**ID:** TASK-1.1  
**Priority:** P1

**Description:**
Create `prisma/schema.prisma` with all models, enums, and constraints exactly as defined in
`docs/architecture.md §5.2`. Also generate the initial migration.

**Files to create:**
- `prisma/schema.prisma`
- `prisma/migrations/0001_initial/migration.sql` (generated via `prisma migrate dev`)

**Acceptance Criteria:**
- [ ] All models present: `CompanyProfile`, `ReportingYear`, `EmissionEntry`, `MaterialEntry`, `EmissionFactor`, `StagingEntry`, `Report`, `IndustryBenchmark`, `FieldDocument`, `UploadedDocument`, `AuditLog`
- [ ] All enums defined: `Branche` (7 values), `Scope` (SCOPE_1/2/3), `EmissionCategory` (23 values), `MaterialCategory` (8 values), `InputMethod` (MANUAL/OCR/CSV), `StagingSource` (OCR/CSV), `ReportType` (GHG_PROTOCOL/CSRD_QUESTIONNAIRE), `AuditAction` (CREATE/UPDATE/DELETE)
- [ ] `EmissionEntry @@unique([reportingYearId, scope, category, billingMonth, providerName])` — both nullable fields present
- [ ] `StagingEntry @@unique([reportingYearId, scope, category])`
- [ ] `FieldDocument @@unique([fieldKey, year])`
- [ ] `EmissionFactor @@unique([key, validYear])`
- [ ] `CompanyProfile id = 1` (single-row pattern enforced in seed, not schema)
- [ ] `StagingEntry` has `expiresAt DateTime` field
- [ ] `AuditLog` has all fields: `entityType`, `entityId`, `action`, `fieldName`, `oldValue`, `newValue`, `inputMethod`, `documentId`
- [ ] `prisma validate` passes with no errors
- [ ] `prisma migrate dev` generates `0001_initial` migration without errors

**Dependencies:** None

**Notes:**
- Use `@prisma/client` and `prisma` at project-standard versions (see existing `package.json`).
- Follow naming conventions from `docs/conventions.md` (camelCase fields, PascalCase models).
- `EmissionEntry.billingMonth` is `Int?` (nullable); `EmissionEntry.providerName` is `String?`.
- `EmissionEntry.isFinalAnnual` is `Boolean @default(false)`.
- `EmissionEntry.isOekostrom` is `Boolean @default(false)`.

---

### Task 1.2: Docker Infrastructure

**ID:** TASK-1.2  
**Priority:** P1

**Description:**
Create all Docker-related files: multi-stage `Dockerfile`, `docker-compose.yml`, `docker/supervisord.conf`,
`docker/healthcheck.sh`, `.env.example`, and the Tesseract service files.

**Files to create:**
- `Dockerfile` (multi-stage: deps → builder → runner)
- `docker-compose.yml` (two services: `app` port 3000, `tesseract` port 3001)
- `.env.example` (`DATABASE_URL`, `TESSERACT_URL`, `NODE_ENV`, `REPORTS_PATH`)
- `docker/supervisord.conf` (postgres priority 10, nextjs-starter priority 20)
- `docker/healthcheck.sh` (pg_isready loop → `prisma migrate deploy` → `exec node server.js`)
- `docker/tesseract/Dockerfile` (node:20-alpine + tesseract-ocr + tesseract-ocr-data-deu)
- `docker/tesseract/server.js` (Express POST /extract → tesseract CLI → `{ text, confidence }`)

**Acceptance Criteria:**
- [ ] `docker compose build` completes without errors from a clean checkout
- [ ] `docker compose up` starts both `app` and `tesseract` containers
- [ ] `app` container exposes port 3000; `tesseract` container exposes port 3001
- [ ] `docker/supervisord.conf` starts PostgreSQL (priority 10) before Next.js (priority 20)
- [ ] `docker/healthcheck.sh`: loops until `pg_isready` succeeds, then runs `prisma migrate deploy`, then starts Next.js
- [ ] `volumes: gruenbilanz_pgdata` declared and mounted at `/var/lib/postgresql/data`
- [ ] `.env.example` contains all four required environment variables with placeholder values
- [ ] Multi-stage Dockerfile: stage 1 (`deps`) installs production deps, stage 2 (`builder`) runs `next build --output standalone`, stage 3 (`runner`) copies standalone output + installs PostgreSQL 15 + supervisord
- [ ] `docker/tesseract/server.js` responds to `POST /extract` with `{ text: string, confidence: number }`
- [ ] `NEXT_TELEMETRY_DISABLED=1` set in `docker-compose.yml` environment

**Dependencies:** Task 1.1 (schema must exist for `prisma migrate deploy` to work)

**Notes:**
- Architecture reference: `docs/features/001-gruenbilanz-full-build/architecture.md §6`
- `DATABASE_URL` in docker-compose: `postgresql://gruenbilanz:gruenbilanz@localhost:5432/gruenbilanz`
- The `app` container runs both Next.js and PostgreSQL — this is correct per ADR-001.
- `docker/healthcheck.sh` must handle the case where PostgreSQL takes several seconds to initialise.

---

### Task 1.3: Seed Data (`docker/init.sql`)

**ID:** TASK-1.3  
**Priority:** P1

**Description:**
Create `docker/init.sql` with `CREATE TABLE IF NOT EXISTS` statements (schema bootstrap) and full
seed data for all tables. This file runs once on first container start and seeds the demo data.

**File to create:**
- `docker/init.sql`

**Acceptance Criteria:**
- [ ] Schema bootstrap: `CREATE TABLE IF NOT EXISTS` for all 13 tables matching `prisma/schema.prisma`
- [ ] `CompanyProfile` seed: id=1, Firmenname="Mustermann Elektro GmbH", Branche=ELEKTROHANDWERK, Mitarbeiter=12, Standort="München, Bayern"
- [ ] `EmissionFactor` rows: all 31 factor keys (23 EmissionCategory keys + 8 MaterialCategory keys) at `valid_year = 2024` with realistic UBA 2024 values
  - ERDGAS: 2.000 kg/m³
  - HEIZOEL: 2.636 kg/L
  - FLUESSIGGAS: 1.653 kg/kg
  - DIESEL_FUHRPARK: 2.650 kg/L
  - BENZIN_FUHRPARK: 2.330 kg/L
  - PKW_BENZIN_KM: 0.190 kg/km
  - PKW_DIESEL_KM: 0.168 kg/km
  - TRANSPORTER_KM: 0.240 kg/km
  - LKW_KM: 0.900 kg/km
  - R410A_KAELTEMITTEL: 2088 kg/kg
  - R32_KAELTEMITTEL: 675 kg/kg
  - R134A_KAELTEMITTEL: 1430 kg/kg
  - SONSTIGE_KAELTEMITTEL: 2000 kg/kg
  - STROM_MIX: 0.380 kg/kWh
  - STROM_OEKOSTROM: 0.025 kg/kWh
  - FERNWAERME: 0.210 kg/kWh
  - GESCHAEFTSREISEN_FLUG: 0.255 kg/km
  - GESCHAEFTSREISEN_BAHN: 0.032 kg/km
  - PENDLERVERKEHR: 0.150 kg/km
  - ABFALL_RESTMUELL: 0.480 kg/kg
  - ABFALL_BAUSCHUTT: 0.008 kg/kg
  - ABFALL_ALTMETALL: -0.040 kg/kg (negative — recycling credit)
  - ABFALL_SONSTIGES: 0.100 kg/kg
  - KUPFER: 3.800 kg/kg
  - STAHL: 1.850 kg/kg
  - ALUMINIUM: 11.500 kg/kg
  - HOLZ: 0.380 kg/kg
  - KUNSTSTOFF_PVC: 3.100 kg/kg
  - BETON: 0.130 kg/kg
  - FARBEN_LACKE: 2.700 kg/kg
  - MATERIAL_SONSTIGE: 1.000 kg/kg
- [ ] `IndustryBenchmark` rows: one per Branche enum (7 rows: ELEKTROHANDWERK, SHK, BAUGEWERBE, TISCHLER, KFZ_WERKSTATT, MALER, SONSTIGES) with representative `co2ePerEmployeePerYear` values (in kg)
- [ ] `ReportingYear` rows: 2023 (id=1), 2024 (id=2)
- [ ] `EmissionEntry` rows: representative values for 2023 and 2024 covering all 23 emission categories (at minimum 1 entry per scope per year)
- [ ] `MaterialEntry` rows: at minimum Kupfer, Stahl, Aluminium for both 2023 and 2024
- [ ] All `INSERT` statements use `ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE` to be idempotent
- [ ] File runs without errors when executed against a fresh PostgreSQL 15 instance

**Dependencies:** Task 1.1 (schema must be defined first)

**Notes:**
- The schema in `init.sql` is a one-time bootstrap snapshot. After the initial migration,
  schema changes are handled only by Prisma migrations — not by editing `init.sql`.
- Seed `AuditLog` rows are optional but helpful for demonstrating the audit panel with data.
- The `init.sql` file may exceed 300 lines — this is acceptable for SQL seed files per
  `docs/architecture.md §9` ("SQL, not TS; seed data is inherently verbose").

---

### Task 1.4: README.md

**ID:** TASK-1.4  
**Priority:** P1

**Description:**
Write `README.md` with the three-step quick-start guide (prerequisites → `docker compose up` → done)
plus brief description, feature list, and architecture overview.

**File to create/update:**
- `README.md`

**Acceptance Criteria:**
- [ ] Prerequisites section lists: Docker Desktop (or Docker Engine + Compose), Git
- [ ] Quick-start section has exactly three steps: clone → `docker compose up` → open `http://localhost:3000`
- [ ] No additional manual steps required (no database setup, no npm install, no env file editing)
- [ ] Brief product description in English (app name, purpose, target audience)
- [ ] Note that `docker/init.sql` seeds Mustermann Elektro GmbH demo data on first run
- [ ] Note that data persists in Docker volume `gruenbilanz_pgdata`
- [ ] Note on how to reset data (delete the volume)
- [ ] Note that `init.sql` is the one-time schema bootstrap — not modified for schema changes

**Dependencies:** Tasks 1.2, 1.3

---

## Phase 2 — Core Lib Modules

### Task 2.1: Shared Types and Utilities

**ID:** TASK-2.1  
**Priority:** P1

**Description:**
Create `src/types/index.ts` with all shared TypeScript types, constants, and enums. Create
`src/lib/utils.ts` with German formatters, `cn()`, and plausibility range constants.

**Files to create:**
- `src/types/index.ts`
- `src/lib/utils.ts`

**Acceptance Criteria:**
- [ ] `src/types/index.ts` exports `SCREEN_CATEGORIES: Record<number, EmissionCategory[]>` mapping screens 2–7 to their categories (per architecture §8)
- [ ] `src/types/index.ts` exports `CATEGORY_LABELS: Record<EmissionCategory, string>` — German labels for all 23 categories (e.g., `ERDGAS: "Erdgas"`, `R410A_KAELTEMITTEL: "Kältemittel R410A"`)
- [ ] `src/types/index.ts` exports `MATERIAL_LABELS: Record<MaterialCategory, string>` — German labels for all 8 material categories
- [ ] `src/types/index.ts` exports `PLAUSIBILITY_RANGES: Record<string, { min: number; max: number; unit: string }>` covering all wizard fields
- [ ] `src/types/index.ts` re-exports Prisma-generated types: `CompanyProfile`, `EmissionEntry`, `MaterialEntry`, `EmissionFactor`, `ReportingYear`, `AuditLog`, `UploadedDocument`
- [ ] `src/lib/utils.ts` exports `formatNumber(n: number): string` using `Intl.NumberFormat('de-DE')` (e.g., `1234.56 → "1.234,56"`)
- [ ] `src/lib/utils.ts` exports `formatDate(d: Date): string` using `Intl.DateTimeFormat('de-DE')` (e.g., `"21.03.2026"`)
- [ ] `src/lib/utils.ts` exports `cn(...inputs: ClassValue[]): string` (Tailwind class merger using `clsx` + `tailwind-merge`)
- [ ] TypeScript strict mode passes — no type errors
- [ ] All labels are in German

**Dependencies:** Task 1.1 (Prisma schema must be generated for type imports)

---

### Task 2.2: Prisma Client Singleton

**ID:** TASK-2.2  
**Priority:** P1

**Description:**
Create `src/lib/prisma.ts` with the Prisma client singleton pattern to prevent hot-reload
connection leaks in development.

**File to create:**
- `src/lib/prisma.ts`

**Acceptance Criteria:**
- [ ] Uses `globalThis.__prisma` pattern: `const prisma = globalThis.__prisma ?? new PrismaClient()`
- [ ] In development: assigns `globalThis.__prisma = prisma` (prevents multiple instances on hot reload)
- [ ] In production: creates a fresh `PrismaClient()` without global assignment
- [ ] Single named export: `export { prisma }`
- [ ] No default export (follows project named-export convention from `docs/conventions.md`)
- [ ] `DATABASE_URL` is a server-only environment variable — never exposed to browser

**Dependencies:** Task 1.1

---

### Task 2.3: Emission Factor Lookup (`lib/factors.ts`)

**ID:** TASK-2.3  
**Priority:** P1

**Description:**
Implement `src/lib/factors.ts` with `lookupFactor(key, year, options?)` and `FactorNotFoundError`.
This is the DB-query layer of the CO₂e calculation pipeline.

**File to create:**
- `src/lib/factors.ts`

**Acceptance Criteria:**
- [ ] Exports `async function lookupFactor(key: string, year: number, options?: { isOekostrom?: boolean }): Promise<{ factorKg: number; unit: string; source: string }>`
- [ ] When `options.isOekostrom === true`, resolves key `"STROM"` (or `"STROM_MIX"`) → `"STROM_OEKOSTROM"` before querying
- [ ] Primary lookup: `SELECT ... WHERE key = $key AND validYear <= $year ORDER BY validYear DESC LIMIT 1`
- [ ] Forward fallback: if no row found with `validYear <= year`, queries `SELECT ... WHERE key = $key ORDER BY validYear ASC LIMIT 1` (returns earliest factor when only future-year factors are seeded — handles 2023 queries with only 2024 factors)
- [ ] Throws `FactorNotFoundError` (custom error class) if no factor row exists for the key at any year
- [ ] Exports `class FactorNotFoundError extends Error`
- [ ] No hardcoded factor values — all values come from DB
- [ ] File ≤ 200 lines

**Dependencies:** Tasks 2.1, 2.2

---

### Task 2.4: CO₂e Calculation Engine (`lib/emissions.ts`)

**ID:** TASK-2.4  
**Priority:** P1

**Description:**
Implement `src/lib/emissions.ts` with `calculateCO2e(category, quantity, year, options?)`.
This is the central calculation function used by dashboard, PDF generation, and aggregation.

**File to create:**
- `src/lib/emissions.ts`

**Acceptance Criteria:**
- [ ] Exports `async function calculateCO2e(category: EmissionCategory | MaterialCategory | string, quantity: number, year: number, options?: { isOekostrom?: boolean }): Promise<number>`
- [ ] Returns `quantity × factorKg` (from `lookupFactor`) in kg CO₂e
- [ ] Zero quantity always returns `0` (no DB query needed)
- [ ] Negative quantity or negative factor (ABFALL_ALTMETALL) returns a negative number — this is correct and expected
- [ ] Maps each `EmissionCategory` to its factor key string (per architecture §4.2 factor key table):
  - `STROM` → `"STROM_MIX"` (or `"STROM_OEKOSTROM"` when `isOekostrom: true`, resolved by `lookupFactor`)
  - All other categories → factor key is identical to category enum name (except `MaterialCategory.SONSTIGE` → `"MATERIAL_SONSTIGE"`)
- [ ] Calls `lookupFactor` — never uses hardcoded factor values
- [ ] Propagates `FactorNotFoundError` from `lookupFactor`
- [ ] No calculation logic in UI components or API routes — all calculations go through this function
- [ ] File ≤ 200 lines

**Dependencies:** Tasks 2.1, 2.3

---

### Task 2.5: OCR Stub (`lib/ocr/index.ts`)

**ID:** TASK-2.5  
**Priority:** P2

**Description:**
Implement `src/lib/ocr/index.ts` as a stub that simulates OCR extraction with a 1–2 second
delay and returns hardcoded values. No real HTTP call to the Tesseract container.

**File to create:**
- `src/lib/ocr/index.ts`

**Acceptance Criteria:**
- [ ] Exports `async function extractFromFile(file: File | Buffer, category: string): Promise<{ value: number; unit: string; confidence: number }>`
- [ ] Simulates a 1–2 second delay (`await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))`)
- [ ] Returns hardcoded values appropriate to the category (e.g., category `"ERDGAS"` → `{ value: 4200, unit: "m³", confidence: 0.89 }`)
- [ ] Validates file MIME type and size (max 10 MB, accepts `application/pdf` and `image/*`) before simulating extraction; throws or returns `{ value: null, confidence: 0, error: "OCR fehlgeschlagen" }` on invalid input
- [ ] Never makes real HTTP requests to Tesseract
- [ ] File ≤ 100 lines

**Dependencies:** Task 2.1

---

### Task 2.6: CSV Import Stub (`lib/csv/index.ts`)

**ID:** TASK-2.6  
**Priority:** P2

**Description:**
Implement `src/lib/csv/index.ts` as a stub returning hardcoded preview data. No real CSV parsing.

**File to create:**
- `src/lib/csv/index.ts`

**Acceptance Criteria:**
- [ ] Exports `async function importFromCsv(file: File | Buffer): Promise<{ headers: string[]; rows: Record<string, string>[] }>`
- [ ] Returns hardcoded `headers` (e.g., `["Kategorie", "Menge", "Einheit"]`) and at least 3 hardcoded `rows`
- [ ] Validates file MIME type (`text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) and size ≤ 10 MB; throws on invalid input
- [ ] No real CSV or XLSX parsing logic
- [ ] No formula injection possible (all values treated as strings in this stub)
- [ ] File ≤ 80 lines

**Dependencies:** Task 2.1

---

### Task 2.7: PDF Render Helper (`lib/pdf.ts`)

**ID:** TASK-2.7  
**Priority:** P2

**Description:**
Implement `src/lib/pdf.ts` with `renderReport(type, data)` using `@react-pdf/renderer`.

**File to create:**
- `src/lib/pdf.ts`

**Acceptance Criteria:**
- [ ] Exports `async function renderReport(type: ReportType, data: ReportData): Promise<Buffer>`
- [ ] Uses `renderToBuffer` from `@react-pdf/renderer`
- [ ] Renders `GHGReport` component for `ReportType.GHG_PROTOCOL`
- [ ] Renders `CSRDQuestionnaire` component for `ReportType.CSRD_QUESTIONNAIRE`
- [ ] Exports `type ReportData` with all fields needed by both report templates: company profile, emission entries, material entries, emission factors, reporting year
- [ ] Must run on Node.js runtime only — never Edge (this is enforced at the API route level)
- [ ] File ≤ 150 lines

**Dependencies:** Tasks 2.1, 2.2

---

## Phase 3 — Server Actions & API Routes

### Task 3.1: Server Actions — Entries & Audit Logging

**ID:** TASK-3.1  
**Priority:** P1

**Description:**
Implement `src/lib/actions/entries.ts` with `saveEntry` and `deleteEntry` Server Actions.
Both actions UPSERT/DELETE `EmissionEntry` and write `AuditLog` in a single Prisma transaction.

**Files to create:**
- `src/lib/actions/entries.ts`

**Acceptance Criteria:**
- [ ] `'use server'` directive at top of file
- [ ] Exports `async function saveEntry(input: SaveEntryInput): Promise<ActionResult>` with `ActionResult = { success: boolean; id?: number; error?: string }`
- [ ] `saveEntry` performs `prisma.emissionEntry.upsert` using the composite unique key `(reportingYearId, scope, category, billingMonth, providerName)` with `billingMonth` and `providerName` both nullable
- [ ] `saveEntry` creates `AuditLog` row within `prisma.$transaction([upsertEntry, createAuditLog])` — both or neither
- [ ] AuditLog on create: `action: CREATE`, `newValue: quantity.toString()`
- [ ] AuditLog on update: `action: UPDATE`, `oldValue: previousQuantity.toString()`, `newValue: newQuantity.toString()`
- [ ] Exports `async function deleteEntry(id: number): Promise<ActionResult>`
- [ ] `deleteEntry` deletes the entry and writes `AuditLog` with `action: DELETE`, `oldValue: quantity.toString()`
- [ ] Both functions return `{ success: false, error: "Speichern fehlgeschlagen. Bitte erneut versuchen." }` on error — never throw
- [ ] Error messages are in German
- [ ] File ≤ 200 lines

**Dependencies:** Tasks 2.2, 2.1

---

### Task 3.2: Server Actions — Materials

**ID:** TASK-3.2  
**Priority:** P1

**Description:**
Implement `src/lib/actions/materials.ts` with `saveMaterialEntry` and `deleteMaterialEntry`.

**File to create:**
- `src/lib/actions/materials.ts`

**Acceptance Criteria:**
- [ ] `'use server'` directive
- [ ] Exports `saveMaterialEntry(input)` — creates (when no `id`) or updates (when `id` provided) a `MaterialEntry` row; writes `AuditLog` in transaction
- [ ] Exports `deleteMaterialEntry(id)` — deletes `MaterialEntry` row; writes AuditLog with `action: DELETE`
- [ ] `MaterialEntry` allows multiple rows of the same `MaterialCategory` per year (no unique constraint — it is a list, not a keyed set)
- [ ] AuditLog `entityType: "MaterialEntry"` for all operations
- [ ] German error messages on failure
- [ ] File ≤ 150 lines

**Dependencies:** Tasks 2.2, 2.1

---

### Task 3.3: Server Actions — Company Profile

**ID:** TASK-3.3  
**Priority:** P1

**Description:**
Implement `src/lib/actions/profile.ts` with `saveCompanyProfile`.

**File to create:**
- `src/lib/actions/profile.ts`

**Acceptance Criteria:**
- [ ] `'use server'` directive
- [ ] Exports `saveCompanyProfile(input: SaveCompanyProfileInput): Promise<ActionResult>`
- [ ] Always upserts `CompanyProfile` at `id = 1` using `prisma.companyProfile.upsert({ where: { id: 1 }, create: { id: 1, ...input }, update: { ...input } })`
- [ ] Validates logo upload: MIME must be `image/jpeg` or `image/png`, size ≤ 10 MB; rejects other types with German error message
- [ ] Logo stored as base64 string in `CompanyProfile.logoPath` (or as path if file storage is used)
- [ ] Writes `AuditLog` row for every field changed (`fieldName`, `oldValue`, `newValue`)
- [ ] German error messages on failure
- [ ] File ≤ 150 lines

**Dependencies:** Tasks 2.2, 2.1

---

### Task 3.4: Server Actions — Staging (OCR/CSV Confirmation)

**ID:** TASK-3.4  
**Priority:** P1

**Description:**
Implement `src/lib/actions/staging.ts` with `confirmStagingEntry` and `confirmAllStaging`.

**File to create:**
- `src/lib/actions/staging.ts`

**Acceptance Criteria:**
- [ ] `'use server'` directive
- [ ] Exports `confirmStagingEntry(stagingId: number, documentId?: number): Promise<ActionResult>`
  - Fetches `StagingEntry` by `stagingId`
  - Calls `prisma.$transaction([deleteStagingEntry, upsertEmissionEntry, createAuditLog])`
  - `EmissionEntry` created with `inputMethod: OCR` (or `CSV` per `StagingEntry.source`)
  - `AuditLog` includes `documentId` when provided
  - Deleted `StagingEntry` row removed from DB
- [ ] Exports `confirmAllStaging(reportingYearId: number): Promise<ActionResult>`
  - Confirms all non-expired `StagingEntry` rows for the year in a single transaction
- [ ] Returns `{ success: false }` with German error on failure — never throws
- [ ] File ≤ 150 lines

**Dependencies:** Tasks 3.1, 2.2

---

### Task 3.5: Server Actions — Reporting Years

**ID:** TASK-3.5  
**Priority:** P1

**Description:**
Implement `src/lib/actions/years.ts` with `createReportingYear` and `deleteReportingYear`.

**File to create:**
- `src/lib/actions/years.ts`

**Acceptance Criteria:**
- [ ] `'use server'` directive
- [ ] Exports `createReportingYear(year: number): Promise<ActionResult>`
  - Creates `ReportingYear` row; returns `{ success: true, id }` on success
  - Returns German error if year already exists
- [ ] Exports `deleteReportingYear(id: number): Promise<ActionResult>`
  - Deletes `ReportingYear` row; Prisma cascade deletes all child `EmissionEntry`, `MaterialEntry`, `StagingEntry`, `Report` rows
  - Does NOT delete `AuditLog` rows (audit trail must be immutable — log entries reference `entityId` but the year row itself is gone)
  - Returns `{ success: false }` with German error on failure
- [ ] File ≤ 100 lines

**Dependencies:** Task 2.2

---

### Task 3.6: Server Actions — Index Re-export

**ID:** TASK-3.6  
**Priority:** P1

**Description:**
Create `src/lib/actions.ts` as a barrel file re-exporting all actions from the split modules.

**File to create:**
- `src/lib/actions.ts`

**Acceptance Criteria:**
- [ ] Exports all functions from `./actions/entries`, `./actions/materials`, `./actions/profile`, `./actions/staging`, `./actions/years`
- [ ] Components can import from `"@/lib/actions"` without knowing internal split
- [ ] File is ≤ 30 lines (barrel only)

**Dependencies:** Tasks 3.1–3.5

---

### Task 3.7: API Routes — OCR, CSV, Documents

**ID:** TASK-3.7  
**Priority:** P1

**Description:**
Implement API routes for OCR upload, CSV import, and document retrieval.

**Files to create:**
- `src/app/api/ocr/route.ts`
- `src/app/api/csv/route.ts`
- `src/app/api/documents/[id]/route.ts`
- `src/app/api/field-documents/route.ts`

**Acceptance Criteria:**
- [ ] `POST /api/ocr`: validates MIME (PDF or image) + size ≤ 10 MB; calls `lib/ocr/index.ts extractFromFile()`; upserts `StagingEntry` (expires 24 h); returns `{ quantity, confidence }` JSON; returns 400 with German error on invalid input
- [ ] `POST /api/csv`: validates MIME (CSV or XLSX) + size ≤ 10 MB; calls `lib/csv/index.ts importFromCsv()`; returns `{ headers, rows }` JSON; returns 400 on invalid input
- [ ] `GET /api/documents/[id]`: streams `UploadedDocument.data` bytes with correct `Content-Type`; returns 404 if not found
- [ ] `GET /api/field-documents`: returns `FieldDocument` rows for `?fieldKey=&year=` query params
- [ ] `POST /api/field-documents`: saves `FieldDocument` with upsert on `(fieldKey, year)` unique key
- [ ] All error responses return `{ error: string }` JSON with German messages
- [ ] No raw SQL — Prisma only
- [ ] Each route file ≤ 150 lines

**Dependencies:** Tasks 2.2, 2.5, 2.6

---

### Task 3.8: API Routes — Entries and Audit

**ID:** TASK-3.8  
**Priority:** P2

**Description:**
Implement REST API routes for emission entries and audit log (used by some UI components
that prefer fetch over Server Actions, and for external tooling access).

**Files to create:**
- `src/app/api/entries/route.ts`
- `src/app/api/audit/route.ts`

**Acceptance Criteria:**
- [ ] `GET /api/entries?reportingYearId=&scope=&category=`: returns filtered `EmissionEntry` rows as JSON
- [ ] `POST /api/entries`: creates an `EmissionEntry` (calls `saveEntry` action internally or directly)
- [ ] `PUT /api/entries?id=`: updates an `EmissionEntry`
- [ ] `DELETE /api/entries?id=`: deletes an `EmissionEntry`
- [ ] `GET /api/audit?reportingYearId=&take=50&skip=0`: returns paginated `AuditLog` rows
- [ ] All routes return 4xx/5xx with `{ error: string }` JSON on failure (German messages)
- [ ] Each route file ≤ 150 lines

**Dependencies:** Tasks 3.1, 2.2

---

## Phase 4 — Dashboard Page

### Task 4.1: Root Layout and Next.js App Setup

**ID:** TASK-4.1  
**Priority:** P1

**Description:**
Create the root layout (`src/app/layout.tsx`) and configure Next.js with German locale,
Tailwind CSS, and shadcn/ui.

**Files to create:**
- `src/app/layout.tsx`
- `src/app/globals.css`
- `tailwind.config.ts` (if not already present)
- `next.config.ts` (if not already present)
- shadcn/ui component installations

**Acceptance Criteria:**
- [ ] `<html lang="de">` set in root layout
- [ ] Global Tailwind CSS imported in `globals.css`
- [ ] `<Toaster />` component rendered in layout for global toast notifications
- [ ] shadcn/ui components installed and available: `Button`, `Card`, `Dialog`, `Input`, `Label`, `Select`, `Textarea`, `Badge`, `Separator`, `Progress`, `Toast`, `Toaster`
- [ ] `next build` completes without errors
- [ ] TypeScript strict mode configured (`"strict": true` in `tsconfig.json`)
- [ ] `@/` path alias resolves to `src/`

**Dependencies:** Task 1.1 (package.json must have correct dependencies)

---

### Task 4.2: Dashboard Server Component (`app/page.tsx`)

**ID:** TASK-4.2  
**Priority:** P1

**Description:**
Implement the dashboard page as a Next.js Server Component. It aggregates all data from the
DB in parallel using `Promise.all` and passes plain values (no Prisma objects) to Client Components.

**File to create:**
- `src/app/page.tsx`

**Acceptance Criteria:**
- [ ] Server Component (no `"use client"` directive)
- [ ] Reads `?year=` search param to determine selected reporting year (defaults to most recent year)
- [ ] Parallel DB queries via `Promise.all` (see architecture §3.1 and §4.4):
  - `emissionEntry.findMany` for the selected year
  - `materialEntry.findMany` for the selected year
  - `reportingYear.findMany` (all years, ordered ascending)
  - `industryBenchmark.findUnique` matching `companyProfile.branche`
  - `companyProfile.findUniqueOrThrow({ where: { id: 1 } })`
  - `auditLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } })`
  - `report.findMany` for the selected year
- [ ] CO₂e aggregation: calls `calculateCO2e` for each entry and passes plain number arrays to charts
- [ ] Renders dashboard components: `KpiCard`, `ScopeDonut`, `CategoryBarChart`, `YearOverYearChart`, `BranchenvergleichCard`, `CategoryStatusList`, `YearSelector`, `AuditLogPanel`, and reports list
- [ ] Settings icon in header links to `/settings`
- [ ] "Bericht erstellen" button visible; triggers report generation (can be a Client Component wrapper that calls `POST /api/report`)
- [ ] Generated reports listed with download links pointing to `/api/documents/[id]`
- [ ] Page load time < 2 seconds on local Docker setup (ensured by parallel queries)

**Dependencies:** Tasks 2.4, 3.6, 4.1

---

### Task 4.3: Dashboard Chart Components

**ID:** TASK-4.3  
**Priority:** P1

**Description:**
Implement all Client Component charts for the dashboard using Recharts.

**Files to create:**
- `src/components/dashboard/ScopeDonut.tsx`
- `src/components/dashboard/CategoryBarChart.tsx`
- `src/components/dashboard/YearOverYearChart.tsx`
- `src/components/dashboard/BranchenvergleichCard.tsx`
- `src/components/dashboard/KpiCard.tsx`

**Acceptance Criteria:**
- [ ] All components have `"use client"` directive
- [ ] `ScopeDonut.tsx`: Recharts `PieChart` showing Scope 1 / Scope 2 / Scope 3 shares in t CO₂e; German labels; handles case where a scope has zero entries
- [ ] `CategoryBarChart.tsx`: Recharts `BarChart` showing CO₂e per category within a scope; German category labels from `CATEGORY_LABELS`; handles negative values (Altmetall)
- [ ] `YearOverYearChart.tsx`: Recharts `BarChart` showing total t CO₂e for each available reporting year; x-axis labels are year integers
- [ ] `BranchenvergleichCard.tsx`: shadcn/ui `Card` showing company t CO₂e/MA vs `IndustryBenchmark.co2ePerEmployeePerYear`; displays both values with German formatting; indicates above/below benchmark
- [ ] `KpiCard.tsx`: shows total t CO₂e, t CO₂e per employee (total ÷ `mitarbeiter`), and year-over-year delta badge; values formatted with `formatNumber` from `lib/utils.ts`
- [ ] Numbers displayed using German locale format (e.g., "1.234,56")
- [ ] All chart tooltips in German
- [ ] Charts handle empty data gracefully (no JS errors when no entries exist for a year)
- [ ] All touch targets ≥ 44 × 44 px
- [ ] WCAG 2.1 AA colour contrast for chart colours
- [ ] Each file ≤ 200 lines

**Dependencies:** Tasks 2.1, 4.1

---

### Task 4.4: Dashboard Status and Log Components

**ID:** TASK-4.4  
**Priority:** P1

**Description:**
Implement `CategoryStatusList`, `YearSelector`, and `AuditLogPanel` dashboard components.

**Files to create:**
- `src/components/dashboard/CategoryStatusList.tsx`
- `src/components/dashboard/YearSelector.tsx`
- `src/components/dashboard/AuditLogPanel.tsx`

**Acceptance Criteria:**
- [ ] `CategoryStatusList.tsx`: Server Component (can be rendered inside `app/page.tsx`); for each wizard screen (2–7), shows status badge per the rules in architecture §8: `Erfasst ✓` (all categories have entries), `Teilweise ⚠` (some categories have entries), `Nicht erfasst —` (no entries); Screen 6 (Materialien) shows `Erfasst` if any `MaterialEntry` exists
- [ ] `YearSelector.tsx`: Client Component; `<select>` or shadcn `Select` showing all reporting years + `"+ Neues Jahr anlegen"` option; on year change navigates to `/?year=<id>`; on "+ Neues Jahr anlegen" prompts user for year number and calls `createReportingYear`
- [ ] `AuditLogPanel.tsx`: Client Component; collapsible table showing last 50 `AuditLog` rows with columns: Datum, Kategorie, Änderung (oldValue → newValue), Methode (MANUAL/OCR/CSV); download link to `/api/documents/[documentId]` when `documentId` is set; collapsed by default on first render
- [ ] `YearSelector` uses `useRouter` and `useSearchParams` for client-side navigation
- [ ] Each file ≤ 200 lines

**Dependencies:** Tasks 2.1, 3.5, 4.1

---

## Phase 5 — Data Entry Wizard

### Task 5.1: Wizard Layout and Navigation

**ID:** TASK-5.1  
**Priority:** P1

**Description:**
Create the wizard shell layout and `WizardNav` side navigation component.

**Files to create:**
- `src/app/wizard/layout.tsx`
- `src/app/wizard/[screen]/page.tsx`
- `src/components/wizard/WizardNav.tsx`

**Acceptance Criteria:**
- [ ] `src/app/wizard/layout.tsx`: renders `WizardNav` on the left + `{children}` on the right; mobile-first layout (stack on small screens, side-by-side on larger)
- [ ] `WizardNav.tsx`: Client Component; 7 navigation links (Firmenprofil, Heizung & Kältemittel, Fuhrpark, Strom & Fernwärme, Dienstreisen & Pendler, Materialien, Abfall); each link shows a status badge (`Erfasst` / `Teilweise` / `Nicht erfasst`) computed from `SCREEN_CATEGORIES`; progress bar at top showing count of screens with `Erfasst` status out of 7
- [ ] `src/app/wizard/[screen]/page.tsx`: Server Component; reads `params.screen` (string "1"–"7") and `searchParams.year`; fetches existing data for the screen; renders the correct screen component with pre-fetched data as `defaultValues`; fetches last 5 `AuditLog` entries for the screen's categories (passed to `ScreenChangeLog`)
- [ ] Screen `"1"` → `Screen1Firmenprofil`, "2" → `Screen2Heizung`, …, "7" → `Screen7Abfall`
- [ ] Invalid screen param → redirect to `/wizard/1`
- [ ] Navigation highlights the active screen
- [ ] Touch targets ≥ 44 × 44 px for all navigation items

**Dependencies:** Tasks 2.1, 3.6, 4.1

---

### Task 5.2: Shared Wizard Sub-components

**ID:** TASK-5.2  
**Priority:** P1

**Description:**
Create shared wizard components used across all screens: `PlausibilityWarning`, `ScreenChangeLog`,
`UploadOCR`, `CsvImport`, and `FieldDocumentZone`.

**Files to create:**
- `src/components/wizard/PlausibilityWarning.tsx`
- `src/components/wizard/ScreenChangeLog.tsx`
- `src/components/wizard/UploadOCR.tsx`
- `src/components/wizard/CsvImport.tsx`
- `src/components/wizard/FieldDocumentZone.tsx`

**Acceptance Criteria:**
- [ ] `PlausibilityWarning.tsx`: amber inline banner displayed when a numeric value is outside the range defined in `PLAUSIBILITY_RANGES` for the given field key; informational only — does not prevent save; German text
- [ ] `ScreenChangeLog.tsx`: collapsible section at bottom of each wizard screen; shows last 5 `AuditLog` rows for the current screen's categories; columns: Datum, Feld, Änderung, Methode; collapsed by default
- [ ] `UploadOCR.tsx`: file input (PDF/image, max 10 MB); on select: POST to `/api/ocr`, show spinner 1–2 s, then show yellow preview banner with value + confidence; "Bestätigen" button calls `confirmStagingEntry`; "Abbrechen" dismisses banner; all text in German
- [ ] `CsvImport.tsx`: file input (CSV/XLSX, max 10 MB); on select: POST to `/api/csv`, show column mapping table; "Übernehmen" pre-fills wizard field values; toast "CSV-Import erfolgreich. Bitte Werte prüfen und bestätigen."; all text in German
- [ ] `FieldDocumentZone.tsx`: green dashed drop zone per field; accepts any file type ≤ 10 MB; POST to `/api/field-documents`; shows attached filename after upload; GET from `/api/field-documents?fieldKey=&year=` on mount to show existing attachment
- [ ] All components are `"use client"`
- [ ] Each file ≤ 200 lines

**Dependencies:** Tasks 3.4, 3.7, 2.1, 4.1

---

### Task 5.3: Wizard Screen 1 — Firmenprofil

**ID:** TASK-5.3  
**Priority:** P1

**Description:**
Implement `Screen1Firmenprofil.tsx` with all 7 company profile fields.

**File to create:**
- `src/components/wizard/screens/Screen1Firmenprofil.tsx`

**Acceptance Criteria:**
- [ ] Client Component with `"use client"`
- [ ] Fields: Firmenname (text), Branche (Select dropdown: ELEKTROHANDWERK/SHK/BAUGEWERBE/TISCHLER/KFZ_WERKSTATT/MALER/SONSTIGES in German), Mitarbeiter (integer input), Standort (text), Logo (file input: JPEG/PNG), Berichtsgrenzen-Notizen (Textarea), Ausschlüsse (Textarea)
- [ ] `onBlur` on each text field triggers `saveCompanyProfile`; shows German success toast on success
- [ ] Logo upload calls `saveCompanyProfile` with the base64-encoded image
- [ ] "Speichern" button explicitly calls `saveCompanyProfile` with all current field values
- [ ] Pre-fills all fields from `defaultValues` prop (fetched by parent Server Component)
- [ ] `ScreenChangeLog` at the bottom showing last 5 audit entries for CompanyProfile
- [ ] All labels in German
- [ ] File ≤ 250 lines

**Dependencies:** Tasks 3.3, 5.2

---

### Task 5.4: Wizard Screen 2 — Heizung & Kältemittel

**ID:** TASK-5.4  
**Priority:** P1

**Description:**
Implement `Screen2Heizung.tsx` for Scope 1 heating and refrigerant fields.

**File to create:**
- `src/components/wizard/screens/Screen2Heizung.tsx`

**Acceptance Criteria:**
- [ ] 7 numeric inputs with German labels and unit hints:
  - Erdgas (m³), Heizöl (L), Flüssiggas (kg)
  - Kältemittel R410A (kg), R32 (kg), R134A (kg), Sonstige (kg)
- [ ] `onBlur` on each field calls `saveEntry` with `scope: SCOPE_1` and the correct `EmissionCategory`
- [ ] `PlausibilityWarning` shown for out-of-range values (does not block save)
- [ ] `UploadOCR` button next to Erdgas field
- [ ] `FieldDocumentZone` per field
- [ ] "Speichern" button saves all 7 fields
- [ ] Pre-filled from `defaultValues`
- [ ] `ScreenChangeLog` at bottom
- [ ] German success/error toasts
- [ ] File ≤ 250 lines

**Dependencies:** Tasks 3.1, 5.2

---

### Task 5.5: Wizard Screen 3 — Fuhrpark

**ID:** TASK-5.5  
**Priority:** P1

**Description:**
Implement `Screen3Fuhrpark.tsx` for Scope 1 vehicle fleet with static fuel fields and a
dynamic vehicle-km table.

**File to create:**
- `src/components/wizard/screens/Screen3Fuhrpark.tsx`

**Acceptance Criteria:**
- [ ] Static fields: Diesel Fuhrpark (L), Benzin Fuhrpark (L) — each with `onBlur` save
- [ ] Dynamic vehicle-km table: rows with columns `Fahrzeugtyp` (Select: PKW Benzin/PKW Diesel/Transporter/LKW) + `km` (numeric input)
- [ ] "Zeile hinzufügen" button adds a new empty row
- [ ] Each row has a delete button; clicking calls `deleteEntry(row.id)` and removes the row
- [ ] `onBlur` on km field calls `saveEntry` with the correct `EmissionCategory` (PKW_BENZIN_KM / PKW_DIESEL_KM / TRANSPORTER_KM / LKW_KM)
- [ ] Pre-filled rows loaded from `defaultValues.vehicleEntries`
- [ ] `ScreenChangeLog` at bottom
- [ ] German labels and toasts
- [ ] File ≤ 250 lines

**Dependencies:** Tasks 3.1, 5.2

---

### Task 5.6: Wizard Screen 4 — Strom & Fernwärme

**ID:** TASK-5.6  
**Priority:** P1

**Description:**
Implement `Screen4Strom.tsx` — the most complex screen with annual/monthly mode toggle,
Ökostrom flag, provider name, and Fernwärme.

**File to create:**
- `src/components/wizard/screens/Screen4Strom.tsx`

**Acceptance Criteria:**
- [ ] Toggle: "Jahreswert" (default) vs "Monatsweise erfassen"
- [ ] Annual mode: single kWh input + Ökostrom checkbox (`isOekostrom`) + provider name (text)
  - `onBlur` calls `saveEntry({ scope: SCOPE_2, category: STROM, billingMonth: null, isFinalAnnual: true, isOekostrom, providerName })`
- [ ] Monthly mode: 12 monthly kWh inputs (labelled Jan–Dez)
  - `onBlur` on each month calls `saveEntry({ ..., billingMonth: 1–12, isFinalAnnual: false })`
- [ ] Fernwärme: separate kWh input with `onBlur` save to `FERNWAERME` category
- [ ] `UploadOCR` button next to main Strom field
- [ ] `FieldDocumentZone` for Strom and Fernwärme fields
- [ ] Pre-filled from `defaultValues` (annual entry or monthly entries)
- [ ] `ScreenChangeLog` at bottom
- [ ] "Speichern" button saves current mode's data
- [ ] German labels and toasts
- [ ] File ≤ 300 lines

**Dependencies:** Tasks 3.1, 5.2

---

### Task 5.7: Wizard Screen 5 — Dienstreisen & Pendler

**ID:** TASK-5.7  
**Priority:** P1

**Description:**
Implement `Screen5Dienstreisen.tsx` for Scope 3 business travel and commuting.

**File to create:**
- `src/components/wizard/screens/Screen5Dienstreisen.tsx`

**Acceptance Criteria:**
- [ ] 3 numeric inputs: Geschäftsreisen Flug (km), Geschäftsreisen Bahn (km), Pendlerverkehr gesamt (km)
- [ ] `onBlur` on each field calls `saveEntry` with `scope: SCOPE_3` and correct category
- [ ] Help text below Pendlerverkehr field explaining the calculation (km/MA × MA × Arbeitstage)
- [ ] `PlausibilityWarning` for out-of-range values
- [ ] `FieldDocumentZone` per field
- [ ] Pre-filled from `defaultValues`
- [ ] `ScreenChangeLog` at bottom
- [ ] "Speichern" button
- [ ] German labels and toasts
- [ ] File ≤ 200 lines

**Dependencies:** Tasks 3.1, 5.2

---

### Task 5.8: Wizard Screen 6 — Materialien

**ID:** TASK-5.8  
**Priority:** P1

**Description:**
Implement `Screen6Materialien.tsx` with a dynamic `MaterialEntry` table (no unique constraint
per material category — multiple rows of KUPFER are valid).

**File to create:**
- `src/components/wizard/screens/Screen6Materialien.tsx`

**Acceptance Criteria:**
- [ ] Dynamic table with columns: Kategorie (Select: all 8 `MaterialCategory` values with German labels), Menge (kg) (numeric), Lieferant (text, optional)
- [ ] "Zeile hinzufügen" button adds an empty row
- [ ] Each row has a delete button calling `deleteMaterialEntry(row.id)`
- [ ] `onBlur` on kg or supplier fields calls `saveMaterialEntry({ id?, reportingYearId, material, quantityKg, supplierName })`
- [ ] Create on first save (no `id`); update on subsequent saves (with `id`)
- [ ] Pre-filled rows from `defaultValues.materialEntries`
- [ ] `ScreenChangeLog` at bottom
- [ ] "Speichern" button saves all rows
- [ ] German labels and toasts
- [ ] File ≤ 250 lines

**Dependencies:** Tasks 3.2, 5.2

---

### Task 5.9: Wizard Screen 7 — Abfall

**ID:** TASK-5.9  
**Priority:** P1

**Description:**
Implement `Screen7Abfall.tsx` for Scope 3 waste categories. Note that Altmetall has a
negative emission factor (recycling credit) — this is correct and must be communicated to users.

**File to create:**
- `src/components/wizard/screens/Screen7Abfall.tsx`

**Acceptance Criteria:**
- [ ] 4 numeric inputs: Restmüll (kg), Bauschutt (kg), Altmetall (kg), Sonstiges (kg)
- [ ] `onBlur` on each field calls `saveEntry` with `scope: SCOPE_3` and correct category
- [ ] Info note below Altmetall field: "Altmetall hat einen negativen Emissionsfaktor — Recycling reduziert Ihren CO₂-Fußabdruck." (informational, not a warning)
- [ ] `PlausibilityWarning` for out-of-range values
- [ ] `FieldDocumentZone` per field
- [ ] Pre-filled from `defaultValues`
- [ ] `ScreenChangeLog` at bottom
- [ ] "Speichern" button
- [ ] German labels and toasts
- [ ] File ≤ 200 lines

**Dependencies:** Tasks 3.1, 5.2

---

## Phase 6 — Reports & Exports

### Task 6.1: GHG Protocol PDF Component

**ID:** TASK-6.1  
**Priority:** P1

**Description:**
Implement `GHGReport.tsx` using `@react-pdf/renderer`. This is a pure React-PDF component —
never rendered in the browser.

**Files to create:**
- `src/components/reports/GHGReport.tsx`
- (optional sub-components if file exceeds 300 lines): `src/components/reports/ReportHeader.tsx`, `src/components/reports/ScopeTable.tsx`, `src/components/reports/DataQualitySection.tsx`, `src/components/reports/BerichtsgrenzenSection.tsx`, `src/components/reports/MethodologySection.tsx`

**Acceptance Criteria:**
- [ ] Pure React-PDF component — no `"use client"`, no browser APIs
- [ ] Sections in order (per architecture §5.1):
  1. Cover: logo, Firmenname, Standort, Berichtsjahr, "GHG Protocol Corporate Standard"
  2. Executive Summary: total CO₂e (t), per-employee (t/MA), Scope 1/2/3 breakdown
  3. Scope 1 Table: category, quantity, unit, factor (kg/unit), CO₂e (kg) per row; subtotal
  4. Scope 2 Table: STROM (Ökostrom: Ja/Nein), FERNWAERME; same columns
  5. Scope 3 Activities: travel, commuting, waste rows with same columns
  6. Scope 3 Materialien: material category, kg, factor, CO₂e per row
  7. Berichtsgrenzen: `reportingBoundaryNotes` + `exclusions`; fallback text if empty
  8. Data Quality: every `EmissionCategory` listed as "erfasst (gemessen)" / "erfasst (geschätzt)" / "nicht erfasst" (MANUAL → gemessen, OCR/CSV → geschätzt, no entry → nicht erfasst)
  9. Methodology: cites UBA 2024; notes factor year per category
  10. Footnotes: uncaptured categories; GWP sources for Kältemittel
- [ ] EmissionFactor source cited in tables (`EmissionFactor.source` field)
- [ ] All text in German
- [ ] Accepts `ReportData` prop (defined in `lib/pdf.ts`)
- [ ] Handles missing data gracefully (empty categories listed as "nicht erfasst" — no undefined errors)
- [ ] Each sub-component file ≤ 300 lines

**Dependencies:** Tasks 2.7, 2.4, 2.1

---

### Task 6.2: CSRD Questionnaire PDF Component

**ID:** TASK-6.2  
**Priority:** P2

**Description:**
Implement `CSRDQuestionnaire.tsx` — a simplified supplier questionnaire PDF.

**File to create:**
- `src/components/reports/CSRDQuestionnaire.tsx`

**Acceptance Criteria:**
- [ ] Pure React-PDF component — no browser APIs
- [ ] Sections (per architecture §5.2): company identification, GHG emissions summary (total CO₂e, Scope 1/2/3), data coverage statement, reporting standards (GHG Protocol + UBA 2024), contact declaration placeholder
- [ ] All text in German
- [ ] Accepts same `ReportData` prop as `GHGReport`
- [ ] File ≤ 250 lines

**Dependencies:** Tasks 2.7, 2.1

---

### Task 6.3: Report API Route

**ID:** TASK-6.3  
**Priority:** P1

**Description:**
Implement `POST /api/report` to generate PDF and store it in the DB. Must use Node.js runtime.

**File to create:**
- `src/app/api/report/route.ts`

**Acceptance Criteria:**
- [ ] `export const runtime = 'nodejs'` at top of file (required — React-PDF cannot run on Edge)
- [ ] Accepts `POST { year: number, type: "GHG_PROTOCOL" | "CSRD_QUESTIONNAIRE" }`
- [ ] Fetches all required data from DB (company profile, all entries for the year, factors)
- [ ] Calls `renderReport(type, data)` from `lib/pdf.ts` → `Buffer`
- [ ] Saves PDF to `process.env.REPORTS_PATH/[year]-[type]-[timestamp].pdf`
- [ ] Inserts `Report` row with `filePath`, `reportType`, `reportingYearId`, `createdAt`
- [ ] Returns PDF buffer as `application/pdf` response with `Content-Disposition: attachment; filename="..."`
- [ ] Completes in < 3 seconds (verified by test TC-R01)
- [ ] Returns 500 with German error message if generation fails
- [ ] File ≤ 150 lines

**Dependencies:** Tasks 2.7, 6.1, 6.2, 2.2

---

### Task 6.4: Sustainability Badge API Route

**ID:** TASK-6.4  
**Priority:** P2

**Description:**
Implement `GET /api/badge` returning PNG, SVG, and HTML embed snippet for the sustainability badge.

**File to create:**
- `src/app/api/badge/route.ts`

**Acceptance Criteria:**
- [ ] `export const runtime = 'nodejs'`
- [ ] Accepts `?year=<id>` query param
- [ ] Queries total CO₂e for the year (sum of all EmissionEntry + MaterialEntry CO₂e)
- [ ] Returns JSON `{ "png": "<base64>", "svg": "<svg>...</svg>", "html": "<a href='...'><img .../></a>" }`
- [ ] Badge shows: company name, total t CO₂e, reporting year, "GrünBilanz" label
- [ ] Generated server-side using `@vercel/og` or canvas (no Puppeteer)
- [ ] Returns 404 if year not found
- [ ] File ≤ 150 lines

**Dependencies:** Tasks 2.4, 2.2

---

## Phase 7 — Settings Page

### Task 7.1: Settings Page and Year Management

**ID:** TASK-7.1  
**Priority:** P1

**Description:**
Implement `/settings` page with year management: add new year and delete existing year.

**Files to create:**
- `src/app/settings/page.tsx`
- `src/components/settings/YearManagement.tsx`

**Acceptance Criteria:**
- [ ] `src/app/settings/page.tsx`: Server Component shell; fetches all `ReportingYear` rows; renders `YearManagement` Client Component with years as prop
- [ ] `YearManagement.tsx`: Client Component
  - Lists all reporting years with delete button per year
  - "+ Neues Jahr anlegen" button: prompts for year number (could be inline input or Dialog); calls `createReportingYear(year)`; shows German success/error toast
  - Delete button per year: shows `<Dialog>` (shadcn/ui) with German confirmation text "Möchten Sie das Berichtsjahr [year] und alle zugehörigen Daten wirklich löschen?"; on confirm calls `deleteReportingYear(id)`; on cancel dismisses dialog
  - After add/delete: `router.refresh()` to re-fetch updated year list
  - Shows error toast if `createReportingYear` or `deleteReportingYear` returns `{ success: false }`
- [ ] Settings page accessible from dashboard header Settings icon (link to `/settings`)
- [ ] All text in German
- [ ] File `YearManagement.tsx` ≤ 200 lines

**Dependencies:** Tasks 3.5, 3.6, 4.1

---

## Phase 8 — Unit Tests

### Task 8.1: Unit Tests for `lib/factors.ts`

**ID:** TASK-8.1  
**Priority:** P1

**Description:**
Write comprehensive unit tests for `lookupFactor` using Vitest with mocked Prisma client.
Must achieve ≥ 80% line coverage.

**File to create:**
- `src/lib/__tests__/factors.test.ts`

**Acceptance Criteria:**
- [ ] Test framework: Vitest (`vi.mock` for Prisma)
- [ ] Test file follows naming convention `*.test.ts` in `__tests__/` directory
- [ ] Covers all test cases from test plan (TC-C09 through TC-C13, plus additional):
  - [ ] `lookupFactor_exactYearMatch_returnsCorrectFactor`: 2024 query with 2024 factor → returns factor; no second DB call
  - [ ] `lookupFactor_forwardFallback_usesEarliestFactorWhenNoneBeforeYear`: 2023 query, only 2024 factor seeded → returns 2024 factor
  - [ ] `lookupFactor_unknownKey_throwsFactorNotFoundError`: both DB calls return null → throws `FactorNotFoundError`
  - [ ] `lookupFactor_oekostromTrue_usesStromOekostromKey`: `isOekostrom: true` → DB queried with key `"STROM_OEKOSTROM"`
  - [ ] `lookupFactor_oekostromFalse_usesStromMixKey`: `isOekostrom: false` → DB queried with key `"STROM_MIX"`
  - [ ] `lookupFactor_allEmissionCategoryKeys_resolveWithoutError`: all 31 factor keys resolve without throwing a type or key-resolution error
  - [ ] `lookupFactor_altmetallKey_returnsNegativeFactor`: ABFALL_ALTMETALL key returns negative `factorKg`
- [ ] Prisma client mocked via `vi.mock('@/lib/prisma')` — no real DB connection required
- [ ] Test coverage for `src/lib/factors.ts` ≥ 80% lines (verified by `npm test -- --coverage`)
- [ ] All tests pass: `npm test` exits 0

**Dependencies:** Task 2.3

---

### Task 8.2: Unit Tests for `lib/emissions.ts`

**ID:** TASK-8.2  
**Priority:** P1

**Description:**
Write comprehensive unit tests for `calculateCO2e` using Vitest with mocked `lookupFactor`.
Must achieve ≥ 80% line coverage.

**File to create:**
- `src/lib/__tests__/emissions.test.ts`

**Acceptance Criteria:**
- [ ] Uses Vitest; mocks `lookupFactor` from `lib/factors.ts` via `vi.mock`
- [ ] Covers all test cases from test plan (TC-C01 through TC-C08, TC-C12):
  - [ ] `calculateCO2e_erdgas1000m3_returns2000kgCO2e`: factor 2.000 → returns 2000 (TC-C01)
  - [ ] `calculateCO2e_altmetall_returnsNegativeCO2e`: negative factor → negative result (TC-C02)
  - [ ] `calculateCO2e_r410a_returns2088xQuantity`: GWP 2088 (TC-C03)
  - [ ] `calculateCO2e_r32_returns675xQuantity`: GWP 675 (TC-C04)
  - [ ] `calculateCO2e_r134a_returns1430xQuantity`: GWP 1430 (TC-C05)
  - [ ] `calculateCO2e_oekostrom_usesOekostromKey`: `isOekostrom: true` → calls `lookupFactor` with `isOekostrom: true` option (TC-C06)
  - [ ] `calculateCO2e_multipliesQuantityByFactor`: generic factor × quantity contract (TC-C08)
  - [ ] `calculateCO2e_zeroQuantity_returnsZero`: no DB call needed for zero input (TC-C12)
  - [ ] `calculateCO2e_propagatesFactorNotFoundError`: `FactorNotFoundError` from `lookupFactor` propagates
- [ ] `lookupFactor` is mocked — `calculateCO2e` unit tests do not test DB queries
- [ ] Test coverage for `src/lib/emissions.ts` ≥ 80% lines
- [ ] All tests pass: `npm test` exits 0

**Dependencies:** Task 2.4

---

### Task 8.3: Unit Test Configuration

**ID:** TASK-8.3  
**Priority:** P1

**Description:**
Ensure the Vitest test configuration is correct, coverage thresholds are set, and `npm test` runs
tests with coverage.

**Files to create/update:**
- `vitest.config.ts` (or `vite.config.ts` if Vitest is configured there)
- `package.json` (update `test` script)

**Acceptance Criteria:**
- [ ] `npm test` runs all `*.test.ts` files under `src/`
- [ ] Coverage report generated for `src/lib/emissions.ts` and `src/lib/factors.ts`
- [ ] Coverage threshold enforced: ≥ 80% lines for `src/lib/emissions.ts` and `src/lib/factors.ts`
- [ ] `npm test` exits with code 1 if coverage threshold is not met
- [ ] Tests run without a real PostgreSQL connection (Prisma fully mocked)
- [ ] `vitest.config.ts` excludes `e2e-tests/` and `src/app/` from coverage

**Dependencies:** None (can be set up in parallel with Task 2.3/2.4)

---

## Phase 9 — E2E Tests

### Task 9.1: Playwright Configuration and Smoke Tests

**ID:** TASK-9.1  
**Priority:** P2

**Description:**
Set up Playwright for E2E testing and implement the first-run smoke test.

**Files to create:**
- `e2e-tests/playwright.config.ts`
- `e2e-tests/smoke/first-run.spec.ts`

**Acceptance Criteria:**
- [ ] Playwright configured to target `http://localhost:3000` (app must be running)
- [ ] Smoke test `TC-D02`: navigates to `http://localhost:3000`, asserts "Mustermann Elektro GmbH" visible, charts rendered (no JS errors), German number formatting present
- [ ] Test script `npm run test:e2e` in `package.json` runs `playwright test`
- [ ] Tests follow naming convention from `docs/testing-strategy.md`

**Dependencies:** Tasks 4.2, 4.3 (dashboard must exist)

---

### Task 9.2: E2E Tests — Primary Happy Path

**ID:** TASK-9.2  
**Priority:** P2

**Description:**
Implement E2E tests for the primary user journey: enter data in Screen 2 → dashboard updates.

**File to create:**
- `e2e-tests/wizard/screen2-heizung.spec.ts`

**Acceptance Criteria:**
- [ ] `TC-W04/TC-W05`: navigates to `/wizard/2`, enters 1000 in Erdgas field, tabs out (`onBlur`), asserts German success toast visible
- [ ] `TC-W03`: navigates away and back to `/wizard/2`, asserts 1000 pre-filled in Erdgas field
- [ ] Verifies Scope 1 on dashboard increases by 2000 kg CO₂e after save (TC-C01 verification)
- [ ] Asserts status badge on `/wizard/2` changes from "Nicht erfasst" to at least "Teilweise"

**Dependencies:** Tasks 4.2, 5.4, 9.1

---

### Task 9.3: E2E Tests — Year Management and Settings

**ID:** TASK-9.3  
**Priority:** P2

**Description:**
Implement E2E tests for the Settings page year management flow (Scenario 4 from test plan).

**File to create:**
- `e2e-tests/settings/year-management.spec.ts`

**Acceptance Criteria:**
- [ ] `TC-S01`: navigates to dashboard, clicks Settings icon, arrives at `/settings`
- [ ] `TC-S02`: clicks "+ Neues Jahr anlegen", enters 2025, confirms, asserts 2025 visible in year selector
- [ ] `TC-DB07`: navigates to dashboard, uses year selector to switch to 2025, asserts empty state (all categories "Nicht erfasst")
- [ ] `TC-S03`: returns to `/settings`, clicks delete for 2025, German confirmation dialog appears, confirms, asserts 2025 no longer in year selector

**Dependencies:** Tasks 7.1, 4.4, 9.1

---

### Task 9.4: E2E Tests — Report Generation

**ID:** TASK-9.4  
**Priority:** P2

**Description:**
Implement E2E test for the GHG Protocol PDF report generation flow (Scenario 3 from test plan).

**File to create:**
- `e2e-tests/reports/ghg-report.spec.ts`

**Acceptance Criteria:**
- [ ] `TC-R01`: navigates to dashboard, clicks "Bericht erstellen", waits up to 5 seconds, asserts PDF download link appears
- [ ] `TC-R08`: asserts the new report appears in the "Berichte" section of the dashboard
- [ ] Smoke check: asserts no JS console errors during generation

**Dependencies:** Tasks 6.3, 4.2, 9.1

---

### Task 9.5: E2E Tests — OCR Upload Stub Flow

**ID:** TASK-9.5  
**Priority:** P3

**Description:**
Implement E2E test for the OCR upload stub flow on Screen 2.

**File to create:**
- `e2e-tests/wizard/ocr-upload.spec.ts`

**Acceptance Criteria:**
- [ ] `TC-I02`: navigates to `/wizard/2`, clicks upload button next to Erdgas, selects a PDF file, asserts spinner appears then disappears, asserts yellow preview banner appears with a numeric value and confidence percentage
- [ ] Clicks "Bestätigen", asserts success toast appears
- [ ] Asserts Erdgas field pre-filled with the confirmed value after page refresh

**Dependencies:** Tasks 5.4, 3.4, 9.1

---

## Cross-Cutting Concerns (applies to all tasks)

### Non-Functional Requirements (applies to every task)

**Acceptance Criteria (global):**
- [ ] All user-facing text is in German (labels, toasts, error messages, placeholders, confirmations)
- [ ] Numbers formatted with `Intl.NumberFormat('de-DE')` (e.g., "1.234,56")
- [ ] Dates formatted with `Intl.DateTimeFormat('de-DE')` (e.g., "21.03.2026")
- [ ] Mobile-first layout: 375 px primary breakpoint
- [ ] All interactive touch targets ≥ 44 × 44 px
- [ ] WCAG 2.1 AA colour contrast throughout
- [ ] TypeScript strict mode — zero type errors (`tsc --noEmit` passes)
- [ ] No ESLint warnings or errors
- [ ] `next build` completes with zero errors and zero deprecation warnings
- [ ] All source files ≤ 300 lines (300 is the hard limit; refactor into sub-files at 250+)
- [ ] Named exports only (except Next.js page/layout conventions which require `export default`)
- [ ] No calculation logic in UI components or API routes — all CO₂e calculations via `lib/emissions.ts`
- [ ] No hardcoded emission factor values in TypeScript — always query DB via `lib/factors.ts`
- [ ] Server Actions return `{ success: false, error: string }` on failure — never throw
- [ ] `DATABASE_URL` and `TESSERACT_URL` are server-only variables — never exposed to browser
- [ ] Conventional Commits for all commit messages

---

## Open Questions

None. All requirements are fully specified in `specification.md` (Feature 001) and
`docs/architecture.md` (arc42 v1.1). All ADRs (ADR-001 through ADR-006) are finalised.
The Developer can begin implementation immediately starting with Phase 1.
