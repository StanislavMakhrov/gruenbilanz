# Architecture: GrünBilanz Full Application Build

**Feature ID:** 001  
**Status:** Approved — No new ADRs required  
**Architecture Reference:** `docs/architecture.md` (arc42 v1.1 — single source of truth)  
**Date:** 2026-03-24

---

## Status

All architectural decisions for this feature are already captured in `docs/architecture.md` §9
(ADR-001 through ADR-006). No new architecture decisions are required.

This document provides the **feature-level implementation guide**: it maps the specification to
concrete components, documents data flows per wizard screen, details the CO₂e calculation
pipeline, and gives the Developer a clear picture of how each piece of the full application
connects.

---

## 1. Alignment with Existing Architecture

| Spec Requirement | Architecture.md Decision | Status |
|---|---|---|
| Two Docker Compose services (`app` + `tesseract`) | ADR-001: combined app container with supervisord | ✅ Fully resolved |
| `EmissionEntry` + `MaterialEntry` tables | ADR-002: unified + hybrid schema | ✅ Fully resolved |
| OCR staging before user confirmation | ADR-003: `StagingEntry` table | ✅ Fully resolved |
| Server-side CSV parsing | ADR-004: API route `/api/csv` | ✅ Fully resolved |
| PDF generation via `@react-pdf/renderer` | ADR-005: React-PDF on Node.js runtime | ✅ Fully resolved |
| Emission factors versioned in DB | ADR-006: `valid_year` integer versioning | ✅ Fully resolved |

**No gaps or conflicts** were found between the specification and `docs/architecture.md`.

---

## 2. Component Breakdown

The file tree below mirrors `docs/architecture.md §5.1` exactly. It is reproduced here as an
**implementation checklist** — the Developer creates each file in this order.

### 2.1 Infrastructure & Configuration

```
Dockerfile                          # Multi-stage: deps → builder → runner (see §6.1)
docker-compose.yml                  # Two services: app (port 3000) + tesseract (port 3001)
.env.example                        # DATABASE_URL, TESSERACT_URL, NODE_ENV, REPORTS_PATH
docker/
├── supervisord.conf                # postgres (priority 10) → nextjs-starter (priority 20)
├── healthcheck.sh                  # pg_isready → prisma migrate deploy → node server.js
├── init.sql                        # Schema bootstrap + full seed data (run once on first start)
└── tesseract/
    ├── Dockerfile                  # node:20-alpine + tesseract-ocr + tesseract-ocr-data-deu
    └── server.js                   # Express POST /extract → tesseract CLI → { text, confidence }
README.md                           # Prerequisites → docker compose up → done (max 3 steps)
```

### 2.2 Database Schema

```
prisma/
├── schema.prisma                   # Exact schema from docs/architecture.md §5.2
└── migrations/
    └── 0001_initial/migration.sql  # First (and only) migration for fresh init
```

**Key schema constraints to honour:**
- `EmissionEntry @@unique([reportingYearId, scope, category, billingMonth, providerName])` — both `billingMonth` and `providerName` are nullable; PostgreSQL treats NULLs as distinct in unique constraints, so annual entries (`billingMonth = NULL`) are correctly unique per `(year, scope, category)`.
- `StagingEntry @@unique([reportingYearId, scope, category])` — only one pending OCR/CSV value per category at a time.
- `FieldDocument @@unique([fieldKey, year])` — one attachment per field per year (not per upload).
- `EmissionFactor @@unique([key, validYear])`.
- `CompanyProfile id = 1` always — single row, seeded in `init.sql`.

### 2.3 Application Pages (Next.js App Router)

```
src/app/
├── layout.tsx                      # Root layout: German locale (lang="de"), font, global styles
├── page.tsx                        # Dashboard (Server Component — see §3.1)
├── settings/
│   └── page.tsx                    # Year management (Server Component shell + YearManagement Client)
├── wizard/
│   ├── layout.tsx                  # Wizard shell: WizardNav (side nav) + progress bar
│   └── [screen]/
│       └── page.tsx                # Wizard screens 1–7 routed by screen param
└── api/
    ├── ocr/route.ts                # POST /api/ocr — MIME check → OCR stub → StagingEntry UPSERT
    ├── csv/route.ts                # POST /api/csv — MIME check → CSV stub → headers + 5 rows
    ├── report/route.ts             # POST /api/report — fetch data → renderToBuffer → save → stream
    ├── badge/route.ts              # GET /api/badge — query total CO₂e → render PNG/SVG/HTML
    ├── entries/route.ts            # GET/POST/PUT/DELETE /api/entries — EmissionEntry CRUD
    ├── audit/route.ts              # GET /api/audit — paginated AuditLog query
    ├── documents/
    │   └── [id]/route.ts           # GET /api/documents/[id] — stream UploadedDocument bytes
    └── field-documents/
        └── route.ts                # GET/POST /api/field-documents — FieldDocument CRUD
```

**Important:** `POST /api/report` and `GET /api/badge` must export `export const runtime = 'nodejs'`
to prevent Next.js from using the Edge runtime. React-PDF requires the full Node.js environment.

### 2.4 React Components

#### Dashboard Components (`src/components/dashboard/`)

| Component | Type | Responsibility |
|---|---|---|
| `KpiCard.tsx` | Client | Total CO₂e (t), per-employee CO₂e (t/MA), YoY delta badge |
| `ScopeDonut.tsx` | Client | Recharts `PieChart` showing Scope 1 / 2 / 3 shares |
| `CategoryBarChart.tsx` | Client | Recharts `BarChart` — CO₂e per category within a scope |
| `YearOverYearChart.tsx` | Client | Recharts `BarChart` — total CO₂e across all reporting years |
| `BranchenvergleichCard.tsx` | Client | Company t CO₂e/MA vs `IndustryBenchmark.co2ePerEmployeePerYear` |
| `CategoryStatusList.tsx` | Server | Per-category completion badge (Erfasst ✓ / Teilweise ⚠ / Nicht erfasst —) |
| `YearSelector.tsx` | Client | Dropdown: existing years + "+ Neues Jahr anlegen" (navigates on change) |
| `AuditLogPanel.tsx` | Client | Collapsible table — last 50 `AuditLog` rows; download links to documents |

