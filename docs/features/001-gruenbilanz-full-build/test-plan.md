# Test Plan: GrünBilanz Full Application Build

## Overview

This test plan covers the complete GrünBilanz application build (Feature 001). It maps every
acceptance criterion from `specification.md` to concrete, automated test cases and UAT
scenarios. All automated tests run via `cd src && npm test` (Vitest). The E2E suite runs
via `npm run test:e2e` against a booted application. Docker deployment smoke tests are
executed via shell script.

**References:**
- [`docs/features/001-gruenbilanz-full-build/specification.md`](specification.md)
- [`docs/features/001-gruenbilanz-full-build/architecture.md`](architecture.md)
- [`docs/testing-strategy.md`](../../../docs/testing-strategy.md)

---

## Test Coverage Matrix

| Acceptance Criterion | Test Case(s) | Test Type |
|---|---|---|
| **Deployment** | | |
| `docker compose up` succeeds, app at `:3000` in ≤ 30 s | TC-D01 | Smoke |
| Mustermann Elektro GmbH seed data visible on first run | TC-D02 | Smoke |
| Data persists after `docker compose restart` | TC-D03 | Smoke |
| **Dashboard** | | |
| Scope 1/2/3 donut chart renders correct CO₂e totals | TC-DB01 | Component |
| Per-category bar chart renders within each scope | TC-DB02 | Component |
| Year-over-year chart shows 2023 and 2024 data | TC-DB03 | Component |
| Branchenvergleich card shows benchmark | TC-DB04 | Component |
| CO₂e per employee KPI displayed | TC-DB05 | Component |
| Year selector switches all charts | TC-DB06 | E2E |
| "+ Neues Jahr anlegen" creates year and shows empty dashboard | TC-DB07 | E2E |
| AuditLogPanel shows last 50 changes | TC-DB08 | Integration |
| **Wizard** | | |
| All 7 wizard screens accessible via side navigation | TC-W01 | E2E |
| Status badge reflects entry completeness | TC-W02 | Unit |
| Pre-filled values when revisiting a screen | TC-W03 | E2E |
| `onBlur` triggers auto-save and shows success toast | TC-W04 | E2E |
| "Speichern" button saves current screen | TC-W05 | E2E |
| `PlausibilityWarning` appears but does not block save | TC-W06 | Component |
| `ScreenChangeLog` shows last 5 audit entries | TC-W07 | Component |
| Screen 1 saves all 7 CompanyProfile fields | TC-W08 | Integration |
| Screen 2 saves Erdgas, Heizöl, Flüssiggas, and all 4 refrigerant types | TC-W09 | Integration |
| Screen 3 saves Diesel, Benzin, vehicle-km rows (add/remove) | TC-W10 | Integration |
| Screen 4 saves Strom, Ökostrom-Flag, provider name, Fernwärme | TC-W11 | Integration |
| Screen 5 saves Flug km, Bahn km, Pendlerverkehr | TC-W12 | Integration |
| Screen 6 saves MaterialEntry rows (add/remove) | TC-W13 | Integration |
| Screen 7 saves Restmüll, Bauschutt, Altmetall, Sonstiges | TC-W14 | Integration |
| **Input Methods** | | |
| Manual entry creates `EmissionEntry` with `inputMethod: MANUAL` + AuditLog | TC-I01 | Integration |
| OCR upload shows spinner → yellow banner → confirm moves to EmissionEntry | TC-I02 | E2E |
| CSV import shows column-mapping UI, pre-fills values | TC-I03 | E2E |
| `FieldDocumentZone` allows attaching documents | TC-I04 | Integration |
| **Calculations** | | |
| Erdgas 1000 m³ = 2000 kg CO₂e | TC-C01 | Unit |
| Altmetall emission factor is negative | TC-C02 | Unit |
| R410A GWP = 2088 | TC-C03 | Unit |
| R32 GWP = 675 | TC-C04 | Unit |
| R134A GWP = 1430 | TC-C05 | Unit |
| Ökostrom flag uses `STROM_OEKOSTROM` factor | TC-C06 | Unit |
| Total CO₂e = sum of all entries for the year | TC-C07 | Integration |
| Factors sourced from DB — not hardcoded | TC-C08 | Unit |
| `FactorNotFoundError` thrown for unknown key | TC-C09 | Unit |
| Forward fallback: uses earliest factor when none ≤ year | TC-C10 | Unit |
| **Reports** | | |
| PDF generated in < 3 seconds | TC-R01 | Integration |
| PDF includes company header | TC-R02 | Unit |
| PDF includes Scope 1/2/3 tables with UBA citations | TC-R03 | Unit |
| PDF includes Berichtsgrenzen section | TC-R04 | Unit |
| PDF data quality section lists missing categories | TC-R05 | Unit |
| CSRD questionnaire PDF generated | TC-R06 | Integration |
| Badge returns PNG, SVG, and HTML snippet | TC-R07 | Integration |
| Generated reports listed on dashboard with download links | TC-R08 | E2E |
| **Audit Trail** | | |
| Every save/delete/update creates AuditLog row with all required fields | TC-A01 | Integration |
| OCR/CSV saves include `documentId` | TC-A02 | Integration |
| AuditLogPanel displays 50 most recent entries | TC-A03 | Integration |
| ScreenChangeLog shows last 5 entries for that screen's categories | TC-A04 | Integration |
| **Settings** | | |
| `/settings` page accessible from dashboard header | TC-S01 | E2E |
| New reporting year can be added | TC-S02 | Integration |
| Year deletion cascades to all related data | TC-S03 | Integration |
| **Unit Test Coverage** | | |
| `lib/emissions.ts` coverage ≥ 80 % | TC-COV01 | Coverage |
| `lib/factors.ts` coverage ≥ 80 % | TC-COV02 | Coverage |

