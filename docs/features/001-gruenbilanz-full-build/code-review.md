# Code Review Report: GrünBilanz Full Application Build

**Reviewer:** Code Reviewer Agent  
**Date:** 2026-03-24  
**Branch:** `copilot/feature-grunbilanz-full-application-build-again`  
**Work Item:** `docs/features/001-gruenbilanz-full-build/`

---

## Summary

This is the inaugural full-application build of GrünBilanz — a B2B SaaS CO₂ footprint and
ESG reporting tool for German Handwerksbetriebe. The implementation covers 76+ source files
across the Prisma schema, core library, server actions, API routes, dashboard, 7-screen data
wizard, PDF report components, settings page, 27 unit tests (all passing), and 4 Playwright
E2E test files.

The overall code quality is **good**: the core CO₂e calculation engine is well-structured, unit
tests are thorough and properly isolated with Vitest mocks, and the server action audit trail
is mostly consistent. German UI text is coherent throughout.

**However, two runtime-crashing Blockers** must be fixed before release: the OCR route creates
`UploadedDocument` records with the wrong Prisma field names, causing an immediate DB error on
every OCR upload; and the document-download route reads a non-existent field. These bugs exist
in currently-committed code and will prevent two user-facing features from working at all.

**Verdict: CHANGES REQUESTED** — fix the two Blockers, then re-review.

---

## Verification Results

| Check | Result |
|-------|--------|
| Unit tests (`cd src && npm test`) | ✅ 27/27 passing |
| Docker build | Not verified (no Docker daemon in agent environment) |
| Build warnings | ⚠ Vitest CJS deprecation warning in test output |
| Type errors | Not verified (`npm install` unavailable — no internet) |

---

## Specification Compliance

| Acceptance Criterion | Implemented | Tested | Notes |
|---------------------|-------------|--------|-------|
| 11 Prisma models, 10 enums | ✅ | ✅ (schema present) | All models match spec |
| CO₂e calculation engine (`emissions.ts`) | ✅ | ✅ (15 unit tests) | |
| Versioned factor lookup (`factors.ts`) | ✅ | ✅ (12 unit tests) | |
| 7-screen data wizard | ✅ | ✅ (E2E: manual-entry) | |
| Server Actions with audit trail | ✅ (partially) | ❌ (no action-level tests) | See Major Issue #3 |
| OCR upload & staging confirmation | ❌ (runtime crash) | ❌ | **Blocker #1/#2** |
| Document download (`/api/documents/[id]`) | ❌ (runtime crash) | ❌ | **Blocker #2** |
| PDF report generation (GHG/CSRD) | ✅ | ❌ (no integration test) | |
| Sustainability badge (SVG/PNG/HTML) | ✅ | ❌ | `any` types present |
| Settings page (year management) | ✅ | ✅ (E2E: year-management) | |
| AuditLog panel on dashboard | ✅ | — | |
| Scope 1/2/3 dashboard charts | ✅ | — | |
| Industry benchmark comparison | ✅ | — | |
| Seed data (UBA 2024 factors, demo company) | ✅ | — | |
| Docker Compose single-command startup | ✅ | — | |

---

## Critical Issues (Blockers — must fix before release)

### Blocker 1 — OCR Route: Wrong Field Names in `UploadedDocument.create`

**File:** `src/app/api/ocr/route.ts:49–54`

```ts
// CURRENT (broken):
const uploadedDoc = await prisma.uploadedDocument.create({
  data: {
    filename: file.name,
    mimeType: file.type,
    data: Buffer.from(bytes),   // ❌ schema field is `content`, not `data`
                                 // ❌ missing required `sizeBytes: Int`
  },
});
```

The Prisma schema (`prisma/schema.prisma:255–266`) defines:

```prisma
model UploadedDocument {
  sizeBytes  Int
  content    Bytes   // ← field name is `content`
  ...
}
```

**Two bugs in this single block:**