All chart components are Client Components (`"use client"`) because Recharts requires browser APIs.
`CategoryStatusList` and dashboard data aggregation happen in the Server Component (`app/page.tsx`).

#### Wizard Components (`src/components/wizard/`)

| Component | Type | Responsibility |
|---|---|---|
| `WizardNav.tsx` | Client | Side nav: 7 screen links with status badges; progress bar (0–7 complete) |
| `UploadOCR.tsx` | Client | File input → POST /api/ocr → spinner → yellow preview banner → confirm/reject |
| `CsvImport.tsx` | Client | File input → POST /api/csv → column mapping table → "Übernehmen" → pre-fill |
| `FieldDocumentZone.tsx` | Client | Green dashed zone per field; POST /api/field-documents; shows attached filename |
| `PlausibilityWarning.tsx` | Client | Amber inline banner when value is outside plausibility range for a Handwerksbetrieb |
| `ScreenChangeLog.tsx` | Client | Collapsible — last 5 `AuditLog` entries for this screen's `EmissionCategory` set |

##### Screen Components (`src/components/wizard/screens/`)

| File | Screen | Categories Saved |
|---|---|---|
| `Screen1Firmenprofil.tsx` | 1 — Firmenprofil | `CompanyProfile` (all fields incl. logo) |
| `Screen2Heizung.tsx` | 2 — Scope 1 Heizung & Kältemittel | ERDGAS, HEIZOEL, FLUESSIGGAS, R410A_KAELTEMITTEL, R32_KAELTEMITTEL, R134A_KAELTEMITTEL, SONSTIGE_KAELTEMITTEL |
| `Screen3Fuhrpark.tsx` | 3 — Scope 1 Fuhrpark | DIESEL_FUHRPARK, BENZIN_FUHRPARK; vehicle-km table → PKW_BENZIN_KM, PKW_DIESEL_KM, TRANSPORTER_KM, LKW_KM |
| `Screen4Strom.tsx` | 4 — Scope 2 Strom & Fernwärme | STROM (annual or monthly rows), FERNWAERME |
| `Screen5Dienstreisen.tsx` | 5 — Scope 3 Dienstreisen & Pendler | GESCHAEFTSREISEN_FLUG, GESCHAEFTSREISEN_BAHN, PENDLERVERKEHR |
| `Screen6Materialien.tsx` | 6 — Scope 3 Materialien | `MaterialEntry` rows (dynamic table) |
| `Screen7Abfall.tsx` | 7 — Scope 3 Abfall | ABFALL_RESTMUELL, ABFALL_BAUSCHUTT, ABFALL_ALTMETALL, ABFALL_SONSTIGES |

Each screen component receives pre-fetched values from its parent `[screen]/page.tsx` (Server Component)
and invokes Server Actions (`lib/actions.ts`) for saves.

#### PDF Report Components (`src/components/reports/`)

| Component | Output |
|---|---|
| `GHGReport.tsx` | GHG Protocol PDF — header, executive summary, Scope 1/2/3 tables, Berichtsgrenzen, data quality section, methodology, footnotes |
| `CSRDQuestionnaire.tsx` | CSRD supplier questionnaire PDF — structured questionnaire based on company profile and emission totals |

Both are pure React-PDF components (no `"use client"` — never rendered in browser).

#### Settings Components (`src/components/settings/`)

| Component | Type | Responsibility |
|---|---|---|
| `YearManagement.tsx` | Client | Add next year (POST → create `ReportingYear`); delete year with German confirm dialog (cascading delete) |

#### Shared UI (`src/components/ui/`)

Shadcn/ui re-exports: `Button`, `Card`, `Dialog`, `Input`, `Label`, `Select`, `Textarea`, `Toast`,
`Toaster`, `Badge`, `Separator`, `Progress`. Install and configure via `npx shadcn-ui@latest add`.

### 2.5 Library Modules (`src/lib/`)

| Module | Responsibility |
|---|---|
| `prisma.ts` | Prisma client singleton (`globalThis.__prisma` pattern to prevent hot-reload leaks) |
| `actions.ts` | All Server Actions: `saveEntry`, `deleteEntry`, `saveMaterialEntry`, `saveCompanyProfile`, `confirmStagingEntry`, `confirmAllStaging`, `createReportingYear`, `deleteReportingYear` |
| `emissions.ts` | `calculateCO2e(category, quantity, year, options?)` → kg CO₂e |
| `factors.ts` | `lookupFactor(key, year, options?)` → `EmissionFactor` (DB query) |
| `ocr/index.ts` | `extractFromFile(file, category)` → `{ value, unit, confidence }` (stub) |
| `csv/index.ts` | `importFromCsv(file)` → `{ headers, rows }` (stub) |
| `pdf.ts` | `renderReport(type, data)` → `Buffer` (calls `@react-pdf/renderer renderToBuffer`) |
| `utils.ts` | German number/date formatters, `cn()` Tailwind class merger, plausibility range constants |

### 2.6 Types (`src/types/index.ts`)

Shared TypeScript types used across components and lib:

```typescript
// Screen-to-categories mapping (used by WizardNav status badges and ScreenChangeLog)
export const SCREEN_CATEGORIES: Record<number, EmissionCategory[]>

// Human-readable German labels for EmissionCategory enum values
export const CATEGORY_LABELS: Record<EmissionCategory, string>

// Human-readable German labels for MaterialCategory enum values
export const MATERIAL_LABELS: Record<MaterialCategory, string>

// Plausibility ranges per field key (used by PlausibilityWarning)
export const PLAUSIBILITY_RANGES: Record<string, { min: number; max: number; unit: string }>

// Re-export Prisma-generated types for convenience
export type { CompanyProfile, EmissionEntry, MaterialEntry, EmissionFactor,
              ReportingYear, AuditLog, UploadedDocument } from '@prisma/client'
```