---

## User Acceptance Scenarios

> **Purpose**: Validate the running app end-to-end from the user's perspective. The UAT Tester
> agent automates these via Playwright. A separate `uat-test-plan.md` provides manual steps for
> the Maintainer.

### Scenario 1: First-Run Dashboard with Seed Data

**User Goal**: Open the app for the first time and see Mustermann Elektro GmbH data.

**Test Steps**:
1. Run `docker compose up -d`
2. Navigate to `http://localhost:3000`
3. Observe the dashboard

**Expected Output**:
- Company name "Mustermann Elektro GmbH" visible
- Scope 1/2/3 donut chart rendered with non-zero values for 2024
- CO₂e per employee KPI displayed
- AuditLogPanel visible (collapsed or expanded)

**Success Criteria**:
- [ ] Seed data is visible without any manual setup
- [ ] Charts render within 2 seconds of page load
- [ ] No JavaScript errors in the browser console
- [ ] German locale formatting (numbers with `.` thousands, `,` decimal)

---

### Scenario 2: Complete a Wizard Screen (Manual Entry → Save → Dashboard Update)

**User Goal**: Enter natural gas consumption for 2024 and see the updated CO₂e on the dashboard.

**Test Steps**:
1. Navigate to `http://localhost:3000`
2. Click on wizard screen 2 ("Heizung & Kältemittel") in the side navigation
3. Enter `1000` in the Erdgas field (m³)
4. Click out of the field (onBlur) or click "Speichern"
5. Navigate back to the dashboard

**Expected Output**:
- Success toast shown ("Gespeichert" or equivalent German text)
- Dashboard Scope 1 CO₂e updates to include 2000 kg CO₂e
- Status badge on screen 2 changes to at least "Teilweise"

**Success Criteria**:
- [ ] Save triggers without full page reload
- [ ] CO₂e calculated correctly (1000 m³ × 2.000 kg/m³ = 2000 kg)
- [ ] Audit log shows new entry for the save
- [ ] Revisiting screen 2 shows 1000 pre-filled in the Erdgas field

---

### Scenario 3: Generate GHG Report PDF

**User Goal**: Generate and download a GHG Protocol PDF report.

**Test Steps**:
1. Navigate to `http://localhost:3000` (seed data must be present)
2. Click "Bericht erstellen"
3. Wait for PDF generation
4. Click the download link that appears

**Expected Output**:
- PDF generated within 3 seconds
- PDF opens/downloads
- PDF contains company header with "Mustermann Elektro GmbH"
- PDF shows Scope 1, 2, 3 tables with emission categories and CO₂e values
- PDF cites "UBA 2024" as emission factor source

**Success Criteria**:
- [ ] PDF renders without error
- [ ] All scope sections are populated
- [ ] Missing categories listed in data quality section

---

### Scenario 4: Settings — Create and Delete Reporting Year

**User Goal**: Add a new reporting year and then delete it.

**Test Steps**:
1. Navigate to `http://localhost:3000/settings`
2. Click "+ Neues Jahr anlegen", enter `2025`
3. Confirm
4. Navigate to dashboard, use year selector to switch to 2025
5. Return to settings, delete year 2025
6. Confirm deletion in the German confirmation dialog

**Expected Output**:
- Year 2025 appears in the year selector
- Dashboard for 2025 shows empty state (no entries)
- After deletion, 2025 is no longer in the year selector
- All data associated with 2025 is removed (cascade)

**Success Criteria**:
- [ ] Year creation and deletion work without errors
- [ ] Cascade delete removes all related EmissionEntry, MaterialEntry, and AuditLog rows
- [ ] German confirmation dialog appears before deletion

---

## Test Cases

### TC-D01: Docker Compose Startup

**Type:** Smoke

**Description:**
Verify that `docker compose up` succeeds from a clean state and the app is accessible within 30 seconds.

**Preconditions:**
- No running containers; clean Docker state
- All images built from the current commit

**Test Steps:**
1. Run `docker compose build --no-cache`
2. Run `docker compose up -d`
3. Poll `http://localhost:3000` every 2 s for up to 30 s
4. Check HTTP response code

**Expected Result:**
- Build completes without errors
- HTTP 200 returned within 30 seconds
- No container exit codes

**Test Data:** None (verifies infrastructure)

---

### TC-D02: Seed Data Present on First Run

**Type:** Smoke

**Description:**
Verify that `init.sql` seeds Mustermann Elektro GmbH data on first container start.