1. Field named `data` does not exist on `UploadedDocument` — Prisma will throw at runtime.
2. Required field `sizeBytes: Int` is absent — Prisma will throw for a different reason.

**Fix:**

```ts
const uploadedDoc = await prisma.uploadedDocument.create({
  data: {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,          // ✅ add required field
    content: Buffer.from(bytes),   // ✅ correct field name
  },
});
```

---

### Blocker 2 — Documents Route: Reads Non-Existent Field `doc.data`

**File:** `src/app/api/documents/[id]/route.ts:3, 26, 30`

```ts
// Comment on line 3:
// The document bytes are stored in UploadedDocument.data (PostgreSQL Bytes).
//                                                    ^^^^^ WRONG — field is `content`

return new NextResponse(doc.data, {           // ❌ runtime error
  headers: {
    'Content-Length': String(doc.data.length), // ❌ runtime error
  },
});
```

The schema field is `content`, not `data`. Accessing `doc.data` returns `undefined`, and
`undefined.length` throws immediately.

**Fix:**

```ts
return new NextResponse(doc.content, {
  headers: {
    'Content-Type': doc.mimeType,
    'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.filename)}"`,
    'Content-Length': String(doc.content.length),
  },
});
```

Also update the comment on line 3 to reference `.content`.

---

## Major Issues (should fix)

### Major 1 — StagingEntry Confirmation: Non-Atomic Transaction in CREATE Path

**File:** `src/lib/actions/staging.ts:62–88`

In the CREATE path of `confirmStagingEntry`, `EmissionEntry` is created **outside** a
transaction (line 62), and then the `stagingEntry.delete + auditLog.create` run in a
**separate** `$transaction` (lines 73–87):

```ts
// ❌ Separate operations — not atomic:
const created = await prisma.emissionEntry.create({ ... });        // step 1

await prisma.$transaction([
  prisma.stagingEntry.delete({ where: { id: stagingId } }),        // step 2
  prisma.auditLog.create({ ... }),                                  // step 3
]);
```

If step 2 or 3 fails (DB transient error), the `EmissionEntry` exists but the staging row
is not deleted and no audit log is written — **data inconsistency**. The comment at the top
of the function says "moves staging → EmissionEntry in a single transaction" but the
implementation contradicts this.

**Fix:** Wrap all three operations in one `$transaction`:

```ts
const [created] = await prisma.$transaction(async (tx) => {
  const entry = await tx.emissionEntry.create({ ... });
  await tx.stagingEntry.delete({ where: { id: stagingId } });
  await tx.auditLog.create({ ... emissionEntryId: entry.id ... });
  return [entry];
});
```

---

### Major 2 — Explicit `any` Types in Badge Route Violate TypeScript Strict Mode

**File:** `src/app/api/badge/route.ts:83–85, 115`

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
...(entries as any[]).map((e: any) => ({ category: e.category as string, ... })),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
...(materialEntries as any[]).map((m: any) => ({ category: m.material as string, ... })),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
return new NextResponse(pngBuffer as any, { ... });
```

`entries` and `materialEntries` are already correctly typed as `EmissionEntry[]` and
`MaterialEntry[]` by Prisma's `findMany` return type. The `any` casts are unnecessary — use
the proper types:

```ts
...entries.map((e) => ({
  category: e.category as string,
  quantity: e.quantity,
  isOekostrom: e.isOekostrom,
})),
...materialEntries.map((m) => ({
  category: m.material as string,
  quantity: m.quantityKg,
})),
```

For `pngBuffer`, cast to `Uint8Array` or use `Buffer` which `NextResponse` accepts.

---

### Major 3 — `GHGReport.tsx` Exceeds 300-Line Convention

**File:** `src/components/reports/GHGReport.tsx` (324 lines)

Exceeds the 300-line limit from `docs/conventions.md`. Should be refactored — the most
natural split would be to extract the styles (`StyleSheet.create(...)` block, ~80 lines)
into a separate `GHGReportStyles.ts` file.

---

## Minor Issues / Suggestions (nice to have)