---

## 3. Data Flow — Wizard Screens

### 3.1 Dashboard Load Flow

```
Browser GET /
  └─> app/page.tsx (Server Component)
        ├─> prisma.reportingYear.findMany()           → all years (YearSelector)
        ├─> prisma.emissionEntry.groupBy(scope)       → CO₂e per scope (ScopeDonut)
        ├─> prisma.emissionEntry.findMany() +
        │   lib/emissions.calculateCO2e() per entry   → CO₂e per category (CategoryBarChart)
        ├─> same aggregation for all years             → YoY data (YearOverYearChart)
        ├─> prisma.industryBenchmark.findUnique()      → benchmark (BranchenvergleichCard)
        ├─> prisma.companyProfile.findUnique(1)        → mitarbeiter (KpiCard)
        ├─> prisma.emissionEntry.findMany(year)        → per-category status (CategoryStatusList)
        ├─> prisma.auditLog.findMany(take: 50)         → recent changes (AuditLogPanel)
        └─> prisma.report.findMany(year)               → generated reports list
```

All queries run in parallel using `Promise.all()` where dependencies allow.
Data is passed as props to Client Components — no client-side fetching on dashboard.

### 3.2 Wizard Screen Load Flow (All Screens)

```
Browser GET /wizard/[screen]
  └─> app/wizard/[screen]/page.tsx (Server Component)
        ├─> params.screen → determine which screen (1–7)
        ├─> searchParams.year → active reporting year
        ├─> Fetch existing EmissionEntry rows for this screen's categories
        │   (or CompanyProfile for Screen 1, MaterialEntry rows for Screen 6)
        ├─> Fetch last 5 AuditLog entries for this screen's categories (ScreenChangeLog)
        └─> Render screen component with pre-fetched data as defaultValues
```

### 3.3 Screen 1 — Firmenprofil Data Flow

```
User input (7 fields + logo upload)
  └─> onBlur on each field
        └─> Server Action: saveCompanyProfile({ firmenname, branche, mitarbeiter, ... })
              ├─> prisma.companyProfile.upsert({ where: { id: 1 }, ... })
              ├─> Logo: validate MIME (image/jpeg | image/png) + size ≤ 10 MB
              │   → store base64 or path in companyProfile.logoPath
              └─> prisma.auditLog.create({ entityType: "CompanyProfile", action: UPDATE, ... })
```

**Note:** `CompanyProfile` is always `id = 1`. The `upsert` uses `where: { id: 1 }` with a
create fallback (though the seed always creates it first).

### 3.4 Screen 2 — Heizung & Kältemittel Data Flow

```
7 numeric inputs (Erdgas m³, Heizöl L, Flüssiggas kg, R410A kg, R32 kg, R134A kg, Sonstige kg)
  └─> onBlur on each field
        └─> Server Action: saveEntry({
              reportingYearId, scope: SCOPE1,
              category: ERDGAS | HEIZOEL | FLUESSIGGAS | R410A_KAELTEMITTEL | ...,
              quantity: number, inputMethod: MANUAL
            })
              ├─> prisma.emissionEntry.upsert({
              │     where: { reportingYearId_scope_category_billingMonth_providerName: {
              │       reportingYearId, scope, category, billingMonth: null, providerName: null
              │     }},
              │     update: { quantity, updatedAt: now },
              │     create: { reportingYearId, scope, category, quantity, inputMethod: MANUAL }
              │   })
              └─> prisma.auditLog.create({ entityType: "EmissionEntry", action: CREATE|UPDATE, ... })
```

**OCR path (Screen 2 Erdgas example):**
```
User uploads gas bill PDF
  └─> POST /api/ocr { file, category: "ERDGAS", year }
        ├─> Validate MIME (application/pdf | image/*), size ≤ 10 MB
        ├─> lib/ocr/index.ts extractFromFile(file, "ERDGAS")
        │   → stub: { value: 4200, unit: "m³", confidence: 0.89 } (1–2s simulated delay)
        ├─> prisma.stagingEntry.upsert({
        │     where: { reportingYearId_scope_category },
        │     data: { quantity: 4200, confidence: 0.89, source: OCR, expiresAt: now+24h }
        │   })
        └─> return { quantity: 4200, confidence: 0.89 }
              └─> UI shows yellow banner: "OCR-Vorschau: 4.200 m³ (89% Konfidenz)"
                    └─> User clicks "Bestätigen"
                          └─> Server Action: confirmStagingEntry({ stagingId, inputMethod: OCR })
                                ├─> prisma.stagingEntry.delete({ where: { id: stagingId } })
                                ├─> prisma.emissionEntry.upsert({ ... quantity: 4200, inputMethod: OCR })
                                └─> prisma.auditLog.create({ inputMethod: OCR, documentId: ... })
```

### 3.5 Screen 3 — Fuhrpark Data Flow

```
Static fields: Diesel (L) + Benzin (L) → same UPSERT pattern as Screen 2

Dynamic vehicle-km table:
  Each row = { vehicleType: PKW_BENZIN_KM | PKW_DIESEL_KM | TRANSPORTER_KM | LKW_KM, km: number }
  
  Add row:
    └─> Server Action: saveEntry({ scope: SCOPE1, category: vehicleType, quantity: km })
          └─> UPSERT as annual entry (billingMonth: null, providerName: null)

  Remove row:
    └─> Server Action: deleteEntry({ id: entryId })
          ├─> prisma.emissionEntry.delete({ where: { id } })
          └─> prisma.auditLog.create({ action: DELETE, oldValue: previousQuantity })
```

**Note:** If a user enters both Diesel litres (DIESEL_FUHRPARK) and PKW_DIESEL_KM, both entries
exist independently. `calculateCO2e` is called on each separately; dashboard sums them — this
is correct per spec (no double-counting warning).