**Test Steps:**
1. Start containers from a clean state (`docker volume rm gruenbilanz_pgdata`)
2. Run `docker compose up -d`
3. Wait for health check to pass
4. Query `GET http://localhost:3000/api/entries?year=2024` (or inspect dashboard)

**Expected Result:**
- CompanyProfile shows Mustermann Elektro GmbH
- At least one EmissionEntry exists for year 2024
- At least one MaterialEntry exists for year 2024

---

### TC-D03: Data Persistence After Restart

**Type:** Smoke

**Description:**
Verify data written to the database persists after `docker compose restart`.

**Test Steps:**
1. Save a new EmissionEntry via the wizard
2. Run `docker compose restart`
3. Wait for app to come back online
4. Navigate to the wizard screen and verify the value is still present

**Expected Result:**
- Saved entry still present after container restart

---

### TC-C01: calculateCO2e_erdgas1000m3_returns2000kg

**Type:** Unit

**Description:**
Verify that 1000 m³ of Erdgas yields exactly 2000 kg CO₂e using the UBA 2024 factor (2.000 kg/m³).

**File:** `src/lib/emissions.test.ts`

**Test Steps:**
```typescript
it("calculateCO2e_erdgas1000m3_returns2000kg", async () => {
  // Mock lookupFactor to return { factorKg: 2.0, unit: "m³", source: "UBA 2024" }
  const result = await calculateCO2e("ERDGAS", 1000, 2024);
  expect(result).toBe(2000);
});
```

**Expected Result:** `2000` (kg CO₂e)

---

### TC-C02: calculateCO2e_altmetall_returnsNegativeValue

**Type:** Unit

**Description:**
Verify that Altmetall produces a negative CO₂e value (recycling credit).

**File:** `src/lib/emissions.test.ts`

**Test Steps:**
```typescript
it("calculateCO2e_altmetall_returnsNegativeValue", async () => {
  // Mock lookupFactor to return { factorKg: -0.040 }
  const result = await calculateCO2e("ABFALL_ALTMETALL", 500, 2024);
  expect(result).toBe(-20);
  expect(result).toBeLessThan(0);
});
```

**Expected Result:** `-20` (kg CO₂e)

---

### TC-C03: lookupFactor_r410aKaeltemittel_returns2088GWP

**Type:** Unit

**Description:**
Verify that the R410A refrigerant factor key returns GWP = 2088 kg CO₂e/kg.

**File:** `src/lib/factors.test.ts`

**Test Steps:**
```typescript
it("lookupFactor_r410aKaeltemittel_returns2088GWP", async () => {
  mockPrisma.emissionFactor.findFirst.mockResolvedValue({ factorKg: 2088, unit: "kg", source: "UBA 2024", validYear: 2024 });
  const factor = await lookupFactor("R410A_KAELTEMITTEL", 2024);
  expect(factor.factorKg).toBe(2088);
});
```

**Expected Result:** `factorKg = 2088`

---

### TC-C04: lookupFactor_r32Kaeltemittel_returns675GWP

**Type:** Unit

**Description:**
Verify that the R32 refrigerant factor key returns GWP = 675 kg CO₂e/kg.

**File:** `src/lib/factors.test.ts`

**Test Steps:**
```typescript
it("lookupFactor_r32Kaeltemittel_returns675GWP", async () => {
  mockPrisma.emissionFactor.findFirst.mockResolvedValue({ factorKg: 675, unit: "kg", source: "UBA 2024", validYear: 2024 });
  const factor = await lookupFactor("R32_KAELTEMITTEL", 2024);
  expect(factor.factorKg).toBe(675);
});
```

**Expected Result:** `factorKg = 675`

---

### TC-C05: lookupFactor_r134aKaeltemittel_returns1430GWP

**Type:** Unit

**Description:**
Verify that the R134A refrigerant factor key returns GWP = 1430 kg CO₂e/kg.

**File:** `src/lib/factors.test.ts`

**Test Steps:**
```typescript
it("lookupFactor_r134aKaeltemittel_returns1430GWP", async () => {
  mockPrisma.emissionFactor.findFirst.mockResolvedValue({ factorKg: 1430, unit: "kg", source: "UBA 2024", validYear: 2024 });
  const factor = await lookupFactor("R134A_KAELTEMITTEL", 2024);
  expect(factor.factorKg).toBe(1430);
});
```

**Expected Result:** `factorKg = 1430`

---

### TC-C06: lookupFactor_oekostromTrue_usesStromOekostromKey

**Type:** Unit

**Description:**
Verify that passing `options.isOekostrom = true` to `lookupFactor` resolves the factor key
to `STROM_OEKOSTROM` instead of `STROM_MIX`. This test exercises the factor lookup layer of
the Ökostrom calculation path.

**File:** `src/lib/factors.test.ts`

**Test Steps:**
```typescript
it("lookupFactor_oekostromTrue_usesStromOekostromKey", async () => {
  const mockFindFirst = mockPrisma.emissionFactor.findFirst;
  await lookupFactor("STROM", 2024, { isOekostrom: true });
  expect(mockFindFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ key: "STROM_OEKOSTROM" }) })
  );
});
```

**Expected Result:** DB query uses key `"STROM_OEKOSTROM"`.

