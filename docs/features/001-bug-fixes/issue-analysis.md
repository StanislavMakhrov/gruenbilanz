# Issue Analysis: 8 UI/UX Bugs — GrünBilanz

**Branch:** `copilot/feature-grunbilanz-full-application-build-again`  
**Analyst:** Issue Analyst Agent  
**Date:** 2025-07-14  

---

## Overview

This document investigates 8 reported bugs in the GrünBilanz Next.js application. For each bug, the analysis identifies the root cause (file + line number), current status (fixed/present/partial), and the recommended fix.

---

## Bug 1 — Badge Button Loads Wrong Content

### Problem Description
Clicking "Nachhaltigkeits-Badge / Digital Badge for Your Website (Demo)" in the dashboard's report buttons section was loading the same content as "GHG-Bericht erstellen / GHG Protocol-compliant PDF Report" (a PDF download) instead of an SVG badge.

### Root Cause

**File:** `src/components/dashboard/ReportButtons.tsx`

The original bug was that the `handleGenerate` function mapped the `BADGE` type to `GHG_PROTOCOL` before calling `POST /api/reports`, which produced a PDF report instead of the SVG badge. The likely original broken code was:

```ts
// Bug: BADGE silently mapped to GHG_PROTOCOL — causes PDF download instead of SVG
const apiType = type === 'BADGE' ? 'GHG_PROTOCOL' : type;
await downloadReport(reportingYearId, apiType);
```

### Current Status: ✅ Fixed

The current code correctly separates the two flows:

```ts
// ReportButtons.tsx — handleGenerate()
if (type === 'BADGE') {
  await downloadBadge(reportingYearId);   // → GET /api/badge  (SVG)
} else {
  await downloadReport(reportingYearId, type); // → POST /api/reports (PDF)
}
```

**Residual minor issue:** `downloadBadge` passes `reportingYearId` as a query param but the badge API (`/api/badge`) only reads the `year` calendar year param, not `reportingYearId`. The param is silently ignored and the badge always uses the most recently created year from the DB. This is harmless in single-year setups but could show the wrong year badge in multi-year scenarios.

### Recommended Fix (Residual Issue)
In `downloadBadge()` (line ~62), change:
```ts
await fetch(`/api/badge?format=svg&reportingYearId=${reportingYearId}`)
```
to pass the actual calendar year:
```ts
// Resolve the calendar year from the reporting year before calling
await fetch(`/api/badge?format=svg&year=${calendarYear}`)
```
Or update the badge API to also accept `reportingYearId` as a lookup parameter.

---

## Bug 2 — Poor UI/UX Design

### Problem Description
The design is described as too simplistic and not meeting modern UI/UX standards.

### Root Cause

**Files:** `src/app/globals.css`, `src/tailwind.config.ts`, `src/app/layout.tsx`, `src/app/wizard/WizardLayoutInner.tsx`

The application uses a Tailwind CSS-based design system with shadcn/ui-style CSS custom properties for theming. The design system is correctly configured (CSS variables, green primary colour `hsl(142.1 76.2% 36.3%)`), but several UX gaps remain:

1. **`src/app/layout.tsx` (line ~47):** The navigation uses a hand-coded inline SVG for the settings icon, while `WizardLayoutInner.tsx` uses `lucide-react` — inconsistent icon system.
2. **No dark mode toggle exposed:** Dark mode CSS variables are defined in `globals.css` but there is no UI control to switch modes.
3. **No skeleton loading states:** Loading feedback is plain `animate-pulse` text (`"Daten werden geladen…"`), not proper skeleton cards.
4. **`src/app/wizard/WizardLayoutInner.tsx`:** The wizard sidebar lacks visual hierarchy — no icons for screen types, no section grouping (Scope 1 / Scope 2 / Scope 3).
5. **`src/components/dashboard/KpiCard.tsx` et al.:** Dashboard KPI cards are unstyled beyond basic Tailwind utilities; no data visualisation polish.

### Current Status: ⚠️ Partially Addressed

The WizardLayoutInner comment notes "Uses lucide-react icons for visual consistency (Bug 2 fix)", indicating work was done here. The design system foundation is solid.

### Recommended Fix
- Replace the hand-coded inline SVG settings icon in `layout.tsx` with `import { Settings } from 'lucide-react'`.
- Add `aria-busy` skeleton loading cards to replace the `animate-pulse` text strings.
- Group wizard sidebar links by scope (Scope 1 / Scope 2 / Scope 3) with section labels.
- Add a `<ThemeToggle>` component in the nav to expose the already-defined dark mode CSS.

