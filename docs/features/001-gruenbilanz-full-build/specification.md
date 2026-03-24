# Feature: GrünBilanz Full Application Build

**Feature ID:** 001  
**Status:** 🚧 In Progress  
**Branch:** `copilot/feature-grunbilanz-full-application-build-again`  
**Architecture Reference:** `docs/architecture.md` (arc42 v1.1 — single source of truth for all technical decisions)

---

## Overview

Build the complete **GrünBilanz** application — a single-tenant, self-hosted B2B SaaS tool for CO₂ footprint calculation and ESG reporting, targeted at German Handwerksbetriebe (craft businesses with 10–100 employees). The application follows the GHG Protocol Corporate Standard and uses official UBA 2024 emission factors seeded into the database.

The entire stack runs via `docker compose up` with zero manual setup: PostgreSQL, Next.js 14, and a Tesseract OCR service start together, initialise schema and seed data, and the app is immediately usable at `http://localhost:3000`.

---

## User Goals

- A Betriebsinhaber (business owner) with no sustainability expertise should be able to complete a full annual CO₂ report in ≤ 20 minutes.
- The system persists partial data across browser sessions so a user can enter data bill by bill throughout the year.
- At the end of the year the user clicks one button to generate a PDF report suitable for submission to banks and Großkunden.
- The system provides a CSRD supplier questionnaire PDF and a shareable sustainability badge (PNG + SVG + HTML embed snippet).
- The user can monitor what has changed and who changed it via audit log panels on the dashboard and within each wizard screen.

---

## Scope

### In Scope

#### Infrastructure & Deployment
- `docker compose up` produces a fully working application with zero manual steps.
- Exactly two Docker Compose services: `app` (Next.js 14 + PostgreSQL 15 in one container, managed by supervisord) and `tesseract` (OCR REST API on port 3001).
- PostgreSQL data persisted in named volume `gruenbilanz_pgdata`.
- App accessible at `http://localhost:3000` immediately after container start.
- `docker/init.sql` runs on first start: creates schema, seeds all `EmissionFactor` rows (UBA 2024), `CompanyProfile` (Mustermann Elektro GmbH), `IndustryBenchmark` rows, and 2 full years of sample `EmissionEntry` + `MaterialEntry` rows (2023 and 2024).
- Prisma migrations (`prisma migrate deploy`) run idempotently on every start.
- `README.md` instructions: prerequisites → `docker compose up` → done.

#### Database Schema (Prisma)
All models defined in `docs/architecture.md` §5.2 must be implemented exactly as specified:
- `CompanyProfile` (single row, id = 1)
- `ReportingYear`
- `EmissionEntry` (unified table for Scope 1/2/3 activities, with `billingMonth`, `isFinalAnnual`, `providerName` extensions)
- `EmissionCategory` enum (all 23 values)
- `MaterialEntry` (separate table for Scope 3 Category 1 purchased materials)
- `MaterialCategory` enum (8 values: KUPFER, STAHL, ALUMINIUM, HOLZ, KUNSTSTOFF_PVC, BETON, FARBEN_LACKE, SONSTIGE)
- `EmissionFactor` (versioned by `valid_year`)
- `StagingEntry` (OCR/CSV staging, expires after 24 h)
- `Report` (generated PDF records)
- `IndustryBenchmark` (seeded benchmarks per Branche)
- `FieldDocument` (one per `(fieldKey, year)` — per-field invoice attachments)
- `UploadedDocument` (source document bytes stored in DB)
- `AuditLog` (immutable change log)
- All enums: `Branche`, `Scope`, `EmissionCategory`, `InputMethod`, `StagingSource`, `ReportType`, `AuditAction`

#### No Authentication / No Login
- The application opens directly to the dashboard — no login page, no session management, no authentication.

#### German UI
- All text, labels, validation messages, error toasts, placeholders, and headings are in German.
- Numbers formatted with `Intl.NumberFormat('de-DE')` (e.g. 1.234,56).
- Dates formatted with `Intl.DateTimeFormat('de-DE')` (e.g. 21.03.2026).

#### Mobile-First Layout
- 375 px viewport as primary breakpoint.
- All interactive touch targets ≥ 44 × 44 px.
- WCAG 2.1 AA colour contrast throughout.