### 3.6 Screen 4 — Strom & Fernwärme Data Flow

This is the most complex screen due to annual/monthly mode and Ökostrom:

```
Annual mode (default):
  Single kWh input + Ökostrom checkbox + provider name
  └─> saveEntry({
        scope: SCOPE2, category: STROM,
        quantity: kWh, isOekostrom: boolean,
        providerName: string | null,
        billingMonth: null, isFinalAnnual: true
      })

Monthly mode (user toggles "Monatsweise erfassen"):
  12 monthly kWh inputs (billingMonth: 1–12)
  └─> saveEntry({ ..., billingMonth: 1–12, isFinalAnnual: false }) for each month
  Note: monthly entries do NOT use isFinalAnnual; annual entry uses isFinalAnnual: true to supersede

Fernwärme:
  └─> saveEntry({ scope: SCOPE2, category: FERNWAERME, quantity: kWh })
```

**Factor selection in `lookupFactor`:**
- When `isOekostrom = false` → key = `"STROM_MIX"` → uses grid-mix factor (~0.380 kg CO₂e/kWh)
- When `isOekostrom = true` → key = `"STROM_OEKOSTROM"` → uses green electricity factor (~0.025 kg CO₂e/kWh)

**Monthly aggregation for dashboard:**
When `isFinalAnnual = true`, that single entry's quantity is used. When no annual entry exists,
sum all `billingMonth != null` entries for the year.

### 3.7 Screen 5 — Dienstreisen & Pendler Data Flow

```
Three numeric inputs:
  Flug (km):      saveEntry({ scope: SCOPE3, category: GESCHAEFTSREISEN_FLUG, quantity: km })
  Bahn (km):      saveEntry({ scope: SCOPE3, category: GESCHAEFTSREISEN_BAHN, quantity: km })
  Pendler (km):   saveEntry({ scope: SCOPE3, category: PENDLERVERKEHR, quantity: km })
                  (quantity = km/employee × employees × working-days; user calculates and enters total km)
```

### 3.8 Screen 6 — Materialien Data Flow

```
Dynamic table (N rows, each row = { material: MaterialCategory, quantityKg: number, supplierName: string? })

Add row:
  └─> Server Action: saveMaterialEntry({ reportingYearId, material, quantityKg, supplierName })
        ├─> prisma.materialEntry.create({ ... })
        └─> prisma.auditLog.create({ entityType: "MaterialEntry", action: CREATE, ... })

Edit row:
  └─> saveMaterialEntry({ id, quantityKg, supplierName })
        ├─> prisma.materialEntry.update({ where: { id }, data: { quantityKg, supplierName } })
        └─> prisma.auditLog.create({ action: UPDATE, oldValue, newValue })

Delete row:
  └─> Server Action: deleteMaterialEntry({ id })
        ├─> prisma.materialEntry.delete({ where: { id } })
        └─> prisma.auditLog.create({ action: DELETE })
```

**Note:** `MaterialEntry` rows have no unique constraint on material category (multiple rows of
KUPFER in a year are valid). The table is a genuine list, not a keyed set.

### 3.9 Screen 7 — Abfall Data Flow

```
4 numeric inputs (Restmüll kg, Bauschutt kg, Altmetall kg, Sonstiges kg)
  → same UPSERT pattern as Screen 2

Special case — Altmetall:
  EmissionFactor key = "ABFALL_ALTMETALL"
  factorKg is NEGATIVE (recycling credit reduces total CO₂e)
  calculateCO2e(ABFALL_ALTMETALL, 500, 2024) → 500 × (–0.040) = –20 kg CO₂e
  This is correct and intentional per GHG Protocol accounting for recycling.
```

---

## 4. CO₂e Calculation Pipeline

### 4.1 Pipeline Overview

```
User enters quantity (m³ / L / kg / kWh / km)
  └─> Stored as-entered in EmissionEntry.quantity (or MaterialEntry.quantityKg)

On dashboard load / report generation:
  └─> For each EmissionEntry:
        lib/factors.ts lookupFactor(category, year, { isOekostrom })
          └─> SELECT factorKg FROM EmissionFactor
              WHERE key = $key AND validYear <= $year
              ORDER BY validYear DESC LIMIT 1
              [forward fallback: if no row found, SELECT ... ORDER BY validYear ASC LIMIT 1]
          └─> Returns EmissionFactor { factorKg, unit, source, scope }

        lib/emissions.ts calculateCO2e(category, quantity, year, options)
          └─> Returns quantity × factorKg  [kg CO₂e]

  └─> For each MaterialEntry:
        lookupFactor(material, year)  [key = MaterialCategory enum name, e.g. "KUPFER"]
        calculateCO2e(material, quantityKg, year)
          └─> Returns quantityKg × factorKg  [kg CO₂e]

  └─> Total CO₂e = SUM(all EmissionEntry CO₂e) + SUM(all MaterialEntry CO₂e)  [kg]
  └─> Dashboard displays: total / 1000  [t CO₂e]
  └─> KPI: (total / 1000) / companyProfile.mitarbeiter  [t CO₂e / MA]
```

### 4.2 Factor Key Mapping