---

## Bug 3 — Uploaded Files Not Persisted Across Page Reloads

### Problem Description
Files uploaded in the Datenerfassung (data entry) screens are not visible after a page reload. The green "Beleg vorhanden" indicator disappears and the uploaded invoice list is empty even though files were successfully saved.

### Root Cause

**File 1: `src/components/wizard/FieldDocumentZone.tsx` (lines 27-31)**

`FieldDocumentZone` initialises `hasDocument` state from the `initialHasDoc` prop (defaulting to `false`), but **never calls `GET /api/field-documents`** to check whether a document already exists for the given `fieldKey`+`year`. On page reload, the component always starts as "no document uploaded" even though the database holds a persisted record.

```ts
// FieldDocumentZone.tsx — no useEffect to query existing document
const [hasDocument, setHasDocument] = useState(initialHasDoc); // always false on reload
// Missing:
// useEffect(() => {
//   fetch(`/api/field-documents?fieldKey=${fieldKey}&year=${year}`)
//     .then(r => r.json())
//     .then(doc => { if (doc) setHasDocument(true); });
// }, [fieldKey, year]);
```

The parent screens (`HeizungScreen`, `StromScreen`, etc.) never pass `hasDocument={true}` to `FieldDocumentZone` because they don't query the existing documents themselves either.

**File 2: `src/components/wizard/MultiInvoiceUpload.tsx` (line 56)**

`MultiInvoiceUpload` initialises `entries` as an empty array and has **no `useEffect`** to load previously uploaded invoices. Each file uploaded via `MultiInvoiceUpload` is processed through `/api/ocr` which creates a `StagingEntry` (expires in 24 hours) — there is no permanent per-invoice storage that the component can reload on mount.

```ts
// MultiInvoiceUpload.tsx
const [entries, setEntries] = useState<InvoiceEntry[]>([]); // always empty on reload
// No useEffect to restore previously uploaded invoice list from DB
```

### Current Status: ❌ Still Present

**Affected screens:** All wizard data-entry screens (`HeizungScreen`, `StromScreen`, `FuhrparkScreen`, `DienstreisenScreen`, `AbfallScreen`).

### Recommended Fix

**Fix 1 — `FieldDocumentZone.tsx`:** Add a `useEffect` that calls `GET /api/field-documents?fieldKey=X&year=Y` on mount and sets `hasDocument: true` if a record is returned:

```ts
useEffect(() => {
  fetch(`/api/field-documents?fieldKey=${encodeURIComponent(fieldKey)}&year=${year}`)
    .then(r => r.json())
    .then(doc => { if (doc?.id) setHasDocument(true); })
    .catch(() => null);
}, [fieldKey, year]);
```

**Fix 2 — `MultiInvoiceUpload.tsx`:** Persist each invoice to `FieldDocument` on upload (using a new `billingMonth`-aware endpoint or extending the existing one), and load them on mount. Alternatively, store multi-invoice entries in `EmissionEntry` rows directly (using `billingMonth` and `providerName` fields that the Prisma schema already supports).

---

## Bug 4 — Audit Doesn't Save Value Changes

### Problem Description
When values are changed in the data entry screens and the user tries to save, changes may be silently dropped or the changelog may not reflect recent changes.

### Root Cause

**Sub-bug 4a — File: `src/components/wizard/useEntries.ts` (line ~80)**

The `saveCategory` function has a guard that silently skips saving when `quantity === 0`:

```ts
// useEntries.ts — saveCategory()
const entry = values[category];
if (!entry || entry.quantity === 0) return true; // Nothing to save ← BUG
```

This prevents saving legitimate corrections. If a user previously entered `8500` for ERDGAS, then corrects it to `0` (e.g., they had the wrong year data), the save is silently no-op'd and the database retains the incorrect `8500` value. The function returns `true` (success) giving false feedback.

**Sub-bug 4b — File: `src/components/wizard/ScreenChangeLog.tsx` (line ~50)**

The changelog fetch is cached for the lifetime of the component and never refreshes:

```ts
// ScreenChangeLog.tsx — useEffect guard
if (!isOpen || !reportingYearId || logs.length > 0) return; // never re-fetches
```

After a user saves new data and expands the changelog, if the panel was opened before the save, it shows stale log entries. The `logs.length > 0` guard prevents a refresh even when new data has been saved.