---

### TC-C07: lookupFactor_oekostromFalse_usesStromMixKey

**Type:** Unit

**Description:**
Verify that without the Ökostrom flag the `lookupFactor` key is `STROM_MIX`. This test
exercises the factor key resolution layer of the non-Ökostrom calculation path.

**File:** `src/lib/factors.test.ts`

**Test Steps:**
```typescript
it("lookupFactor_oekostromFalse_usesStromMixKey", async () => {
  await lookupFactor("STROM", 2024, { isOekostrom: false });
  expect(mockFindFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ key: "STROM_MIX" }) })
  );
});
```

**Expected Result:** DB query uses key `"STROM_MIX"`.

---

### TC-C08: calculateCO2e_multipliesQuantityByFactor

**Type:** Unit

**Description:**
Verify the fundamental contract: `calculateCO2e` returns `quantity × factorKg` for any factor value.

**File:** `src/lib/emissions.test.ts`

**Test Steps:**
```typescript
it("calculateCO2e_multipliesQuantityByFactor", async () => {
  mockLookupFactor.mockResolvedValue({ factorKg: 0.5, unit: "L", source: "UBA 2024" });
  const result = await calculateCO2e("HEIZOEL", 200, 2024);
  expect(result).toBe(100); // 200 × 0.5
});
```

**Expected Result:** `100`

---

### TC-C09: lookupFactor_unknownKey_throwsFactorNotFoundError

**Type:** Unit

**Description:**
Verify that `lookupFactor` throws `FactorNotFoundError` when no DB row exists for the given key.

**File:** `src/lib/factors.test.ts`

**Test Steps:**
```typescript
it("lookupFactor_unknownKey_throwsFactorNotFoundError", async () => {
  mockPrisma.emissionFactor.findFirst.mockResolvedValue(null);
  await expect(lookupFactor("UNKNOWN_KEY", 2024)).rejects.toThrow(FactorNotFoundError);
});
```

**Expected Result:** `FactorNotFoundError` thrown.

---

### TC-C10: lookupFactor_forwardFallback_usesEarliestFactorWhenNoneBeforeYear

**Type:** Unit

**Description:**
Verify the forward fallback: when only a factor for year 2024 is seeded, querying year 2023
returns the 2024 factor (ADR-006 forward fallback).

**File:** `src/lib/factors.test.ts`

**Test Steps:**
```typescript
it("lookupFactor_forwardFallback_usesEarliestFactorWhenNoneBeforeYear", async () => {
  // First call (validYear <= 2023) returns null
  // Second call (earliest factor > 2023) returns 2024 factor
  mockPrisma.emissionFactor.findFirst
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ factorKg: 2.0, unit: "m³", source: "UBA 2024", validYear: 2024 });
  const factor = await lookupFactor("ERDGAS", 2023);
  expect(factor.factorKg).toBe(2.0);
});
```

**Expected Result:** Returns the 2024 factor for a 2023 query.

---

### TC-C11: lookupFactor_exactYearMatch_returnsCorrectFactor

**Type:** Unit

**Description:**
Verify that an exact year match is returned without triggering the fallback.

**File:** `src/lib/factors.test.ts`

**Test Steps:**
```typescript
it("lookupFactor_exactYearMatch_returnsCorrectFactor", async () => {
  mockPrisma.emissionFactor.findFirst.mockResolvedValue({ factorKg: 2.0, unit: "m³", source: "UBA 2024", validYear: 2024 });
  const factor = await lookupFactor("ERDGAS", 2024);
  expect(factor.factorKg).toBe(2.0);
  // Second call (fallback) should NOT have been made
  expect(mockPrisma.emissionFactor.findFirst).toHaveBeenCalledTimes(1);
});
```

**Expected Result:** Factor returned; fallback DB query not triggered.

---

### TC-C12: calculateCO2e_zeroQuantity_returnsZero

**Type:** Unit

**Description:**
Verify that a zero quantity always returns zero CO₂e regardless of the factor.

**File:** `src/lib/emissions.test.ts`

**Test Steps:**
```typescript
it("calculateCO2e_zeroQuantity_returnsZero", async () => {
  mockLookupFactor.mockResolvedValue({ factorKg: 2.0, unit: "m³", source: "UBA 2024" });
  const result = await calculateCO2e("ERDGAS", 0, 2024);
  expect(result).toBe(0);
});
```

**Expected Result:** `0`

---

### TC-C13: calculateCO2e_allEmissionCategoryKeys_resolveWithoutError

**Type:** Unit

**Description:**
Verify that every one of the 23 EmissionCategory keys and 8 MaterialCategory keys can be
passed to `lookupFactor` without throwing a type or key resolution error (validates the
factor key mapping table in §4.2 of architecture.md).

**File:** `src/lib/factors.test.ts`