#### Dashboard (`/`)
- Opens directly to Mustermann Elektro GmbH dashboard (seed data visible on first run).
- **Year selector** dropdown (2023, 2024, + "Neues Jahr anlegen") — switches all charts and KPIs to the selected year.
- **Scope 1/2/3 donut chart** (`ScopeDonut.tsx`): total CO₂e split by scope.
- **Per-category bar chart** (`CategoryBarChart.tsx`): bar chart within each scope showing CO₂e per category.
- **Year-over-year comparison chart** (`YearOverYearChart.tsx`): total CO₂e for all available reporting years.
- **Branchenvergleich card** (`BranchenvergleichCard.tsx`): company CO₂e per employee vs. Elektrohandwerk benchmark.
- **CO₂e per employee KPI** (`KpiCard.tsx`): total tonnes CO₂e divided by `mitarbeiter`.
- **Per-category completion indicator** (`CategoryStatusList.tsx`): shows ✓ (erfasst), ⚠ (Teilweise), or — (Nicht erfasst) for each emission category.
- **Collapsible AuditLogPanel** (`AuditLogPanel.tsx`): last 50 changes across all categories with download links to source documents.
- **Settings icon** in header linking to `/settings`.
- **"Bericht erstellen" button**: triggers PDF generation, adds report record to DB, shows download link.
- **Generated reports list**: lists all previously generated reports with download links.
- Dashboard load time < 2 seconds.