### Current Status: ❌ Still Present (both sub-bugs)

The `ScreenChangeLog` filter logic (reading `metadata.category`) is correct and was properly fixed, but the caching issue and the zero-quantity guard remain.

### Recommended Fix

**Fix 4a — `useEntries.ts`:** Remove the zero-quantity guard, or change it to only skip when the entry doesn't exist yet (first entry, nothing to update):

```ts
// Allow saving zero to clear/correct a previously non-zero entry
if (!entry) return true; // Only skip if category doesn't exist at all
if (entry.quantity === 0) {
  // If no existing DB entry, nothing to save; if existing entry, must save 0
  // Better: always attempt save and let server-side upsert handle it
}
```

**Fix 4b — `ScreenChangeLog.tsx`:** Reset the `logs` state when the panel is re-opened or after a save, or add a dependency that triggers a refresh:

```ts
// Option: reset logs when panel closes so re-open triggers a fresh fetch
const handleToggle = () => {
  if (isOpen) setLogs([]); // clear cache on close so next open re-fetches
  setIsOpen(v => !v);
};
```

---

## Bug 5 — Only 1 Invoice Per Category

### Problem Description
The UI only allows uploading a single invoice per emission category. Users need to upload multiple invoices (e.g., 12 monthly invoices + 1 annual reconciliation statement).

### Root Cause

**Original design:** `FieldDocumentZone` uses a `@@unique([fieldKey, year])` Prisma constraint (one document per field+year). This enforces a single-document limit at the database level.

**Partial fix applied:** `MultiInvoiceUpload` component (`src/components/wizard/MultiInvoiceUpload.tsx`) was added and integrated into `HeizungScreen` and `StromScreen`. However:

1. **`FuhrparkScreen.tsx`, `DienstreisenScreen.tsx`, `AbfallScreen.tsx`:** Do NOT include `MultiInvoiceUpload` — only have the legacy single-upload controls (`OcrUploadButton` + `FieldDocumentZone`).
2. **`MultiInvoiceUpload` is memory-only:** Invoice entries exist in React state only. There is no persistence of the invoice list to the database (files go through OCR → StagingEntry which expires in 24 hours). After a page reload, all multi-invoice entries are lost (linked to Bug 3).
3. **`FieldDocument` schema** (`prisma/schema.prisma` line ~175) has `@@unique([fieldKey, year])` which only allows one document per field — multi-invoice needs a new table or a relaxed constraint.

### Current Status: ⚠️ Partially Fixed (HeizungScreen, StromScreen only; not persisted)

### Recommended Fix

1. Add `MultiInvoiceUpload` to `FuhrparkScreen`, `DienstreisenScreen`, and `AbfallScreen`.
2. Persist multi-invoice entries: either extend `FieldDocument` to allow multiple rows per `fieldKey`+`year` (remove the unique constraint, add `billingMonth` column), or save each invoice as a separate `EmissionEntry` row using the existing `billingMonth` field.
3. Load persisted invoice list on component mount (links to Bug 3 fix).

---

## Bug 6 — Firmenprofil Default Values Missing

### Problem Description
When navigating to the "Firmenprofil" (Company Profile) wizard screen, the fields appear empty even though the main dashboard already shows the company name (e.g., "Mustermann Elektro GmbH"). The form does not show the values stored in the database.

### Root Cause

**File: `src/components/wizard/screens/FirmenprofilScreen.tsx` (lines 47-51, 57-67)**

The form state is initialised with empty strings, and the database values are loaded asynchronously via `useEffect` with no loading indicator:

```ts
// FirmenprofilScreen.tsx — initial state
const [form, setForm] = useState<ProfileState>({
  firmenname: '',         // ← blank on first render
  branche: 'ELEKTROHANDWERK',
  mitarbeiter: '',        // ← blank on first render
  standort: '',
  // ...
});

// useEffect fires after render — form is blank until API responds
useEffect(() => {
  fetch('/api/profile')
    .then((r) => r.json())
    .then((data) => {
      if (!data) return; // silent — keeps blank form
      setForm({...}); // populates ~100-300ms later
    })
    .catch(() => null); // silent failure — form stays blank
}, []);
```

