# Issue 002: Triple Upload Buttons on Datenerfassung

## Problem Description

Each parameter field in the Datenerfassung (data entry) wizard screens displays **three separate upload UI elements simultaneously**, instead of one. Users are confused about which button to use, and each button has different storage behaviour.

The three buttons shown per parameter are:
1. **"Rechnung hochladen"** (Upload invoice) — top right corner, from `OcrUploadButton`
2. **"Hochladen"** (Upload) — inside the dashed drop-zone, from `FieldDocumentZone`
3. **"+ Beleg hinzufügen"** (Add document) — below the field, from `MultiInvoiceUpload`

---

## Steps to Reproduce

1. Navigate to any wizard data-entry screen (e.g. `/wizard/heizung`, `/wizard/strom`)
2. Look at any parameter input row (e.g. "Erdgas")
3. Observe three separate upload controls rendered under the numeric input

---

## Expected Behavior

Each parameter shows **exactly one upload control** — the `MultiInvoiceUpload` component which handles both OCR extraction and multi-document evidence in a single interface.

---

## Actual Behavior

Three upload controls appear:
- `OcrUploadButton` → "Rechnung hochladen" button (OCR extraction, StagingEntry persistence)
- `FieldDocumentZone` → dashed zone with "Hochladen" link (single-file persistence to disk via `/api/field-documents`)
- `MultiInvoiceUpload` → "+ Beleg hinzufügen" button (multi-file OCR, in-memory state only)

All three target the same semantic purpose (attaching invoice evidence to a parameter) but use **different storage backends**, potentially storing duplicate or conflicting data.

---

## Root Cause Analysis

### Affected Components

| File | Role | Produces |
|------|------|---------|
| `src/components/wizard/OcrUploadButton.tsx` | OCR extraction button | "Rechnung hochladen" |
| `src/components/wizard/FieldDocumentZone.tsx` | Single-file evidence zone | "Hochladen" |
| `src/components/wizard/MultiInvoiceUpload.tsx` | Multi-invoice manager | "+ Beleg hinzufügen" |

### What's Broken — The Sequence of Events

**Step 1 — Original design (correct):**  
Each screen had `OcrUploadButton` + `FieldDocumentZone` per parameter. One button for OCR-fill, one for file evidence. 2 controls.

**Step 2 — Bug 5 partial fix introduced the problem:**  
When `MultiInvoiceUpload` was added to `HeizungScreen` and `StromScreen` (Bug 5), the existing `OcrUploadButton` and `FieldDocumentZone` were **not removed**. This created 3 overlapping upload zones per parameter on those two screens.

**Step 3 — Bug 5 extension made it worse:**  
When Bug 5 was extended to `FuhrparkScreen`, `DienstreisenScreen`, and `AbfallScreen`, the same mistake occurred. Those screens only had 2 controls (`OcrUploadButton` + `FieldDocumentZone`) but would have 3 once `MultiInvoiceUpload` was added without removing the old ones.

**Root cause pattern:**  
Each time `MultiInvoiceUpload` was added as a replacement, the old components were not removed — leaving all three rendered simultaneously.

### Precise Code Location (pre-fix state)

```tsx
// HeizungScreen.tsx — per category render block (before fix)
{FIELD_CONFIG.map(({ category, label, unit, placeholder }) => (
  <div key={category}>
    {/* numeric input ... */}

    {/* Button 1: "Rechnung hochladen" */}
    <OcrUploadButton
      category={category}
      reportingYearId={reportingYearId}
      scope="SCOPE1"
      onResult={(val) => setValue(category, { quantity: val })}
    />

    {/* Button 2: "Hochladen" (inside dashed zone) */}
    <FieldDocumentZone
      fieldKey={`${category}_${year}`}
      year={year}
    />

    {/* Button 3: "+ Beleg hinzufügen" */}
    <MultiInvoiceUpload
      category={category}
      reportingYearId={reportingYearId}
      scope="SCOPE1"
      onTotalChange={(total) => { ... }}
    />
  </div>
))}
```

### Why It Happened

The incremental approach to bug fixes meant each fix was made independently. The developer who added `MultiInvoiceUpload` focused on the additive task (new component) without checking that the replaced components needed removal. The code review (`docs/features/001-bug-fixes/code-review.md`) identified this as **Major Issue #1** after the fact.

---

## Fix Applied

The fix was implemented in commit `7dbae74` ("fix: address code review issues — remove redundant upload UIs, fix changelog deps, escape XML"):