**Test Steps:**
```typescript
it("lookupFactor_allEmissionCategoryKeys_resolveWithoutError", async () => {
  const allKeys = [
    "ERDGAS", "HEIZOEL", "FLUESSIGGAS",
    "DIESEL_FUHRPARK", "BENZIN_FUHRPARK",
    "PKW_BENZIN_KM", "PKW_DIESEL_KM", "TRANSPORTER_KM", "LKW_KM",
    "R410A_KAELTEMITTEL", "R32_KAELTEMITTEL", "R134A_KAELTEMITTEL", "SONSTIGE_KAELTEMITTEL",
    "STROM_MIX", "STROM_OEKOSTROM", "FERNWAERME",
    "GESCHAEFTSREISEN_FLUG", "GESCHAEFTSREISEN_BAHN", "PENDLERVERKEHR",
    "ABFALL_RESTMUELL", "ABFALL_BAUSCHUTT", "ABFALL_ALTMETALL", "ABFALL_SONSTIGES",
    "KUPFER", "STAHL", "ALUMINIUM", "HOLZ", "KUNSTSTOFF_PVC", "BETON", "FARBEN_LACKE", "MATERIAL_SONSTIGE"
  ];
  mockPrisma.emissionFactor.findFirst.mockResolvedValue({ factorKg: 1.0, unit: "kg", source: "UBA 2024", validYear: 2024 });
  for (const key of allKeys) {
    await expect(lookupFactor(key, 2024)).resolves.toBeDefined();
  }
});
```

**Expected Result:** All keys resolve without error.

---

### TC-I01: saveEntry_manualInput_createsEmissionEntryAndAuditLog

**Type:** Integration

**Description:**
Verify that the `saveEntry` server action creates an `EmissionEntry` with `inputMethod: MANUAL`
and an associated `AuditLog` row in the same transaction.

**File:** `src/lib/actions/entries.test.ts`

**Preconditions:**
- Prisma mocked or test database with a valid `ReportingYear`

**Test Steps:**
1. Call `saveEntry({ reportingYearId: 1, scope: "SCOPE_1", category: "ERDGAS", quantity: 1000, inputMethod: "MANUAL" })`
2. Assert `EmissionEntry` created with correct fields
3. Assert `AuditLog` created with `action: "CREATE"`, `entityType: "EmissionEntry"`, `fieldName: "quantity"`, `newValue: "1000"`

**Expected Result:** Both rows created; action returns `{ success: true }`.

---

### TC-I02: saveEntry_upsertExisting_updatesEntryAndCreatesAuditLogWithOldValue

**Type:** Integration

**Description:**
Verify that re-saving an existing entry updates the `EmissionEntry` and records `oldValue`
in the AuditLog.

**Test Steps:**
1. Seed an `EmissionEntry` with `quantity: 500`
2. Call `saveEntry({ ..., quantity: 800 })`
3. Assert `EmissionEntry.quantity = 800`
4. Assert `AuditLog.action = "UPDATE"`, `oldValue = "500"`, `newValue = "800"`

**Expected Result:** Entry updated; AuditLog records the change.

---

### TC-I03: saveEntry_dbFailure_returnsErrorResult

**Type:** Integration

**Description:**
Verify that a database failure causes `saveEntry` to return `{ success: false }` (not throw).

**Test Steps:**
1. Mock Prisma transaction to throw an error
2. Call `saveEntry(...)`
3. Assert return value is `{ success: false, error: <German message> }`

**Expected Result:** `{ success: false }` with German error message.

---

### TC-I04: deleteEntry_existingEntry_deletesAndCreatesAuditLog

**Type:** Integration

**Description:**
Verify that `deleteEntry` removes the `EmissionEntry` and writes an `AuditLog` row with
`action: "DELETE"`.

**Test Steps:**
1. Seed an `EmissionEntry`
2. Call `deleteEntry(entryId)`
3. Assert entry no longer exists in DB
4. Assert `AuditLog.action = "DELETE"`, `entityType = "EmissionEntry"`

**Expected Result:** Entry deleted; audit log updated.

---

### TC-I05: confirmStagingEntry_ocrInput_createsEntryWithInputMethodOCR

**Type:** Integration

**Description:**
Verify that confirming a staging entry moves it to `EmissionEntry` with `inputMethod: OCR`
and deletes the `StagingEntry` row.

**Test Steps:**
1. Seed a `StagingEntry` for `ERDGAS` with `inputMethod: OCR`
2. Call `confirmStagingEntry(stagingId, documentId)`
3. Assert `EmissionEntry` created with `inputMethod: "OCR"` and `documentId` set
4. Assert `StagingEntry` deleted
5. Assert `AuditLog.inputMethod = "OCR"`, `AuditLog.documentId = documentId`

**Expected Result:** Correct data migration; audit trail complete.

---

### TC-I06: createReportingYear_validYear_createsYearRow

**Type:** Integration

**Description:**
Verify that `createReportingYear` inserts a new `ReportingYear` row.

**Test Steps:**
1. Call `createReportingYear({ year: 2025 })`
2. Assert `ReportingYear` with `year: 2025` exists in DB

**Expected Result:** Row created; action returns `{ success: true }`.

---

### TC-I07: deleteReportingYear_cascadesToAllRelatedData

**Type:** Integration

**Description:**
Verify that deleting a `ReportingYear` cascades to delete all `EmissionEntry`, `MaterialEntry`,
`StagingEntry`, `AuditLog` rows for that year.