There are two failure modes:
1. **UX flash:** The form always renders empty first, then updates after the API responds — users see blank fields briefly which looks like "values missing."
2. **Silent error swallowing:** The `catch(() => null)` silently discards network/DB errors. If the API is slow or unavailable, the form stays empty with no feedback.
3. **Error response not detected:** The `useEffect` calls `r.json()` without checking `r.ok`. If the API returns `{ error: '...' }` with HTTP 500, the code tries to populate form fields from `{ error: '...' }`, getting `undefined` for all fields (mapped to `''`).

### Current Status: ❌ Still Present

### Recommended Fix

1. Add a `isLoadingProfile` state and display a loading skeleton (or disable inputs) while the API is fetching.
2. Check `r.ok` before calling `.json()`:
   ```ts
   .then(async (r) => {
     if (!r.ok) throw new Error('Profile load failed');
     return r.json();
   })
   .catch((err) => { console.error(err); /* optionally show toast */ })
   ```
3. Alternatively, lift the profile fetch to the `WizardScreenPage` server component so `FirmenprofilScreen` receives `initialProfile` as a prop and can render with data immediately (no flash).

---

## Bug 7 — Company Logo Upload Doesn't Work

### Problem Description
The logo upload functionality on the Firmenprofil screen is broken — logos cannot be saved or are not displayed after saving.

### Root Cause

**File: `src/components/wizard/screens/FirmenprofilScreen.tsx` (lines 83-109)**

The `handleLogoUpload` function uses `FileReader` to encode the image as a base64 data URL, then calls the `saveCompanyProfile` server action with `logoBase64` and `logoMimeType`. The server action stores `data:<mime>;base64,<data>` in the `logoPath` DB column. On page reload, `useEffect` loads the profile (including `logoPath`) and sets the form state which renders a preview `<img>`.

**Two specific bugs:**

**Bug 7a — No `reader.onerror` handler:**

```ts
const reader = new FileReader();
reader.onload = async () => { /* saves logo */ };
reader.readAsDataURL(file);
// Missing: reader.onerror = () => { toast.error('Bild konnte nicht gelesen werden.'); };
```

If the FileReader fails (corrupted file, permission issue), the upload silently fails with no user feedback.

**Bug 7b — API error response not detected in `useEffect` (shared with Bug 6):**

The `useEffect` for loading the profile (lines 57-67) does not check `r.ok`. If the profile API returns an HTTP 500 error, the code tries to populate `logoPath` from an error response object, getting `undefined` which maps to `null` — logo never appears even if it was successfully saved.

**Bug 7c — No error if `saveCompanyProfile` is called before a profile row exists (race condition):**

The upsert in `saveCompanyProfile` creates a profile with placeholder `firmenname: 'Mein Unternehmen'` if no row exists. If a user uploads a logo as their FIRST action (without first saving the company name), a profile row is silently created with incorrect placeholder name.

### Current Status: ⚠️ Mostly Working, Edge Cases Broken

The happy path (upload logo → save → reload → see logo) works correctly. The edge cases above cause silent failures.

### Recommended Fix

1. Add `reader.onerror`:
   ```ts
   reader.onerror = () => toast.error('Logo konnte nicht gelesen werden.');
   ```
2. Check `r.ok` in the profile `useEffect` (same fix as Bug 6).
3. Warn user if no profile name exists before logo upload, or allow logo-only save without overwriting existing profile fields.

---

## Bug 8 — 3 Redundant Upload Buttons Per Parameter on Datenerfassung

### Problem Description
Each parameter in the Datenerfassung (data entry) screens displays three overlapping upload UI elements:
1. **"Rechnung hochladen"** button (top-right, from `OcrUploadButton`)
2. **"Hochladen"** link inside the dashed dropzone (from `FieldDocumentZone`)
3. **"+ Beleg hinzufügen"** button below (from `MultiInvoiceUpload`)

This is confusing — users don't know which to use, and all three have different purposes and persistence behaviours.

### Root Cause

**Files:** `src/components/wizard/screens/HeizungScreen.tsx` (lines ~97-115), `src/components/wizard/screens/StromScreen.tsx` (lines ~70-85)

When `MultiInvoiceUpload` was added to support multiple invoices (Bug 5 fix), the existing `OcrUploadButton` and `FieldDocumentZone` components were NOT removed. All three now co-exist in the same parameter block:

```tsx
// HeizungScreen.tsx — per category render (lines ~97-115)
// 1. OcrUploadButton — "Rechnung hochladen"
<OcrUploadButton category={category} ... />

// 2. FieldDocumentZone — "Hochladen" link inside dropzone
<FieldDocumentZone fieldKey={`${category}_${year}`} year={year} />

// 3. MultiInvoiceUpload — "+ Beleg hinzufügen"
<MultiInvoiceUpload category={category} ... />
```