### Files Modified
- `src/components/wizard/screens/HeizungScreen.tsx` — removed `OcrUploadButton` + `FieldDocumentZone` imports and JSX (Bug 8 fix)
- `src/components/wizard/screens/StromScreen.tsx` — removed `OcrUploadButton` + `FieldDocumentZone` imports and JSX (Bug 8 fix)
- `src/components/wizard/screens/FuhrparkScreen.tsx` — removed `OcrUploadButton` + `FieldDocumentZone` imports and JSX (Bug 5 completion)
- `src/components/wizard/screens/DienstreisenScreen.tsx` — removed `OcrUploadButton` + `FieldDocumentZone` imports and JSX (Bug 5 completion)
- `src/components/wizard/screens/AbfallScreen.tsx` — removed `OcrUploadButton` + `FieldDocumentZone` imports and JSX (Bug 5 completion)

### Verification

All five affected screens now use only `MultiInvoiceUpload`:

```bash
$ grep -rn "import.*OcrUploadButton\|import.*FieldDocumentZone" src/components/wizard/screens/
# (no output — both components are no longer imported by any screen)
```

---

## Remaining Technical Debt

Although the 3-button bug is fixed, the following issues remain:

### 1. Dead Code — Unused Components

`OcrUploadButton.tsx` and `FieldDocumentZone.tsx` still exist in the codebase but are no longer imported anywhere:

- `src/components/wizard/OcrUploadButton.tsx` — renders "Rechnung hochladen"; not imported by any screen
- `src/components/wizard/FieldDocumentZone.tsx` — renders "Hochladen"; not imported by any screen (only used internally if re-introduced)

**Recommendation:** Remove these files or mark them deprecated if they might be needed later.

### 2. Stale E2E Tests

`e2e-tests/ocr-stub.spec.ts` (line 4–17) still tests for the **"Rechnung hochladen" button**:

```ts
test('Rechnung hochladen button exists in heizung wizard', async ({ page }) => {
  // ...
  const uploadButton = page.locator(
    'button:has-text("Rechnung"), button:has-text("hochladen"), ...'
  ).first()
```

This test is now stale — "Rechnung hochladen" no longer appears in any wizard screen. However, the test happens to **not fail** because it only asserts that the page loaded without a 500 error (the actual button assertion is absent). This is a false-green test.

`e2e-tests/wizard-flow.spec.ts` (Step 5) also looks for OCR upload buttons using loose text matching that won't detect the absence of the old button.

**Recommendation:** Update `ocr-stub.spec.ts` to test the `MultiInvoiceUpload` flow (file input with `aria-label="Weiteren Beleg hochladen"`), and add a **negative assertion** that verifies "Rechnung hochladen" is NOT present.

### 3. No Regression Test for the 3-Button Bug

There is no test that asserts `OcrUploadButton` and `FieldDocumentZone` are absent from the wizard screens. If they were accidentally re-introduced, no existing test would catch it.

**Recommendation:** Add assertions in `e2e-tests/bug-fixes.spec.ts`:
```ts
test('Bug 8 — only 1 upload button per parameter on Heizung', async ({ page }) => {
  await gotoWizardScreen(page, 'heizung');
  // Assert "Rechnung hochladen" is NOT present
  await expect(page.locator('button:has-text("Rechnung hochladen")')).toHaveCount(0);
  // Assert "Hochladen" (FieldDocumentZone) is NOT present as standalone button
  // Assert "Beleg hinzufügen" IS present (MultiInvoiceUpload)
  await expect(page.locator('button').filter({ hasText: /Beleg hinzufügen/ }).first()).toBeVisible();
});
```

---

## Related Tests

Tests that verify the fix:
- [x] `e2e-tests/bug-fixes.spec.ts` — "Bug 5 — Beleg hinzufügen button is present on Heizung screen" (positive check)
- [x] `e2e-tests/bug-fixes.spec.ts` — "Bug 5 — Beleg hinzufügen button is present on Strom screen" (positive check)
- [ ] Missing: negative assertion that "Rechnung hochladen" is NOT present
- [ ] Missing: update `ocr-stub.spec.ts` to reflect new upload UI

---

## Additional Context

- **Original issue documented in:** `docs/features/001-bug-fixes/issue-analysis.md` (Bug 8 section)
- **Code review that caught the Bug 5 screens problem:** `docs/features/001-bug-fixes/code-review.md` (Major Issue #1)
- **Changes summary:** `docs/features/001-bug-fixes/changes.md` (Fix 5 and Fix 8)
- **Git commit that applied the fix:** `7dbae74` ("fix: address code review issues")
- **Component architecture:** `OcrUploadButton`, `FieldDocumentZone`, and `MultiInvoiceUpload` all exist in `src/components/wizard/` — the first two are now dead code