**Test Steps:**
1. Seed year 2025 with EmissionEntry, MaterialEntry, and AuditLog rows
2. Call `deleteReportingYear(yearId)`
3. Assert all child rows are deleted

**Expected Result:** All related rows removed.

---

### TC-I08: saveCompanyProfile_allFields_upsertsProfileAndCreatesAuditLog

**Type:** Integration

**Description:**
Verify that `saveCompanyProfile` correctly upserts the single `CompanyProfile` row (id = 1)
and creates an AuditLog entry for each changed field.

**Test Steps:**
1. Call `saveCompanyProfile({ name: "Test GmbH", mitarbeiter: 5, standort: "Berlin", branche: "ELEKTROHANDWERK", ... })`
2. Assert `CompanyProfile` with the provided values exists (id = 1)
3. Assert AuditLog rows created for changed fields

**Expected Result:** Profile saved; audit trail complete.

---

### TC-I09: auditLogPanel_fetchesLast50Entries

**Type:** Integration

**Description:**
Verify that the `/api/audit` route (or equivalent server action) returns at most 50 audit
log entries, ordered by `createdAt DESC`.

**Test Steps:**
1. Seed 60 AuditLog rows
2. Fetch audit log (API route or server action)
3. Assert exactly 50 rows returned, ordered newest-first

**Expected Result:** 50 rows, correct ordering.

---

### TC-W01: statusBadge_allCategoriesPresent_showsErfasst

**Type:** Unit

**Description:**
Verify that the status badge logic returns `"Erfasst"` when all categories for a screen have
an `EmissionEntry`.

**File:** `src/lib/status.test.ts` (or co-located with the status badge utility)

**Test Steps:**
```typescript
it("getScreenStatus_allCategoriesPresent_showsErfasst", () => {
  const entries = [
    { category: "ERDGAS" }, { category: "HEIZOEL" }, { category: "FLUESSIGGAS" },
    { category: "R410A_KAELTEMITTEL" }, { category: "R32_KAELTEMITTEL" },
    { category: "R134A_KAELTEMITTEL" }, { category: "SONSTIGE_KAELTEMITTEL" }
  ];
  expect(getScreenStatus(2, entries)).toBe("Erfasst");
});
```

**Expected Result:** `"Erfasst"`

---

### TC-W02: statusBadge_someCategoriesMissing_showsTeilweise

**Type:** Unit

**Description:**
Verify that the status badge returns `"Teilweise"` when at least one but not all categories are present.

**Test Steps:**
```typescript
it("getScreenStatus_someCategoriesMissing_showsTeilweise", () => {
  const entries = [{ category: "ERDGAS" }]; // missing HEIZOEL, FLUESSIGGAS, etc.
  expect(getScreenStatus(2, entries)).toBe("Teilweise");
});
```

**Expected Result:** `"Teilweise"`

---

### TC-W03: statusBadge_noCategoriesPresent_showsNichtErfasst

**Type:** Unit

**Description:**
Verify that the status badge returns `"Nicht erfasst"` when no categories are present.

**Test Steps:**
```typescript
it("getScreenStatus_noCategoriesPresent_showsNichtErfasst", () => {
  expect(getScreenStatus(2, [])).toBe("Nicht erfasst");
});
```

**Expected Result:** `"Nicht erfasst"`

---

### TC-W04: statusBadge_screen6Material_erfasstIfAtLeastOneRow

**Type:** Unit

**Description:**
Verify that Screen 6 (Materialien) is `"Erfasst"` if at least one `MaterialEntry` exists,
regardless of category.

**Test Steps:**
```typescript
it("getScreenStatus_screen6_erfasstIfAtLeastOneMaterialEntry", () => {
  expect(getMaterialScreenStatus([{ id: 1 }])).toBe("Erfasst");
  expect(getMaterialScreenStatus([])).toBe("Nicht erfasst");
});
```

**Expected Result:** `"Erfasst"` with ≥1 entry; `"Nicht erfasst"` with 0.

---

### TC-W05: plausibilityWarning_outOfRangeValue_rendersWarning

**Type:** Component

**Description:**
Verify that `PlausibilityWarning` renders when the entered value is outside the defined
plausibility range for a field key.

**File:** `src/components/wizard/PlausibilityWarning.test.tsx`

**Test Steps:**
```typescript
it("PlausibilityWarning_outOfRange_rendersWarning", () => {
  render(<PlausibilityWarning fieldKey="ERDGAS" value={999999} />);
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
```

**Expected Result:** Alert visible for extreme value.

---

### TC-W06: plausibilityWarning_inRangeValue_rendersNothing

**Type:** Component

**Description:**
Verify that `PlausibilityWarning` renders nothing when the value is within the normal range.

**Test Steps:**
```typescript
it("PlausibilityWarning_inRange_rendersNothing", () => {
  render(<PlausibilityWarning fieldKey="ERDGAS" value={500} />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
```

**Expected Result:** No alert rendered.

---

### TC-R01: renderReport_ghgProtocol_returnsBufferWithin3Seconds

**Type:** Integration

**Description:**
Verify that `renderReport("GHG", data)` returns a PDF `Buffer` and completes within 3 seconds.