### Minor 1 — AuditLog Not Written on Initial CompanyProfile Creation

**File:** `src/lib/actions/profile.ts:81–85`

```ts
for (const field of fieldNames) {
  if (updateData[field] !== undefined && existing) {  // `existing` is null on CREATE
    // ... audit entries never added when creating for the first time
  }
}
```

When `CompanyProfile` is first created (id=1 does not yet exist), `existing` is `null` and
the loop body is skipped. No AuditLog entry is written for the initial creation, which
breaks the immutable audit trail for profile data. Fix: also write a CREATE AuditLog entry
when `existing` is null.

---

### Minor 2 — `FuhrparkScreen.updateKmRow` Uses Stale State for Aggregation

**File:** `src/components/wizard/screens/FuhrparkScreen.tsx:89–96`

```ts
const updateKmRow = (id: string, field: keyof KmRow, value: string | number) => {
  setKmRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  // `kmRows` here is stale — setKmRows is async
  const updatedRows = kmRows.map((row) => (row.id === id ? { ...row, [field]: value } : row));
  // ...aggregate `updatedRows` into entry values
};
```

Both `setKmRows` (functional form) and `updatedRows` compute the same transformation on
different snapshots of `kmRows`. For single-user input this is unlikely to cause observable
bugs, but it could be cleaned up by computing `updatedRows` once and using it in both places:

```ts
const updated = kmRows.map((row) => (row.id === id ? { ...row, [field]: value } : row));
setKmRows(updated);
// aggregate `updated` ...
```

---

### Minor 3 — Year Range Not Validated in `createReportingYear`

**File:** `src/lib/actions/years.ts:13`, `src/app/api/years/route.ts:20–22`

`createReportingYear(0)` or `createReportingYear(99999)` would silently succeed. Add a basic
range check (e.g. 1900–2100) in the server action to provide a useful error message.

---

### Minor 4 — `StagingEntry.rawText` Never Populated

**File:** `src/app/api/ocr/route.ts`

The schema defines `rawText String?` on `StagingEntry` for "original OCR text for
debugging", but the OCR route never writes it. The field is optional and the stub has no
raw text, so this is non-blocking — but if the real Tesseract integration is ever wired up,
`rawText` should be populated for auditability.

---

### Suggestion — Vitest Deprecation Warning

The test output contains:

```
The CJS build of Vite's Node API is deprecated.
See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated
```

Per `docs/conventions.md`: "No build warnings". Resolve by adding `"type": "module"` to
`src/package.json` or updating the Vitest config to use ES modules.

---

### Suggestion — `calculateTotalCO2e` Error Propagation Not Documented

**File:** `src/lib/emissions.ts:65–73`

If any entry's factor is missing, `Promise.all` rejects and the entire function throws
`FactorNotFoundError`. The dashboard's `computeCategoryTotals` handles this silently (per
entry), but the reports route does not — it would return HTTP 500 if any factor is missing.
This is an acceptable design choice, but it should be documented in the JSDoc with a
`@throws` annotation:

```ts
/**
 * @throws {FactorNotFoundError} if any entry has an unknown emission category
 */
```

---

## Work Protocol & Documentation Verification

### Work Protocol

| Agent | Entry Present |
|-------|--------------|
| Requirements Engineer | ✅ |
| Architect | ✅ |
| Quality Engineer | ✅ |
| Task Planner | ✅ |
| Developer (3 phases) | ✅ |
| Technical Writer | ✅ |
| Security Patch | ✅ |
| Code Reviewer | ✅ (this entry) |

All required agents for a feature workflow have logged entries. ✅

### Global Documentation

| Document | Status | Notes |
|----------|--------|-------|
| `docs/architecture.md` | ✅ No update needed | This document IS the architecture spec; it was the source of truth for implementation |
| `docs/features.md` | N/A | No `docs/features.md` exists in this project; features are tracked under `docs/features/` |
| `docs/testing-strategy.md` | ⚠ Minor gap | E2E test registry section contains placeholder content ("Feature 001: User Login") that was not updated to list the actual test files created (`smoke.spec.ts`, `manual-entry.spec.ts`, etc.) |
| `README.md` | ✅ Updated | Listed in changed files |
| `docs/agents.md` | ✅ No update needed | Agent workflow unchanged |