| EmissionCategory | Factor Key | Unit | Notes |
|---|---|---|---|
| ERDGAS | `ERDGAS` | m³ | UBA 2024 |
| HEIZOEL | `HEIZOEL` | L | UBA 2024 |
| FLUESSIGGAS | `FLUESSIGGAS` | kg | UBA 2024 |
| DIESEL_FUHRPARK | `DIESEL_FUHRPARK` | L | UBA 2024 |
| BENZIN_FUHRPARK | `BENZIN_FUHRPARK` | L | UBA 2024 |
| PKW_BENZIN_KM | `PKW_BENZIN_KM` | km | UBA 2024 |
| PKW_DIESEL_KM | `PKW_DIESEL_KM` | km | UBA 2024 |
| TRANSPORTER_KM | `TRANSPORTER_KM` | km | UBA 2024 |
| LKW_KM | `LKW_KM` | km | UBA 2024 |
| R410A_KAELTEMITTEL | `R410A_KAELTEMITTEL` | kg | GWP = 2088 kg CO₂e/kg |
| R32_KAELTEMITTEL | `R32_KAELTEMITTEL` | kg | GWP = 675 kg CO₂e/kg |
| R134A_KAELTEMITTEL | `R134A_KAELTEMITTEL` | kg | GWP = 1430 kg CO₂e/kg |
| SONSTIGE_KAELTEMITTEL | `SONSTIGE_KAELTEMITTEL` | kg | GWP = 2000 (conservative default) |
| STROM (non-Öko) | `STROM_MIX` | kWh | UBA 2024 grid mix |
| STROM (Ökostrom) | `STROM_OEKOSTROM` | kWh | Certified green electricity factor |
| FERNWAERME | `FERNWAERME` | kWh | UBA 2024 |
| GESCHAEFTSREISEN_FLUG | `GESCHAEFTSREISEN_FLUG` | km | UBA 2024 |
| GESCHAEFTSREISEN_BAHN | `GESCHAEFTSREISEN_BAHN` | km | UBA 2024 |
| PENDLERVERKEHR | `PENDLERVERKEHR` | km | UBA 2024 |
| ABFALL_RESTMUELL | `ABFALL_RESTMUELL` | kg | UBA 2024 |
| ABFALL_BAUSCHUTT | `ABFALL_BAUSCHUTT` | kg | UBA 2024 |
| ABFALL_ALTMETALL | `ABFALL_ALTMETALL` | kg | **Negative** — recycling credit |
| ABFALL_SONSTIGES | `ABFALL_SONSTIGES` | kg | UBA 2024 |

**Material categories:**

| MaterialCategory | Factor Key | Unit |
|---|---|---|
| KUPFER | `KUPFER` | kg |
| STAHL | `STAHL` | kg |
| ALUMINIUM | `ALUMINIUM` | kg |
| HOLZ | `HOLZ` | kg |
| KUNSTSTOFF_PVC | `KUNSTSTOFF_PVC` | kg |
| BETON | `BETON` | kg |
| FARBEN_LACKE | `FARBEN_LACKE` | kg |
| SONSTIGE | `MATERIAL_SONSTIGE` | kg |

### 4.3 Calculation Engine Contracts

```typescript
// lib/factors.ts

/**
 * Looks up the emission factor for the given key and year.
 *
 * Lookup strategy (ADR-006):
 *   SELECT factorKg FROM EmissionFactor
 *   WHERE key = $key AND validYear <= $year
 *   ORDER BY validYear DESC LIMIT 1
 *
 * Forward fallback: if no factor ≤ year exists, uses the earliest factor > year
 * (handles 2023 entries when only 2024 factors are seeded).
 *
 * Special case: when options.isOekostrom is true, resolves key "STROM" → "STROM_OEKOSTROM".
 *
 * @throws FactorNotFoundError if no factor row exists for the key at any year.
 */
export async function lookupFactor(
  key: string,
  year: number,
  options?: { isOekostrom?: boolean }
): Promise<{ factorKg: number; unit: string; source: string }>

// lib/emissions.ts

/**
 * Calculates CO₂e in kilograms for a given emission category and quantity.
 *
 * Returns quantity × factorKg (from DB — never hardcoded, per ADR-006).
 *
 * IMPORTANT: The return value CAN be negative for ABFALL_ALTMETALL.
 * Altmetall (scrap metal) has a negative emission factor per UBA 2024
 * because recycling metal avoids primary production emissions (a credit).
 * This negative value is correct and intentional — it reduces the total CO₂e.
 * Dashboard charts and the GHG Protocol PDF must handle negative values gracefully.
 *
 * @returns kg CO₂e — positive for all categories except ABFALL_ALTMETALL,
 *          which returns a negative number (recycling credit).
 */
export async function calculateCO2e(
  category: EmissionCategory | MaterialCategory,
  quantity: number,
  year: number,
  options?: { isOekostrom?: boolean }
): Promise<number>
```

### 4.4 Dashboard Aggregation Strategy

The dashboard Server Component performs aggregation queries using `Promise.all` for parallelism:

```typescript
const [entries, materialEntries, allYears, benchmark, profile, auditLogs, reports] =
  await Promise.all([
    prisma.emissionEntry.findMany({ where: { reportingYearId: year.id } }),
    prisma.materialEntry.findMany({ where: { reportingYearId: year.id } }),
    prisma.reportingYear.findMany({ orderBy: { year: 'asc' } }),
    prisma.industryBenchmark.findUnique({ where: { branche: profile.branche } }),
    prisma.companyProfile.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.auditLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } }),
    prisma.report.findMany({ where: { reportingYearId: year.id } }),
  ]);
```

CO₂e values are calculated in the Server Component and passed to Client Components as
plain numbers — no Prisma objects reach the client.

---

## 5. PDF Generation

### 5.1 GHG Protocol PDF (`GHGReport.tsx`)

Generated by `POST /api/report` with `{ year, type: "GHG_PROTOCOL" }`.

**Sections (in order):**