#### Data Entry Wizard (`/wizard/[screen]`)
Seven screens accessible via a side navigation panel (`WizardNav.tsx`) with progress bar. Each screen:
- Displays a **status badge** (Nicht erfasst / Teilweise / Erfasst).
- Has a **"Speichern" button** that explicitly triggers the save Server Action.
- Has an **upload button** (OCR stub) that calls `lib/ocr/index.ts extractFromFile()`.
- Has a **CSV import button** (CSV stub) that calls `lib/csv/index.ts importFromCsv()`.
- Shows `PlausibilityWarning` inline under numeric inputs when values are out of plausible range for a Handwerksbetrieb.
- Shows `ScreenChangeLog` (collapsible, last 5 audit entries for this screen's categories).
- Auto-saves on every field `onBlur` via Server Action.

##### Screen 1 — Firmenprofil
Fields: Firmenname (text), Branche (dropdown: ELEKTROHANDWERK | SHK | BAUGEWERBE | TISCHLER | KFZ_WERKSTATT | MALER | SONSTIGES), Mitarbeiter (integer), Standort (text), Logo (image upload — JPEG/PNG), Berichtsgrenzen-Notizen (textarea), Ausschlüsse (textarea).

##### Screen 2 — Scope 1 Heizung & Kältemittel
Fields: Erdgas (m³), Heizöl (L), Flüssiggas (kg), Kältemittel R410A (kg), Kältemittel R32 (kg), Kältemittel R134A (kg), Kältemittel Sonstige (kg).

##### Screen 3 — Scope 1 Fuhrpark
Fields: Diesel Fuhrpark (L), Benzin Fuhrpark (L), Fahrzeug-km table (rows: vehicle type [PKW Benzin / PKW Diesel / Transporter / LKW] + km input; rows can be added and removed).

##### Screen 4 — Scope 2 Strom & Fernwärme
Fields: Strom kWh (annual or monthly breakdown mode), Ökostrom-Flag (checkbox), optional monthly breakdown (12 monthly kWh inputs), provider name (text), Fernwärme (kWh).

##### Screen 5 — Scope 3 Dienstreisen & Pendler
Fields: Geschäftsreisen Flug (km), Geschäftsreisen Bahn (km), Pendlerverkehr (km per employee × number of employees).

##### Screen 6 — Scope 3 Materialien
Dynamic table: each row has category (MaterialCategory dropdown) + quantity kg + supplier name memo. Rows can be added and removed. Saves as `MaterialEntry` rows.

##### Screen 7 — Scope 3 Abfall
Fields: Restmüll (kg), Bauschutt (kg), Altmetall (kg — note: negative emission factor correctly reduces total), Sonstiges (kg).

#### Input Methods

**Manual Entry (fully implemented — primary path):**
- User types value into form field.
- On `onBlur`: field is validated (type check, range check), `PlausibilityWarning` shown if out of range (informational only — does not block save).
- Server Action `saveEntry` / `saveMaterialEntry` / `saveCompanyProfile` is called, performing UPSERT.
- `AuditLog` entry created with `inputMethod: MANUAL`.
- Dashboard KPIs and charts update on next load.
- Toast message in German on success ("Gespeichert ✓") or failure.

**OCR / PDF Upload (stub only):**
- User clicks upload button → file picker accepts PDF/image files (max 10 MB).
- `lib/ocr/index.ts extractFromFile(file, category)` is called — returns hardcoded values after a simulated 1–2 s delay.
- Yellow preview banner shown: "OCR-Vorschau: [value] [unit] ([confidence]% Konfidenz) — Bitte prüfen und bestätigen."
- Staging entry written to `StagingEntry` table (expires after 24 h).
- User confirms → `confirmStagingEntry` Server Action moves data from `StagingEntry` to `EmissionEntry` with `inputMethod: OCR`.
- User can reject and enter manually instead.
- `AuditLog` entry created with `inputMethod: OCR` and `documentId` linking to stored `UploadedDocument`.

**CSV Import (stub only):**
- User clicks CSV import button → file picker accepts `.csv` / `.xlsx` files (max 10 MB).
- `lib/csv/index.ts importFromCsv()` called — returns hardcoded preview values.
- Column mapping UI shown (`CsvImport.tsx`): user maps CSV headers to emission categories.
- Same hardcoded values pre-fill the wizard fields.
- Toast message in German confirming import.
- Data saved with `inputMethod: CSV`.

#### CO₂e Calculation Engine (`lib/emissions.ts` and `lib/factors.ts`)
- All calculations centralised in `lib/emissions.ts` — no calculation logic in UI components or API routes.
- `calculateCO2e(category, quantity, year, options?)` → returns kg CO₂e.
- `lookupFactor(key, year, options?)` → queries `EmissionFactor` table: `WHERE key = $key AND validYear <= $year ORDER BY validYear DESC LIMIT 1`. Forward fallback applies when no factor exists at or before the year.
- Special case: `STROM` category uses `STROM_OEKOSTROM` factor key when `isOekostrom = true`.
- Kältemittel GWPs (Scope 1 direct): R410A = 2088 kg CO₂e/kg, R32 = 675 kg CO₂e/kg, R134A = 1430 kg CO₂e/kg.
- Altmetall has a **negative** emission factor (correctly reduces total CO₂e).
- All quantities stored as entered (m³, L, kg, kWh, km); engine always produces kg CO₂e; dashboard divides by 1000 to display tonnes CO₂e.
- If both litres and km are entered for the same vehicle type, both calculate independently and are summed (no double-counting warning).

#### Emission Factors (UBA 2024, loaded from DB — never hardcoded)
All emission factors seeded into `EmissionFactor` table at first container start. `valid_year = 2024` for all seeded factors. New year factors added as additional rows (existing calculations unaffected).

#### Audit Trail
Every `saveEntry`, `deleteEntry`, `saveMaterialEntry`, and `saveCompanyProfile` Server Action creates an immutable `AuditLog` row with:
- `entityType` ("EmissionEntry", "MaterialEntry", "CompanyProfile")
- `entityId`
- `action` (CREATE / UPDATE / DELETE)
- `fieldName`, `oldValue`, `newValue` (field-level change tracking)
- `inputMethod` (MANUAL / OCR / CSV)
- `documentId` (optional link to `UploadedDocument`)

#### Reports & Exports
- **GHG Protocol PDF** (`POST /api/report`): generated by React-PDF (`@react-pdf/renderer`) on Node.js runtime (never Edge). Sections: company header (logo, name, location, year), profile summary, executive summary, Scope 1/2/3 tables with UBA 2024 factor citations, Berichtsgrenzen section (from `CompanyProfile.reportingBoundaryNotes` and `exclusions`), data quality section (lists all `EmissionCategory` values as "erfasst (gemessen)"/"erfasst (geschätzt)"/"nicht erfasst"), methodology, footnotes for uncaptured categories. Generates in < 3 seconds. Report record saved to `Report` table with `filePath`. Download link shown on dashboard.
- **CSRD supplier questionnaire PDF** (`POST /api/report` with type = CSRD_QUESTIONNAIRE): separate React-PDF document.
- **Sustainability badge** (`GET /api/badge`): returns PNG, SVG, and HTML embed snippet showing company CO₂e total and year.

#### Settings Page (`/settings`)
- Accessible via Settings icon in dashboard header.
- **Year management** (`YearManagement.tsx`): add next reporting year (creates `ReportingYear` row); delete an existing year (cascades to all `EmissionEntry`, `MaterialEntry`, `StagingEntry`, and `Report` rows for that year — with confirmation dialog in German).

#### API Routes
All routes return JSON errors with German-language messages where applicable:
- `POST /api/ocr` — proxy to Tesseract (or stub) and upsert `StagingEntry`.
- `POST /api/csv` — parse file server-side, return headers + first 5 rows.
- `POST /api/report` — generate PDF and return file download.
- `GET /api/badge` — return badge assets.
- `GET/POST/PUT/DELETE /api/entries` — CRUD for `EmissionEntry`.
- `GET /api/audit` — query audit log (paginated).
- `GET /api/documents/[id]` — download `UploadedDocument` bytes.
- `GET/POST /api/field-documents` — per-field `FieldDocument` attachments.

#### Error Handling
- Server Actions return `{ success: false, error: string }` — never throw. Toast shown in German.
- API routes return HTTP 4xx/5xx with `{ error: string }` JSON body.
- OCR failures return `{ quantity: null, confidence: 0, error: "OCR fehlgeschlagen" }` — field stays empty, user enters manually.
- CSV parse errors return column preview with error rows highlighted.
- PDF generation errors: toast "PDF-Erstellung fehlgeschlagen. Bitte erneut versuchen."
- DB connection errors: Next.js error boundary; German error page.

#### Unit Tests
- `lib/emissions.ts` and `lib/factors.ts` covered by unit tests at ≥ 80% line coverage.
- Tests run in the PR Validation workflow (`npm test`).

#### File Upload Security
- MIME type and file size validated server-side before sending to Tesseract or parsing as CSV.
- Maximum upload size: 10 MB.
- CSV cell values always treated as numbers (parseFloat) — no formula injection.
- `DATABASE_URL` and `TESSERACT_URL` are server-only environment variables; never exposed to the browser.

### Out of Scope

- **Authentication / login / sessions** — the app is single-tenant and opens directly to the dashboard. No auth is ever added in this feature.
- **Multi-tenancy** — one installation serves one company.
- **Real OCR implementation** — `lib/ocr/index.ts` is a stub returning hardcoded values. The Tesseract container is present and running but the Next.js code does not make real HTTP calls to it.
- **Real CSV parsing** — `lib/csv/index.ts` is a stub returning hardcoded values. No actual file parsing logic is implemented.
- **External cloud services** — no Supabase, no Stripe, no external APIs of any kind.
- **Automated emission factor updates** — factors are seeded once; no admin UI for factor management.
- **Horizontal scaling** — single container; supervisord in container is acceptable.
- **UBA 2025 factors** — only 2024 factors are seeded; 2025 factors are deferred.
- **Multi-language support** — the app is German-only; no i18n framework.

---

## User Experience

### Opening the App
User navigates to `http://localhost:3000` — the dashboard loads immediately showing Mustermann Elektro GmbH's 2024 data with all charts populated from seed data.

### Adding a New Reporting Year
User clicks the year selector dropdown → selects "+ Neues Jahr anlegen" → a new `ReportingYear` is created → dashboard shows all categories as "Nicht erfasst".

### Completing a Wizard Screen (Manual Entry)
1. User clicks a screen in the side navigation (e.g., "Heizung & Gebäude").
2. Wizard screen loads with any previously saved values pre-filled.
3. User types values into fields.
4. On leaving each field (`onBlur`) the value is saved automatically (toast: "Gespeichert ✓" on success).
5. If a value is out of plausible range, an amber `PlausibilityWarning` appears below the field.
6. User clicks "Speichern" or "Weiter" to explicitly save and optionally advance.
7. `ScreenChangeLog` at the bottom shows the last 5 audit entries for this screen's categories.

### OCR Upload Flow (Stub)
1. User clicks the upload button next to a field.
2. File picker opens (PDF/image accepted, max 10 MB).
3. Spinner shown for 1–2 seconds.
4. Yellow preview banner appears: "OCR-Vorschau: 4.200 m³ (89% Konfidenz) — Bitte prüfen und bestätigen."
5. User clicks "Bestätigen" → value moves to `EmissionEntry` with `inputMethod: OCR`.
6. Or user dismisses banner and enters value manually.

### CSV Import Flow (Stub)
1. User clicks the CSV import button.
2. File picker opens (`.csv` / `.xlsx` accepted, max 10 MB).
3. Column mapping UI shown (`CsvImport.tsx`): headers listed, user maps each to an emission category.
4. Hardcoded values pre-fill the wizard fields.
5. Toast: "CSV-Import erfolgreich. Bitte Werte prüfen und bestätigen."

### Generating a Report
1. User clicks "Bericht erstellen" on the dashboard.
2. PDF generated in < 3 seconds.
3. Report record saved to DB; download link appears in the "Berichte" section.
4. Categories with no data show "nicht erfasst" in the PDF data quality section.

### Settings
1. User clicks the Settings icon in the dashboard header.
2. `/settings` page shows year management: list of existing years with delete buttons, and an "Neues Jahr hinzufügen" button.
3. Delete shows a German confirmation dialog before cascading deletion.

---

## Success Criteria

### Deployment
- [ ] `docker compose up` succeeds from a clean checkout with no additional steps.
- [ ] App is accessible at `http://localhost:3000` within 30 seconds of container start.
- [ ] Mustermann Elektro GmbH data is visible on the dashboard on first run (seed data present).
- [ ] Data written to DB persists after `docker compose restart`.

### Dashboard
- [ ] Dashboard displays Scope 1/2/3 donut chart with correct CO₂e totals for seed data.
- [ ] Per-category bar chart renders within each scope.
- [ ] Year-over-year comparison chart shows 2023 and 2024 data.
- [ ] Branchenvergleich card shows company vs. Elektrohandwerk benchmark.
- [ ] CO₂e per employee KPI is displayed (total CO₂e ÷ mitarbeiter).
- [ ] Dashboard loads in < 2 seconds.
- [ ] Year selector switches all charts to the selected year.
- [ ] "+ Neues Jahr anlegen" creates a new reporting year and shows empty dashboard.
- [ ] AuditLogPanel shows last 50 changes (collapsible).
- [ ] Settings icon navigates to `/settings`.

### Wizard
- [ ] All 7 wizard screens are accessible via side navigation.
- [ ] Each screen shows a status badge (Nicht erfasst / Teilweise / Erfasst).
- [ ] Previously saved values are pre-filled when revisiting a screen.
- [ ] Field `onBlur` triggers auto-save and shows German success toast.
- [ ] "Speichern" button explicitly saves the current screen.
- [ ] `PlausibilityWarning` appears for out-of-range values (does not block save).
- [ ] `ScreenChangeLog` shows last 5 audit entries for the screen's categories.
- [ ] Screen 1 saves to `CompanyProfile` (all 7 fields including logo upload).
- [ ] Screen 2 saves Erdgas, Heizöl, Flüssiggas, and all 4 refrigerant types.
- [ ] Screen 3 saves Diesel, Benzin, and vehicle-km table (add/remove rows).
- [ ] Screen 4 saves Strom (annual + optional monthly breakdown), Ökostrom-Flag, provider name, Fernwärme.
- [ ] Screen 5 saves Flug km, Bahn km, Pendlerverkehr.
- [ ] Screen 6 saves MaterialEntry rows with supplier memo (add/remove rows).
- [ ] Screen 7 saves Restmüll, Bauschutt, Altmetall, Sonstiges.

### Input Methods
- [ ] Manual entry saves to `EmissionEntry` with `inputMethod: MANUAL` and creates `AuditLog` row.
- [ ] OCR upload button shows spinner 1–2 s, then yellow preview banner with hardcoded value.
- [ ] User confirms OCR preview → value moves to `EmissionEntry` with `inputMethod: OCR`.
- [ ] CSV import button shows column mapping UI, pre-fills hardcoded values.
- [ ] Per-field `FieldDocumentZone` allows attaching invoice/receipt documents.

### Calculations
- [ ] CO₂e for Erdgas 1000 m³ = 2000 kg (UBA factor 2.000 kg/m³).
- [ ] Altmetall emission factor is negative (reduces total CO₂e).
- [ ] R410A GWP = 2088, R32 = 675, R134A = 1430 (verified via unit tests or seed data).
- [ ] Ökostrom flag switches factor from `STROM_MIX` to `STROM_OEKOSTROM`.
- [ ] Total CO₂e = sum of all `EmissionEntry` + `MaterialEntry` CO₂e for the year.
- [ ] Calculations use `EmissionFactor` from DB — no hardcoded factor values in TypeScript.

### Reports
- [ ] "Bericht erstellen" generates PDF in < 3 seconds.
- [ ] PDF includes company header (logo, name, location, year).
- [ ] PDF includes executive summary and Scope 1/2/3 tables with UBA 2024 factor citations.
- [ ] PDF includes Berichtsgrenzen section from `CompanyProfile.reportingBoundaryNotes` and `exclusions`.
- [ ] PDF data quality section lists missing categories as "nicht erfasst".
- [ ] CSRD supplier questionnaire PDF is generated and downloadable.
- [ ] Sustainability badge returns PNG, SVG, and HTML embed snippet.
- [ ] Generated reports are listed on the dashboard with download links.

### Audit Trail
- [ ] Every save/delete/update creates an `AuditLog` row with `entityType`, `action`, `fieldName`, `oldValue`, `newValue`, `inputMethod`.
- [ ] OCR/CSV saves include `documentId` linking to `UploadedDocument`.
- [ ] AuditLogPanel on dashboard shows the 50 most recent entries.
- [ ] ScreenChangeLog on each wizard screen shows last 5 entries for that screen's categories.

### Settings
- [ ] `/settings` page is accessible from dashboard header.
- [ ] New reporting year can be added.
- [ ] Existing year can be deleted (with German confirmation dialog), cascading to all related data.

### Unit Tests
- [ ] `lib/emissions.ts` unit test coverage ≥ 80%.
- [ ] `lib/factors.ts` unit test coverage ≥ 80%.
- [ ] All unit tests pass in the PR Validation workflow.

### Non-Functional
- [ ] All UI text is in German (labels, toasts, validation messages, error pages, placeholders).
- [ ] Numbers use German locale format (1.234,56).
- [ ] Dates use German locale format (21.03.2026).
- [ ] Mobile-first layout at 375 px viewport.
- [ ] All touch targets ≥ 44 × 44 px.
- [ ] WCAG 2.1 AA colour contrast.
- [ ] TypeScript strict mode — no type errors.
- [ ] No ESLint warnings or errors.
- [ ] `next build` completes with no deprecation warnings.
- [ ] Files ≤ 300 lines; refactored at that limit.

---

## Technical Constraints

All technical decisions are fixed by `docs/architecture.md`. The following is a summary of binding constraints (see architecture doc for rationale via ADRs):

| Constraint | Detail |
|---|---|
| Framework | Next.js 14, App Router, TypeScript strict mode |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Prisma (schema-first, migrations in repo, no raw SQL) |
| PDF generation | `@react-pdf/renderer` on Node.js runtime — never Edge, never Puppeteer |
| Deployment | Exactly 2 Docker Compose services: `app` + `tesseract` |
| Container topology | `app` = Next.js 14 + PostgreSQL 15 in one container, managed by supervisord |
| OCR service | Tesseract container (port 3001), REST API `POST /extract` |
| No external services | No Supabase, no Stripe, no cloud APIs |
| Data persistence | PostgreSQL volume `gruenbilanz_pgdata` |
| Emission factors | Loaded from DB (`EmissionFactor` table, versioned by `valid_year`) — never hardcoded in TS |
| CSV parsing | Server-side only (ADR-004) |
| OCR staging | `StagingEntry` table before user confirmation (ADR-003) |
| Audit | Immutable `AuditLog` rows for every data-changing action |
| No auth | Single-tenant; no login (by design) |
| German UI | All strings hardcoded in German; no i18n framework |
| Named exports | Except Next.js page/layout conventions |
| File length | ≤ 200–300 lines per file |
| Commit style | Conventional Commits |

---

## Architecture Decisions Referenced

All ADRs are fully documented in `docs/architecture.md` §9:

| ADR | Decision |
|---|---|
| ADR-001 | Combined container (Next.js + PostgreSQL) with supervisord — exactly 2 services |
| ADR-002 | Unified `EmissionEntry` table (Scope 1/2/3 activities) + separate `MaterialEntry` (Scope 3 Cat.1) |
| ADR-003 | `StagingEntry` staging table for OCR/CSV before user confirmation |
| ADR-004 | Server-side CSV parsing via API route |
| ADR-005 | React-PDF (`@react-pdf/renderer`) for PDF generation |
| ADR-006 | `valid_year` integer versioning for emission factors |

---

## File Structure

The complete file structure to be implemented is defined in `docs/architecture.md` §5.1. Key paths:

```
src/
├── app/
│   ├── page.tsx                    # Dashboard (root)
│   ├── layout.tsx                  # Root layout (German locale)
│   ├── settings/page.tsx           # Year management
│   ├── wizard/[screen]/page.tsx    # Wizard screens 1–7
│   ├── wizard/layout.tsx           # Wizard shell
│   └── api/
│       ├── ocr/route.ts
│       ├── csv/route.ts
│       ├── report/route.ts
│       ├── badge/route.ts
│       ├── entries/route.ts
│       ├── audit/route.ts
│       ├── documents/[id]/route.ts
│       └── field-documents/route.ts
├── components/
│   ├── dashboard/                  # KpiCard, ScopeDonut, CategoryBarChart,
│   │                               # YearOverYearChart, BranchenvergleichCard,
│   │                               # CategoryStatusList, YearSelector, AuditLogPanel
│   ├── wizard/                     # WizardNav, UploadOCR, CsvImport,
│   │                               # FieldDocumentZone, PlausibilityWarning,
│   │                               # ScreenChangeLog, screens/Screen1–7
│   ├── reports/                    # GHGReport.tsx, CSRDQuestionnaire.tsx
│   ├── settings/YearManagement.tsx
│   └── ui/                         # shadcn/ui re-exports
├── lib/
│   ├── prisma.ts
│   ├── actions.ts                  # Server Actions
│   ├── emissions.ts                # CO₂e calculation engine
│   ├── factors.ts                  # Factor lookup
│   ├── ocr/index.ts                # OCR stub
│   ├── csv/index.ts                # CSV stub
│   ├── pdf.ts                      # React-PDF render helper
│   └── utils.ts
└── types/index.ts
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
docker/
├── init.sql                        # Schema + all seed data
├── supervisord.conf
├── healthcheck.sh
└── tesseract/
    ├── Dockerfile
    └── server.js
Dockerfile                          # Multi-stage: deps → builder → runner
docker-compose.yml
.env.example
README.md
```

---

## Seed Data

On first container start, `docker/init.sql` seeds:

- **CompanyProfile**: Mustermann Elektro GmbH, Branche = ELEKTROHANDWERK, Mitarbeiter = 12, Standort = München Bayern.
- **ReportingYear**: 2023 and 2024.
- **EmissionEntry**: A representative set of values for both 2023 and 2024 covering all emission categories.
- **MaterialEntry**: Representative rows for Kupfer, Stahl, Aluminium, etc. for both years.
- **EmissionFactor**: All UBA 2024 factors for all `EmissionCategory` and `MaterialCategory` enum values (keyed by enum name, `valid_year = 2024`).
- **IndustryBenchmark**: One row per `Branche` enum value with a representative `co2ePerEmployeePerYear` figure.

---

## Open Questions

None — all requirements are drawn directly from `docs/architecture.md` (arc42 v1.1) which is the single source of truth. No open questions remain for the Architect; the architecture document already contains all design decisions.

---

## Related Documents

- `docs/architecture.md` — arc42 architecture documentation (single source of truth)
- `docs/conventions.md` — coding standards
- `docs/testing-strategy.md` — testing approach
- `docs/agents.md` — agent workflow overview