**File:** `src/lib/pdf.test.ts`

**Test Steps:**
1. Provide mock `GHGReportData` with seed-equivalent values
2. Call `renderReport("GHG", data)` with a 3-second timeout
3. Assert the result is a non-empty `Buffer`

**Expected Result:** Non-empty `Buffer` within 3 s.

---

### TC-R02: ghgReportPdf_includesCompanyHeader

**Type:** Unit

**Description:**
Verify that the rendered GHG PDF document tree includes the company name, location, and reporting year.

**File:** `src/components/reports/GHGReport.test.tsx`

**Test Steps:**
```typescript
it("GHGReport_includesCompanyHeader", () => {
  const doc = render(<GHGReport data={mockData} />);
  // Assert company name, location, year appear in the document
  expect(doc.getByText("Mustermann Elektro GmbH")).toBeDefined();
});
```

**Expected Result:** Company header fields present in document tree.

---

### TC-R03: ghgReportPdf_listsUncapturedCategoriesInDataQuality

**Type:** Unit

**Description:**
Verify that categories with no `EmissionEntry` are listed in the data quality section of
the GHG report.

**File:** `src/components/reports/GHGReport.test.tsx`

**Test Steps:**
1. Provide report data with HEIZOEL entry missing
2. Render `<GHGReport data={...} />`
3. Assert "Heizöl" appears in the "nicht erfasst" section

**Expected Result:** Missing categories listed.

---

### TC-R04: badgeApiRoute_returnsPngSvgAndHtml

**Type:** Integration

**Description:**
Verify that `GET /api/badge` responds with the correct content types for the three badge formats.

**File:** `src/app/api/badge/route.test.ts`

**Test Steps:**
1. Call `GET /api/badge?format=png` → assert `Content-Type: image/png`
2. Call `GET /api/badge?format=svg` → assert `Content-Type: image/svg+xml`
3. Call `GET /api/badge?format=html` → assert `Content-Type: text/html` with embed snippet

**Expected Result:** Correct content type per format.

---

### TC-COV01: lib/emissions.ts Coverage ≥ 80%

**Type:** Coverage

**Description:**
Run Vitest coverage for `src/lib/emissions.ts` and assert all coverage thresholds are met.

**Command:**
```bash
cd src && npm run test:coverage -- --coverage.include="lib/emissions.ts"
```

**Expected Result:** Statements ≥ 80%, Branches ≥ 75%, Functions ≥ 80%, Lines ≥ 80%.

---

### TC-COV02: lib/factors.ts Coverage ≥ 80%

**Type:** Coverage

**Description:**
Run Vitest coverage for `src/lib/factors.ts` and assert all coverage thresholds are met.

**Command:**
```bash
cd src && npm run test:coverage -- --coverage.include="lib/factors.ts"
```

**Expected Result:** Statements ≥ 80%, Branches ≥ 75%, Functions ≥ 80%, Lines ≥ 80%.

---

## E2E Test Cases

### TC-E01: Happy Path — Manual Entry to Dashboard Update

**Type:** E2E (Playwright)

**File:** `e2e-tests/wizard/manual-entry-to-dashboard.e2e.ts`

**Tag:** `@feature-001`

**Description:**
Complete the primary happy path: enter Erdgas data on wizard screen 2, verify save, and
check the dashboard CO₂e updates.

**Test Steps:**
```typescript
test("user enters Erdgas value and sees CO₂e update on dashboard", async ({ page }) => {
  await page.goto("http://localhost:3000/wizard/2");
  await page.getByLabel(/erdgas/i).fill("1000");
  await page.getByLabel(/erdgas/i).blur();
  await expect(page.getByText(/gespeichert/i)).toBeVisible();
  await page.goto("http://localhost:3000");
  // Dashboard Scope 1 CO₂e should reflect the new entry
  await expect(page.getByTestId("scope1-total")).toContainText("2.000");
});
```

**Expected Result:** Toast shown; dashboard updated.

---

### TC-E02: Year Selector Switches Dashboard

**Type:** E2E (Playwright)

**File:** `e2e-tests/dashboard/year-selector.e2e.ts`

**Description:**
Verify that selecting a different year in the year selector updates all dashboard charts.

**Test Steps:**
1. Navigate to dashboard showing 2024
2. Click year selector, choose 2023
3. Assert charts re-render with 2023 data

**Expected Result:** Dashboard shows 2023 data without full page reload.

---

### TC-E03: Create New Reporting Year

**Type:** E2E (Playwright)

**File:** `e2e-tests/settings/create-reporting-year.e2e.ts`

**Description:**
Verify the Settings flow for creating a new reporting year.

**Test Steps:**
1. Navigate to `/settings`
2. Click "+ Neues Jahr anlegen"
3. Enter 2025, confirm
4. Navigate to dashboard, assert year 2025 is selectable

**Expected Result:** Year 2025 appears in the year selector.

---

### TC-E04: OCR Preview and Confirmation

**Type:** E2E (Playwright)

**File:** `e2e-tests/wizard/ocr-upload.e2e.ts`

**Description:**
Verify the OCR stub flow: upload → spinner → yellow preview banner → confirm saves with
`inputMethod: OCR`.