| Section | Content | Data source |
|---|---|---|
| Cover | Logo, Firmenname, Standort, Berichtsjahr, "GHG Protocol Corporate Standard" | `CompanyProfile` |
| Executive Summary | Total CO₂e (t), per-employee (t/MA), Scope 1/2/3 breakdown | Calculated |
| Scope 1 Table | Category, quantity, unit, factor (kg/unit), CO₂e (kg) per row; subtotal | `EmissionEntry` + `EmissionFactor` |
| Scope 2 Table | STROM (Ökostrom: Ja/Nein), FERNWAERME; same columns | `EmissionEntry` + `EmissionFactor` |
| Scope 3 Activities | Travel, commuting, waste — same columns | `EmissionEntry` + `EmissionFactor` |
| Scope 3 Materialien | Material category, kg, factor, CO₂e per row | `MaterialEntry` + `EmissionFactor` |
| Berichtsgrenzen | `reportingBoundaryNotes` + `exclusions`; fallback text if empty | `CompanyProfile` |
| Data Quality | Every `EmissionCategory` listed: "erfasst (gemessen)" / "erfasst (geschätzt)" / "nicht erfasst" | `EmissionEntry` presence |
| Methodology | Standard methodology text; cites UBA 2024; notes which factor year was used per category | Static text + `EmissionFactor.source` |
| Footnotes | Categories not captured; GWP sources for Kältemittel | Static text |

**Data quality row logic:**
- `EmissionEntry` exists + `inputMethod = MANUAL` → "erfasst (gemessen)"
- `EmissionEntry` exists + `inputMethod = OCR` or `CSV` → "erfasst (geschätzt)"
- No `EmissionEntry` → "nicht erfasst"

### 5.2 CSRD Questionnaire PDF (`CSRDQuestionnaire.tsx`)

Generated by `POST /api/report` with `{ year, type: "CSRD_QUESTIONNAIRE" }`.

Simplified questionnaire format for supplier sustainability disclosure. Sections:
- Company identification (from `CompanyProfile`)
- GHG emissions summary (total CO₂e, Scope 1/2/3)
- Data coverage statement (which categories are captured)
- Reporting standards (GHG Protocol Corporate Standard, UBA 2024 factors)
- Contact declaration placeholder

### 5.3 Sustainability Badge (`/api/badge`)

Returns three formats in a single response body:

```json
{
  "png": "<base64>",
  "svg": "<svg>...</svg>",
  "html": "<a href=\"...\"><img ... /></a>"
}
```

Badge shows: company name, total CO₂e (t), reporting year, GrünBilanz logo.
Generated server-side using `@vercel/og` or canvas — no Puppeteer.

### 5.4 PDF Rendering Implementation

```typescript
// lib/pdf.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { GHGReport } from '@/components/reports/GHGReport';
import { CSRDQuestionnaire } from '@/components/reports/CSRDQuestionnaire';

export async function renderReport(
  type: ReportType,
  data: ReportData
): Promise<Buffer> {
  const element = type === 'GHG_PROTOCOL'
    ? <GHGReport data={data} />
    : <CSRDQuestionnaire data={data} />;
  return renderToBuffer(element);
}
```

The `POST /api/report` handler:
1. Fetches all required data from DB
2. Calls `renderReport(type, data)` → Buffer (< 3 seconds)
3. Saves PDF to `process.env.REPORTS_PATH/[year]-[type].pdf`
4. Inserts `Report` row with `filePath`
5. Returns `application/pdf` response with `Content-Disposition: attachment`

---

## 6. Docker Infrastructure

### 6.1 Multi-Stage Dockerfile

```
Stage 1: deps (node:20-alpine)
  └─> Copy package.json + package-lock.json
  └─> npm ci --only=production
  
Stage 2: builder (node:20-alpine)
  └─> Copy all source + full node_modules (including devDeps)
  └─> npx prisma generate
  └─> NEXT_TELEMETRY_DISABLED=1 next build (output: standalone)

Stage 3: runner (node:20-alpine)
  └─> Install PostgreSQL 15:  apk add postgresql15 postgresql15-client supervisor
  └─> Copy .next/standalone (built Next.js)
  └─> Copy .next/static → .next/standalone/.next/static
  └─> Copy public → .next/standalone/public
  └─> Copy prisma/migrations
  └─> Copy docker/init.sql → /docker-entrypoint-initdb.d/
  └─> Copy docker/supervisord.conf → /etc/supervisord.conf
  └─> Copy docker/healthcheck.sh → /docker/healthcheck.sh (chmod +x)
  └─> Create PostgreSQL data dir + user
  └─> EXPOSE 3000
  └─> CMD ["supervisord", "-c", "/etc/supervisord.conf"]
```

**Environment variables available in `runner` stage:**
- `DATABASE_URL` (from docker-compose.yml env or .env file)
- `TESSERACT_URL=http://tesseract:3001` (Docker service DNS)
- `REPORTS_PATH=/app/reports`
- `NODE_ENV=production`

### 6.2 docker-compose.yml Services

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - gruenbilanz_pgdata:/var/lib/postgresql/data
    environment:
      DATABASE_URL: postgresql://gruenbilanz:gruenbilanz@localhost:5432/gruenbilanz
      TESSERACT_URL: http://tesseract:3001
      NODE_ENV: production
      NEXT_TELEMETRY_DISABLED: 1
    depends_on:
      - tesseract
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 5

  tesseract:
    build: ./docker/tesseract
    ports:
      - "3001:3001"

volumes:
  gruenbilanz_pgdata:
```

### 6.3 Startup Sequence

```
docker compose up
  └─> Both containers start in parallel
  
  app container (supervisord):
    1. postgres process (priority 10) starts first
       └─> pg_ctl start
       └─> On first start: runs /docker-entrypoint-initdb.d/init.sql (schema + seed data)
    2. nextjs-starter process (priority 20) runs healthcheck.sh:
       └─> Loop: pg_isready -h localhost -p 5432 → waits until PostgreSQL accepts connections
       └─> npx prisma migrate deploy (idempotent — skips already-applied migrations)
       └─> exec node server.js (standalone Next.js)
  
  tesseract container:
    └─> node server.js → Express listens on :3001
  
  Ready: http://localhost:3000 accessible; dashboard shows Mustermann Elektro GmbH seed data