The testing-strategy.md gap is cosmetic (template placeholders) — categorised as a **Minor** issue.

---

## Adversarial Testing

| Test Case | Result | Notes |
|-----------|--------|-------|
| Zero quantity CO₂e calculation | ✅ Pass | Short-circuit tested in unit test |
| Empty entry array aggregation | ✅ Pass | Returns 0 without DB calls |
| Unknown emission category | ✅ Pass | `FactorNotFoundError` propagated |
| OCR upload (POST /api/ocr) | ❌ Runtime crash | Blocker #1 — wrong Prisma field names |
| Document download (GET /api/documents/[id]) | ❌ Runtime crash | Blocker #2 — reads `doc.data` not `doc.content` |
| Year creation duplicate | ✅ Pass | `findUnique` check before create |
| Staging confirmation race | ⚠ Partial | Non-atomic CREATE path — see Major #1 |
| Large file upload (>10 MB) | ✅ Pass | Size check present in OCR/CSV/field-docs routes |
| Invalid file type for OCR | ✅ Pass | MIME type allow-list check present |
| Logo > 10 MB in profile | ✅ Pass | Size validated in `saveCompanyProfile` |

---

## Critical Questions Answered

- **What could make this code fail?**  
  The OCR upload and document download features will crash immediately due to Prisma field
  name mismatches. The staging confirmation CREATE path can produce orphaned entries under
  transient DB errors.

- **What edge cases might not be handled?**  
  Year range validation is absent (year=0 is valid). Negative quantities are not blocked for
  categories where they would be nonsensical (e.g. ERDGAS). The `calculateTotalCO2e` function
  will propagate `FactorNotFoundError` if any entry has an unrecognised category — callers
  must handle this.

- **Are all error paths tested?**  
  The unit tests cover the error propagation from `lookupFactor`, but server actions and API
  routes have no integration tests. The E2E tests are smoke-level and do not exercise error
  paths.

---

## Review Checklist Summary

| Category | Status |
|----------|--------|
| Correctness (core calculation) | ✅ |
| Spec Compliance | ⚠ (2 Blockers in OCR/docs routes) |
| Code Quality | ⚠ (Major: `any` types, file length, non-atomic transaction) |
| Architecture | ✅ |
| Testing | ✅ (unit) / ⚠ (no integration/action-level tests) |
| TypeScript Strict Mode | ⚠ (explicit `any` in badge route) |
| Documentation | ✅ (minor: testing-strategy placeholder) |
| Work Protocol | ✅ |

---

## Verdict

**CHANGES REQUESTED**

The two Blockers must be resolved before this PR is merged:

1. Fix `UploadedDocument` create in `src/app/api/ocr/route.ts` (wrong field name `data` → `content`; add `sizeBytes`)
2. Fix document download in `src/app/api/documents/[id]/route.ts` (`doc.data` → `doc.content`)

After the Blockers are fixed, the remaining Major issues (non-atomic staging transaction,
`any` types, file length) should also be addressed in the same patch.

---

## Next Steps

Hand off to the **Developer** agent with these specific tasks:

1. Fix `src/app/api/ocr/route.ts:49–54` — rename `data` to `content`, add `sizeBytes: file.size`
2. Fix `src/app/api/documents/[id]/route.ts:26,30` — rename `doc.data` → `doc.content`
3. Fix `src/lib/actions/staging.ts:62–88` — wrap CREATE path in single `$transaction`
4. Fix `src/app/api/badge/route.ts:83–85,115` — remove `any` casts
5. Refactor `src/components/reports/GHGReport.tsx` — extract styles to reduce to ≤300 lines

After Developer fixes, return to Code Reviewer for re-approval, then proceed to UAT Tester.