**Test Steps:**
1. Navigate to wizard screen 2
2. Click the OCR upload button
3. Assert spinner visible
4. Assert yellow preview banner appears with a value
5. Click "Bestätigen"
6. Assert the value is now shown in the Erdgas field

**Expected Result:** OCR flow completes; value saved with `inputMethod: OCR`.

---

### TC-E05: Generate and Download PDF Report

**Type:** E2E (Playwright)

**File:** `e2e-tests/reports/generate-pdf.e2e.ts`

**Description:**
Verify the report generation flow from dashboard to PDF download.

**Test Steps:**
1. Navigate to `http://localhost:3000`
2. Click "Bericht erstellen"
3. Wait for PDF generation (up to 5 s)
4. Assert a download link appears on the dashboard reports list
5. Click the download link, assert response is a PDF

**Expected Result:** PDF generated and downloadable within 3 seconds.

---

## Test Data Requirements

| File | Description |
|---|---|
| `src/test/fixtures/emission-factors.ts` | Mock `EmissionFactor` objects for all 31 factor keys; used in unit tests for `factors.ts` and `emissions.ts` |
| `src/test/fixtures/emission-entries.ts` | Mock `EmissionEntry` array covering Scope 1/2/3 for a representative year; used in dashboard component tests |
| `src/test/fixtures/company-profile.ts` | Mock `CompanyProfile` for Mustermann Elektro GmbH; used across component and integration tests |
| `src/test/fixtures/audit-logs.ts` | Array of 60 mock `AuditLog` rows for testing the "last 50" truncation behaviour |
| `src/test/fixtures/material-entries.ts` | Mock `MaterialEntry` rows for Kupfer, Stahl, Aluminium; used in Screen 6 and PDF tests |
| `src/test/mocks/prisma.ts` | Vitest mock of `@/lib/prisma` with `vi.mock`; provides chainable query mocks |

---

## Edge Cases

| Scenario | Expected Behavior | Test Case |
|---|---|---|
| Zero quantity entered | `calculateCO2e` returns 0 | TC-C12 |
| Unknown factor key | `FactorNotFoundError` thrown | TC-C09 |
| Factor only exists for future year | Forward fallback returns earliest factor | TC-C10 |
| `saveEntry` DB failure | Returns `{ success: false }` with German message | TC-I03 |
| Altmetall (negative factor) | CO₂e is negative; dashboard total can decrease | TC-C02 |
| Screen 6 with no material rows | Status badge = "Nicht erfasst" | TC-W04 |
| All categories on a screen entered | Status badge = "Erfasst" | TC-W01 |
| Some categories missing | Status badge = "Teilweise" | TC-W02 |
| PDF generated for year with missing categories | Data quality section lists them | TC-R03 |
| 60 audit log entries exist | AuditLogPanel shows exactly 50 | TC-I09 |
| Reporting year deleted with data | All related rows cascade-deleted | TC-I07 |
| Ökostrom flag toggled | Correct factor key used per state | TC-C06, TC-C07 |
| PlausibilityWarning shown | Save proceeds normally (warning does not block) | TC-W05, TC-W06 |
| Value entered, then field blurred | Auto-save fires; toast shown | TC-E01 |

---

## Non-Functional Tests

### Performance

| Test | Threshold | Approach |
|---|---|---|
| Dashboard page load | < 2 seconds | Playwright `page.goto` timing assertion |
| PDF generation | < 3 seconds | `renderReport` call with Vitest timer |
| App startup in Docker | < 30 seconds | Smoke test health-check polling |

### Localisation

| Test | Verification |
|---|---|
| All UI strings are German | Visual spot-check during UAT; CI: no English hardcoded strings in `components/` or `app/` (grep-based lint rule) |
| Numbers use German locale | Unit test: `formatNumber(1234.56)` → `"1.234,56"` (in `utils.test.ts`) |
| Dates use German locale | Unit test: `formatDate(new Date("2024-03-21"))` → `"21.03.2024"` (in `utils.test.ts`) |

### Type Safety

| Test | Verification |
|---|---|
| TypeScript strict mode | `tsc --noEmit` passes in CI (zero errors) |
| No ESLint warnings | `eslint .` returns exit code 0 |
| `next build` clean | `next build` produces no deprecation warnings or type errors |

---

## Open Questions

1. **Prisma mock strategy**: The preferred approach for unit-testing `lib/factors.ts` and
   `lib/emissions.ts` is to mock the `prisma` singleton via `vi.mock("@/lib/prisma")`. If the
   project adds a test database (e.g., SQLite via `prisma://` test URL), integration tests
   should use `prisma.$transaction` rollback for isolation — confirm with Developer.

2. **Coverage tool configuration**: `vitest.config.ts` must specify
   `coverage.provider = "v8"` and `coverage.include = ["src/lib/**"]` to correctly scope
   coverage to `emissions.ts` and `factors.ts`. Confirm coverage thresholds are enforced in CI
   (`coverage.thresholds.statements = 80`).

3. **E2E app URL**: E2E tests assume `http://localhost:3000`. Confirm whether CI spins up
   `docker compose` or `next dev` for the Playwright run.