```

### 6.4 init.sql Seed Data Requirements

`docker/init.sql` must seed (in dependency order):

1. `CompanyProfile` (id=1): Mustermann Elektro GmbH, ELEKTROHANDWERK, mitarbeiter=12, Standort="München, Bayern"
2. `EmissionFactor` rows: all 24 factor keys × `valid_year = 2024` (see §4.2 factor key table)
3. `IndustryBenchmark` rows: one per `Branche` enum (7 rows)
4. `ReportingYear` rows: 2023 (id=1), 2024 (id=2)
5. `EmissionEntry` rows: representative set for 2023 + 2024 (all categories, varying quantities)
6. `MaterialEntry` rows: Kupfer, Stahl, Aluminium, Holz (2023 + 2024)

**init.sql schema vs Prisma migrations — single source of truth:**

`docker/init.sql` serves two purposes: (1) bootstrap the schema on first container start before
Prisma runs, and (2) seed demo data. To avoid drift between `init.sql` and Prisma migrations,
follow this rule:

> **`init.sql` is schema + seed data on first start only. Prisma is the authoritative schema
> source.** The `init.sql` tables are created with `CREATE TABLE IF NOT EXISTS`. When
> `prisma migrate deploy` runs immediately after PostgreSQL init (via `healthcheck.sh`), Prisma
> detects the tables exist and marks the migration as applied — it does not re-create tables.

To keep the two in sync without manual effort:
1. Generate `prisma/migrations/0001_initial/migration.sql` first by running `prisma migrate dev`
2. Copy the CREATE TABLE statements from `migration.sql` into `init.sql` (one-time, at schema
   creation time — not on every migration)
3. For subsequent schema changes, only add a Prisma migration (`prisma migrate dev`). Update
   `init.sql` only if the seed data itself changes. The schema portion of `init.sql` is frozen
   after the initial migration.

**In practice:** `init.sql` schema statements are a deliberate one-time bootstrap snapshot.
Operator documentation (`README.md`) must note that `init.sql` is not modified for schema changes
after initial setup — only Prisma migrations evolve the schema.

---

## 7. Server Actions Design

All data-mutating operations are Next.js Server Actions in `lib/actions.ts`.
Each action follows this pattern:

```typescript
'use server';