Each component has a different underlying mechanism:
- `OcrUploadButton`: Sends to `/api/ocr` → creates StagingEntry → pre-fills the numeric input
- `FieldDocumentZone`: Sends to `/api/field-documents` → persists file path to disk
- `MultiInvoiceUpload`: Sends to `/api/ocr` → creates StagingEntry; list is in-memory only

**Affected screens:** `HeizungScreen` (7 parameters × 3 buttons = 21 upload controls), `StromScreen` (2 parameters × 3 buttons = 6 upload controls). `FuhrparkScreen`, `DienstreisenScreen`, and `AbfallScreen` only have 2 each (OCR button + document zone).

### Current Status: ❌ Still Present

### Recommended Fix

Consolidate all three upload mechanisms into a single enhanced `MultiInvoiceUpload` component that:
1. Supports OCR extraction (pre-fill the numeric input) — absorbing `OcrUploadButton`
2. Persists files to DB/disk — replacing `FieldDocumentZone`
3. Shows a list of uploaded invoices with month/annual labels — existing `MultiInvoiceUpload` behaviour

Remove standalone `OcrUploadButton` and `FieldDocumentZone` from each parameter row in `HeizungScreen` and `StromScreen`. Update `MultiInvoiceUpload` to accept an `onOcrResult` callback for pre-filling the parent input.

```tsx
// Simplified per-parameter block (after fix):
<MultiInvoiceUpload
  category={category}
  reportingYearId={reportingYearId}
  scope="SCOPE1"
  year={year}
  onOcrResult={(v) => setValue(category, { quantity: v })}
  onTotalChange={(total) => { if (total > 0) setValue(category, { quantity: total }); }}
/>
// OcrUploadButton and FieldDocumentZone removed
```

---

## Summary Table

| Bug | Description | Status | Primary Files | Fix Complexity |
|-----|-------------|--------|---------------|----------------|
| 1 | Badge button routes to wrong API | ✅ Fixed (minor residual) | `ReportButtons.tsx` | Low |
| 2 | Poor UI/UX design | ⚠️ Partially addressed | `globals.css`, `layout.tsx`, `WizardLayoutInner.tsx` | Medium |
| 3 | Uploaded files not persisted on reload | ❌ Still present | `FieldDocumentZone.tsx`, `MultiInvoiceUpload.tsx` | Medium |
| 4 | Zero-value changes not saved; changelog staleness | ❌ Still present | `useEntries.ts`, `ScreenChangeLog.tsx` | Low |
| 5 | Only 1 invoice per category | ⚠️ Partial (2/5 screens; not persisted) | `HeizungScreen.tsx`, `StromScreen.tsx` | Medium |
| 6 | Firmenprofil default values not shown | ❌ Still present | `FirmenprofilScreen.tsx` | Low |
| 7 | Company logo upload edge cases | ⚠️ Happy path works | `FirmenprofilScreen.tsx` | Low |
| 8 | 3 redundant upload buttons per parameter | ❌ Still present | `HeizungScreen.tsx`, `StromScreen.tsx` | Medium |

---

## Related Tests

The following tests in `src/__tests__/bugfixes.test.ts` cover the logic layers of some bugs:
- `Bug 1 — Badge button routing` ✅ passing
- `Bug 3 — OcrApiResponse field mapping` ✅ passing
- `Bug 4 — ScreenChangeLog metadata filter` ✅ passing
- `Bug 6 — Profile API response shape` ✅ passing

UI-only bugs (2, 5, 7, 8) require component or E2E tests.

---

## Recommended Implementation Order

1. **Bug 4a** (zero-value save skip) — 1-line fix, high impact, no risk
2. **Bug 6** (profile form loading state + error handling) — quick UX win
3. **Bug 7** (logo error handling) — quick defensive fix
4. **Bug 8** (consolidate upload controls) — removes confusion before multi-invoice work
5. **Bug 3** (file persistence on reload) — requires `FieldDocumentZone` useEffect and schema consideration
6. **Bug 5** (multi-invoice on all screens + persistence) — depends on Bug 3 fix
7. **Bug 1 residual** (pass calendar year to badge API) — low priority
8. **Bug 2** (UI polish) — ongoing; can be split into smaller iterative improvements