export async function saveEntry(input: SaveEntryInput): Promise<ActionResult> {
  try {
    // 1. Validate input (Zod or manual type check)
    // 2. UPSERT EmissionEntry
    // 3. CREATE AuditLog row (within same transaction where possible)
    return { success: true, id: entry.id };
  } catch (error) {
    return { success: false, error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' };
  }
}
```

**Actions inventory:**

| Action | Operation | Creates AuditLog? |
|---|---|---|
| `saveEntry` | UPSERT `EmissionEntry` | Yes (CREATE or UPDATE) |
| `deleteEntry` | DELETE `EmissionEntry` | Yes (DELETE) |
| `saveMaterialEntry` | CREATE or UPDATE `MaterialEntry` | Yes |
| `deleteMaterialEntry` | DELETE `MaterialEntry` | Yes |
| `saveCompanyProfile` | UPSERT `CompanyProfile` (id=1) | Yes |
| `confirmStagingEntry` | DELETE `StagingEntry` + UPSERT `EmissionEntry` | Yes (inputMethod: OCR or CSV) |
| `confirmAllStaging` | DELETE all staging for year + UPSERT entries | Yes (per entry) |
| `createReportingYear` | CREATE `ReportingYear` | No |
| `deleteReportingYear` | DELETE `ReportingYear` (cascades via Prisma) | No |

**Audit log transaction:** Use `prisma.$transaction([upsertEntry, createAuditLog])` to ensure
both writes succeed or both fail. If the transaction throws, the action returns `{ success: false }`.

---

## 8. Status Badge Logic (CategoryStatusList)

Each wizard screen shows a status badge. The logic maps to completion criteria:

| Status | Condition |
|---|---|
| **Erfasst** ✓ | All `EmissionCategory` values for this screen have a corresponding `EmissionEntry` row |
| **Teilweise** ⚠ | At least one but not all categories for this screen have an entry |
| **Nicht erfasst** — | No `EmissionEntry` rows exist for any category in this screen |

Screen 6 (Materialien) uses a different rule: **Erfasst** if at least one `MaterialEntry` row
exists (since the material table is open-ended); **Nicht erfasst** otherwise.

```typescript
// src/types/index.ts
export const SCREEN_CATEGORIES: Record<number, EmissionCategory[]> = {
  2: [ERDGAS, HEIZOEL, FLUESSIGGAS, R410A_KAELTEMITTEL, R32_KAELTEMITTEL, R134A_KAELTEMITTEL, SONSTIGE_KAELTEMITTEL],
  3: [DIESEL_FUHRPARK, BENZIN_FUHRPARK, PKW_BENZIN_KM, PKW_DIESEL_KM, TRANSPORTER_KM, LKW_KM],
  4: [STROM, FERNWAERME],
  5: [GESCHAEFTSREISEN_FLUG, GESCHAEFTSREISEN_BAHN, PENDLERVERKEHR],
  7: [ABFALL_RESTMUELL, ABFALL_BAUSCHUTT, ABFALL_ALTMETALL, ABFALL_SONSTIGES],
};
// Screen 1 = CompanyProfile; Screen 6 = MaterialEntry (no category enum)
```

---

## 9. File Size Constraint Enforcement

Per `docs/conventions.md`, files must be ≤ 200–300 lines. Large modules should be split:

| Module | Recommended split |
|---|---|
| `lib/actions.ts` | Split into `actions/entries.ts`, `actions/materials.ts`, `actions/profile.ts`, `actions/staging.ts`, `actions/years.ts` — re-exported from `lib/actions.ts` index |
| `docker/init.sql` | Single file is acceptable even if > 300 lines (SQL, not TS); seed data is inherently verbose |
| `GHGReport.tsx` | Split into sub-components: `ReportHeader.tsx`, `ScopeTable.tsx`, `DataQualitySection.tsx`, `BerichtsgrenzenSection.tsx`, `MethodologySection.tsx` |

---

## 10. Components Affected (Full List)

All components are new — this is a greenfield build. The following files are created by the
Developer; none exist yet:

### New Infrastructure Files
- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `docker/supervisord.conf`
- `docker/healthcheck.sh`
- `docker/init.sql`
- `docker/tesseract/Dockerfile`
- `docker/tesseract/server.js`
- `README.md`

### New Prisma Files
- `prisma/schema.prisma`
- `prisma/migrations/0001_initial/migration.sql`

### New Source Files (76 total)

**App Router (10 files):**
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/wizard/layout.tsx`
- `src/app/wizard/[screen]/page.tsx`
- `src/app/api/ocr/route.ts`
- `src/app/api/csv/route.ts`
- `src/app/api/report/route.ts`
- `src/app/api/badge/route.ts`
- `src/app/api/entries/route.ts`
- `src/app/api/audit/route.ts`
- `src/app/api/documents/[id]/route.ts`
- `src/app/api/field-documents/route.ts`

**Dashboard Components (8 files):**
- `src/components/dashboard/KpiCard.tsx`
- `src/components/dashboard/ScopeDonut.tsx`
- `src/components/dashboard/CategoryBarChart.tsx`
- `src/components/dashboard/YearOverYearChart.tsx`
- `src/components/dashboard/BranchenvergleichCard.tsx`
- `src/components/dashboard/CategoryStatusList.tsx`
- `src/components/dashboard/YearSelector.tsx`
- `src/components/dashboard/AuditLogPanel.tsx`

**Wizard Components (13 files):**
- `src/components/wizard/WizardNav.tsx`
- `src/components/wizard/UploadOCR.tsx`
- `src/components/wizard/CsvImport.tsx`
- `src/components/wizard/FieldDocumentZone.tsx`
- `src/components/wizard/PlausibilityWarning.tsx`
- `src/components/wizard/ScreenChangeLog.tsx`
- `src/components/wizard/screens/Screen1Firmenprofil.tsx`
- `src/components/wizard/screens/Screen2Heizung.tsx`
- `src/components/wizard/screens/Screen3Fuhrpark.tsx`
- `src/components/wizard/screens/Screen4Strom.tsx`
- `src/components/wizard/screens/Screen5Dienstreisen.tsx`
- `src/components/wizard/screens/Screen6Materialien.tsx`
- `src/components/wizard/screens/Screen7Abfall.tsx`

**Report Components (2 files):**
- `src/components/reports/GHGReport.tsx`
- `src/components/reports/CSRDQuestionnaire.tsx`

**Settings Components (1 file):**
- `src/components/settings/YearManagement.tsx`

**Library Modules (9 files):**
- `src/lib/prisma.ts`
- `src/lib/actions.ts` (or split as noted in §9)
- `src/lib/emissions.ts`
- `src/lib/factors.ts`
- `src/lib/ocr/index.ts`
- `src/lib/csv/index.ts`
- `src/lib/pdf.ts`
- `src/lib/utils.ts`

**Types (1 file):**
- `src/types/index.ts`

**Unit Tests (2 files):**
- `src/lib/__tests__/emissions.test.ts`
- `src/lib/__tests__/factors.test.ts`

---

## 11. Architecture Decisions Referenced

All ADRs fully documented in `docs/architecture.md §9`. No new ADRs are required for this feature.

| ADR | Binding Decision | Impact on Implementation |
|---|---|---|
| ADR-001 | Single `app` container: Next.js + PostgreSQL + supervisord | One Dockerfile, two services in docker-compose.yml |
| ADR-002 | Unified `EmissionEntry` + separate `MaterialEntry` | Two Server Actions (`saveEntry` vs `saveMaterialEntry`); two aggregation paths in dashboard |
| ADR-003 | `StagingEntry` staging table for OCR/CSV | `confirmStagingEntry` action required; dashboard must NOT query StagingEntry |
| ADR-004 | Server-side CSV parsing | `/api/csv` route; `lib/csv/index.ts` stub; no PapaParse in browser bundle |
| ADR-005 | React-PDF on Node.js runtime | `export const runtime = 'nodejs'` on `/api/report`; no Puppeteer dependency |
| ADR-006 | `valid_year` integer versioning for factors | `lookupFactor` always queries DB; seed file must use `valid_year = 2024` |

---

## 12. Unit Test Requirements

Per specification, `lib/emissions.ts` and `lib/factors.ts` require ≥ 80% line coverage.

**Test cases for `lib/factors.ts`:**
- Exact year match → returns correct factor
- Year before first factor (forward fallback) → returns earliest available factor
- Year after last factor (backward fallback) → returns most recent factor
- `isOekostrom: true` → returns `STROM_OEKOSTROM` factor instead of `STROM_MIX`
- Unknown key → throws `FactorNotFoundError`

**Test cases for `lib/emissions.ts`:**
- 1000 m³ Erdgas, 2024 → 2000 kg CO₂e (factor 2.000)
- 500 kg Altmetall, 2024 → negative CO₂e (recycling credit)
- R410A 1 kg → 2088 kg CO₂e
- Ökostrom 1000 kWh → significantly less than Strommix 1000 kWh
- Zero quantity → 0 kg CO₂e
- `calculateCO2e` calls `lookupFactor` (not hardcoded values)

Tests use mocked Prisma client (via `jest.mock` or `vi.mock`) to avoid DB dependency.

---

## Summary

The GrünBilanz full application build requires implementing approximately 76 source files plus
infrastructure files. All architectural decisions are pre-made in `docs/architecture.md` (ADR-001
through ADR-006). The Developer should:

1. Start with infrastructure: `Dockerfile`, `docker-compose.yml`, `docker/` files, `prisma/schema.prisma`
2. Implement library modules (`lib/`) before components (components depend on types and actions)
3. Implement wizard screens 1–7 iteratively, testing each with `docker compose up`
4. Implement PDF components last (most complex layout work)
5. Verify `docker compose up` from clean checkout produces the seeded dashboard
