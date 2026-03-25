# Issue Analysis: 7 Reported Bugs in GrünBilanz Application

**Feature:** `docs/features/001-gruenbilanz-full-build/`
**Branch:** `copilot/feature-grunbilanz-full-application-build-again`
**Analyst:** Issue Analyst Agent
**Date:** 2026-03-25

---

## Summary

Seven bugs were identified by the Maintainer after reviewing the running application. This document provides root cause analysis, affected files, and proposed fix approaches for each bug. Bugs 3, 4, and 6 are the most impactful — each has multiple root causes. Bugs 1, 5, 6, 7 are strongly interrelated (Badge, multi-invoice, profile loading, logo upload all affect core data flows).

---

## Bug 1 — Badge Button Loads GHG PDF

### Problem Description

Clicking "Nachhaltigkeits-Badge / Digital Badge for Your Website (Demo)" on the dashboard triggers a download of the same content as clicking "GHG-Bericht erstellen / GHG Protocol-compliant PDF Report" instead of showing/downloading the sustainability badge.

### Root Cause Analysis

**Affected file:** `src/components/dashboard/ReportButtons.tsx`, line 39

The `downloadReport` helper explicitly remaps the `BADGE` type to `GHG_PROTOCOL` before calling the API:

```typescript
// Line 39 — root cause
const apiType = type === 'BADGE' ? 'GHG_PROTOCOL' : type;
```

This means clicking the Badge button calls `POST /api/reports` with `type: 'GHG_PROTOCOL'`, generating an identical GHG Protocol PDF. The dedicated badge API at `GET /api/badge` (which returns SVG, PNG, or HTML embed snippets with live CO₂e data) is **never called at all** from the dashboard. The comment on line 38 confirms this was an intentional placeholder:

```typescript
// BADGE is a demo — same endpoint, different label
```

There is also a schema-level constraint: `BADGE` is not a valid `ReportType` enum value (`prisma/schema.prisma` lines 210–213 only defines `GHG_PROTOCOL` and `CSRD_QUESTIONNAIRE`). If `BADGE` were ever passed directly to `/api/reports`, the `prisma.report.create` at line 63–68 of `src/app/api/reports/route.ts` would throw a Prisma validation error.

### Affected Files

- `src/components/dashboard/ReportButtons.tsx` — line 39 (the misrouting)
- `src/app/api/badge/route.ts` — correct badge API exists but is unused from the dashboard

### Proposed Fix Approach

Replace the Badge button's handler so it calls `GET /api/badge` instead of `POST /api/reports`. Concretely:

1. Add a separate `downloadBadge(reportingYearId: number)` function in `ReportButtons.tsx` that calls `/api/badge?format=svg&year=<year>` or shows an HTML embed snippet modal.
2. Remove the `const apiType = type === 'BADGE' ? 'GHG_PROTOCOL' : type;` line.
3. In `REPORT_CONFIGS`, add an `href` or `mode` field to distinguish badge actions from PDF actions.
4. The `ReportType` enum in `REPORT_CONFIGS` (client-side, line 17) is separate from the Prisma enum — the client-side `BADGE` type can be kept for UI differentiation, but must route to the badge API rather than the reports API.

---

## Bug 2 — UI/UX Too Simplistic

### Problem Description

The design does not meet modern UI/UX standards. The application is functional but lacks the visual polish expected of a professional sustainability reporting tool.

### Root Cause Analysis

**Affected files:** `src/app/globals.css`, all screen components under `src/components/`

The CSS layer (`globals.css`) correctly defines the Tailwind CSS custom property tokens (green primary, semantic colors, radius), and the components use shadcn/ui-style class naming conventions. However, the implementation shows several design gaps:

1. **No component library integration** — The project declares shadcn/ui-style CSS variables but does not use the actual shadcn/ui component library (`@radix-ui/*` primitives, `class-variance-authority`). All UI elements are hand-rolled with plain HTML + Tailwind.
2. **Limited visual hierarchy** — Dashboard cards use `shadow-sm` only; no elevation layers, no hover transitions on cards, no skeleton loading states.
3. **No icon library** — Icons are Unicode emoji (📄, 📎, 🔍) rather than a consistent SVG icon set (e.g. Lucide React, which ships with shadcn/ui).
4. **Missing interactive states** — Form inputs lack focus-ring animation, loading states are a simple `animate-pulse` text string, and buttons have minimal hover feedback.
5. **Typography scale incomplete** — All headings use `text-xl font-semibold`; there is no distinct `h1`/`h2`/`h3` visual hierarchy in pages.
6. **No responsive polish** — Mobile layouts use `flex-col` fallbacks but have no dedicated mobile design for the wizard sidebar.

### Affected Files

- `src/app/globals.css` — add richer design tokens and base styles
- `src/components/dashboard/*.tsx` — all dashboard components
- `src/components/wizard/*.tsx` — all wizard components and screens
- `src/app/layout.tsx` — navigation bar styling

### Proposed Fix Approach

This is a broad enhancement requiring a dedicated UI/UX pass:

1. **Install Lucide React** (`lucide-react`) and replace all emoji icons with consistent SVG icons.
2. **Add card-level shadows and hover effects** across the dashboard (e.g. `hover:shadow-md transition-shadow`).
3. **Polish form controls** — add consistent focus rings, error borders, and help text styling.
4. **Improve loading states** — replace `animate-pulse` text with skeleton components using Tailwind's `animate-pulse` on placeholder blocks.
5. **Typography system** — establish a clear heading hierarchy in `globals.css` using `@layer base` overrides.
6. **Dashboard grid** — tighten spacing, add section dividers, improve KPI card visual weight.

---

## Bug 3 — Uploaded Files Not Persisted (OCR/Document Upload)

### Problem Description

Files uploaded via the OCR/document upload button on wizard screens are not saved/persisted. The upload appears to succeed visually (or fails silently), but the extracted value is never applied to the form.

### Root Cause Analysis

Two independent bugs in `OcrUploadButton.tsx` cause this failure:

#### Root Cause 3a — Missing Required Parameters in FormData

**Affected file:** `src/components/wizard/OcrUploadButton.tsx`, lines 38–43

The `handleFile` function only appends `file` and `category` to the `FormData`:

```typescript
// OcrUploadButton.tsx lines 38–43 — MISSING reportingYearId and scope
const formData = new FormData();
formData.append('file', file);
formData.append('category', category);
// ← reportingYearId and scope are NEVER appended
```

However, the `/api/ocr` route (lines 22–30 of `src/app/api/ocr/route.ts`) requires all four fields:

```typescript
const reportingYearId = parseInt(formData.get('reportingYearId') as string);
const scope = formData.get('scope') as Scope | null;
if (!file || !category || !reportingYearId || !scope) {
  return NextResponse.json(
    { error: 'Fehlende Pflichtfelder: file, category, reportingYearId, scope' },
    { status: 400 },
  );
}
```

Because `reportingYearId` parses to `NaN` (and thus evaluates as falsy) and `scope` is `null`, every OCR upload returns HTTP 400. The `StagingEntry` is never created. Neither the uploaded document bytes nor the OCR result are persisted.

**Current `OcrUploadButtonProps` interface also lacks `reportingYearId` and `scope`:**

```typescript
interface OcrUploadButtonProps {
  category: string;
  onResult: (value: number) => void;
  // ← reportingYearId: number missing
  // ← scope: Scope missing
}
```

#### Root Cause 3b — Response Field Name Mismatch

**Affected file:** `src/components/wizard/OcrUploadButton.tsx`, lines 43–53

The component reads `data.value` from the API response:

```typescript
interface OcrApiResponse {
  value: number | null;  // ← wrong field name
  unit: string;
  confidence: number;
  error?: string;
}
// ...
if (data.value !== null && data.value !== undefined) {
  setPreview({ value: data.value, unit: data.unit });
  onResult(data.value);  // ← always undefined, so onResult is never called
}
```

But the `/api/ocr` route returns `quantity`, not `value` (lines 95–101 of `src/app/api/ocr/route.ts`):

```typescript
return NextResponse.json({
  stagingId: staging.id,
  documentId: uploadedDoc.id,
  quantity: result.value,  // ← "quantity" not "value"
  unit: result.unit,
  confidence: result.confidence,
});
```

Even if Bug 3a were fixed, `data.value` would always be `undefined` (not `null`), so the `if (data.value !== null && data.value !== undefined)` check passes the `undefined` test but then `onResult(undefined)` silently passes `NaN` to the form.

#### Additional Note — FieldDocumentZone Uses Container Filesystem

**Affected file:** `src/app/api/field-documents/route.ts`, line 12

```typescript
const FIELD_DOCS_DIR = process.env.REPORTS_PATH
  ? join(process.env.REPORTS_PATH, 'field-docs')
  : '/app/reports/field-docs';
```

The field document (receipt/invoice attachments) are saved to the container filesystem. If the Docker container restarts without a persistent volume mount at `/app/reports`, all uploaded field documents are lost. The `/api/field-documents` `GET` endpoint would still return `FieldDocument` records from the database (with the `filePath` field), but the actual file bytes would be missing. This is a separate persistence concern from the OCR bug above.

### Affected Files

- `src/components/wizard/OcrUploadButton.tsx` — missing props `reportingYearId` + `scope`; wrong response field `value` → `quantity`
- `src/app/api/ocr/route.ts` — server is correct; client is wrong
- `src/app/api/field-documents/route.ts` — filesystem persistence gap (needs Docker volume)
- `src/components/wizard/screens/HeizungScreen.tsx` (and all other screens that use `<OcrUploadButton>`) — must pass `reportingYearId` and `scope` props
- `docker-compose.yml` — should add a named volume for `REPORTS_PATH` to ensure field docs survive restarts

### Proposed Fix Approach

1. **Fix `OcrUploadButton` props** — add `reportingYearId: number` and `scope: string` to `OcrUploadButtonProps`.
2. **Append missing FormData fields** — `formData.append('reportingYearId', String(reportingYearId))` and `formData.append('scope', scope)` in `handleFile`.
3. **Fix response field name** — rename `OcrApiResponse.value` → `quantity` and update all references.
4. **Update all callers** — each screen that renders `<OcrUploadButton>` (HeizungScreen, StromScreen, FuhrparkScreen, etc.) must pass the `reportingYearId` and `scope` it already receives as props/from `useEntries`.
5. **Docker volume** — add `reports_data` named volume to `docker-compose.yml` and mount it at `REPORTS_PATH` (`/app/reports`).

---

## Bug 4 — Audit Log Missing Value Changes (Wizard Screens)

### Problem Description

When entry values are changed via wizard screens and saved, the ScreenChangeLog component (collapsible "Änderungsprotokoll" at the bottom of each wizard screen) shows "Noch keine Änderungen erfasst." even though data has been saved. Changes are not visible in the per-screen change log.

### Root Cause Analysis

Two independent bugs combine to cause this failure:

#### Root Cause 4a — ScreenChangeLog Filter Uses Wrong Field for Matching

**Affected file:** `src/components/wizard/ScreenChangeLog.tsx`, lines 59–66

The filter logic attempts to match audit log entries against the set of category keys for the current screen:

```typescript
// ScreenChangeLog.tsx lines 59–66
const catSet = new Set(categories);  // e.g. {'ERDGAS', 'HEIZOEL', 'FLUESSIGGAS', ...}
const filtered = data.filter((l) => {
  if (!l.fieldName) return false;
  try {
    return catSet.has(l.fieldName) || catSet.size === 0;  // ← BUG
  } catch {
    return false;
  }
});
```

It checks `catSet.has(l.fieldName)`. But `l.fieldName` is always `'quantity'` for every audit log entry created by `saveEntry` in `src/lib/actions/entries.ts` (lines 68 and 101):

```typescript
// entries.ts — both CREATE and UPDATE paths
fieldName: 'quantity',
```

Since `catSet` contains emission category keys like `'ERDGAS'`, `'HEIZOEL'`, etc., and `l.fieldName` is always `'quantity'`, the expression `catSet.has('quantity')` is always `false`. The filter never matches for any wizard screen with categories, so the changelog always appears empty.

**Exception:** `FirmenprofilScreen` passes `categories={[]}` (line 252), so `catSet.size === 0` evaluates to `true` and all logs pass the filter. However, CompanyProfile audit logs are excluded by the API query (see Root Cause 4b below).

#### Root Cause 4b — Audit API Excludes CompanyProfile Changes

**Affected file:** `src/app/api/audit/route.ts`, lines 15–28

The `/api/audit` route filters by `reportingYearId` using this WHERE clause:

```typescript
where: reportingYearId
  ? {
      OR: [
        { emissionEntry: { reportingYearId: parseInt(reportingYearId) } },
        { materialEntry: { reportingYearId: parseInt(reportingYearId) } },
      ],
    }
  : undefined,
```

Audit log entries for `CompanyProfile` updates (created by `saveCompanyProfile` in `profile.ts`) have `emissionEntryId: null` and `materialEntryId: null`. They do not satisfy either OR clause, so they are silently excluded from the filtered results. The Firmenprofil `ScreenChangeLog` will always show "Noch keine Änderungen erfasst."

The `/api/audit` route also does not include the `emissionEntry` relation in its results (only `document`), so the client cannot derive the category from `emissionEntryId` to fix the filter client-side.

#### Additional Note — Missing Category Metadata in Audit Entries

`saveEntry` never populates the `metadata` JSON field (which could have stored `{"category": "ERDGAS"}`). This makes it impossible to filter by category on the client side without additional API changes.

### Affected Files

- `src/components/wizard/ScreenChangeLog.tsx` — filter logic (line 63)
- `src/app/api/audit/route.ts` — missing CompanyProfile in WHERE clause; missing `emissionEntry` include
- `src/lib/actions/entries.ts` — `metadata` field never populated in `auditLog.create`
- `src/lib/actions/profile.ts` — CompanyProfile audit logs not linked to a year (by design), but should still be queryable

### Proposed Fix Approach

**Option A (minimal):** Fix the ScreenChangeLog filter to match on `emissionEntryId` rather than `fieldName`. This requires the audit API to include `emissionEntry: { select: { category: true } }` in the response, then the client can check `catSet.has(l.emissionEntry?.category)`.

**Option B (clean):** Store the category in the `metadata` JSON field when creating audit log entries in `saveEntry`:

```typescript
// In entries.ts auditLog.create calls
metadata: JSON.stringify({ category }),
```

Then update `ScreenChangeLog.tsx` to parse `l.metadata` and check `catSet.has(JSON.parse(l.metadata).category)`.

**For CompanyProfile:** Add `entityType: 'CompanyProfile'` to the audit API WHERE clause so profile changes appear in the Firmenprofil screen changelog:

```typescript
OR: [
  { emissionEntry: { reportingYearId: parseInt(reportingYearId) } },
  { materialEntry: { reportingYearId: parseInt(reportingYearId) } },
  { entityType: 'CompanyProfile' },  // ← add this
],
```

---

## Bug 5 — No Multi-Invoice Support

### Problem Description

Only 1 invoice can be uploaded per category. There is no way to enter monthly invoices (January–December) plus a separate end-of-year final invoice for energy providers that issue monthly billing.

### Root Cause Analysis

**Affected files:** `src/components/wizard/useEntries.ts`, all wizard screen components

The database schema (`prisma/schema.prisma` lines 66–84) **does** support multi-invoice data via `billingMonth` and `providerName` fields:

```prisma
model EmissionEntry {
  billingMonth  Int?    // 1–12 for monthly entry; null for annual
  isFinalAnnual Boolean @default(false)
  providerName  String?
  @@unique([reportingYearId, scope, category, billingMonth, providerName])
}
```

The unique constraint allows `(STROM, month=1, provider=null)`, `(STROM, month=2, provider=null)`, ..., `(STROM, month=null, provider=null, isFinalAnnual=true)` as distinct rows.

However, the `useEntries` hook (`src/components/wizard/useEntries.ts`) models entries as `EntryMap = Record<string, EntryValue>` — a flat map of one value per category key:

```typescript
export type EntryMap = Record<string, EntryValue>;
```

The hook's `setValue` (line 90) and `saveAll` (line 122) functions only operate on one entry per category. Monthly `billingMonth` values are tracked as part of `EntryValue` but all wizard screens initialize and display exactly one input field per category. The UI has no mechanism to:

1. Add a second (or twelfth) row for the same category.
2. Set `billingMonth` on individual entries.
3. Mark an entry as `isFinalAnnual = true`.

The `saveEntry` server action (line 35 of `entries.ts`) correctly supports all these fields, but the UI layer never sends non-null `billingMonth` values.

### Affected Files

- `src/components/wizard/useEntries.ts` — `EntryMap` type needs to support multiple entries per category
- `src/components/wizard/screens/StromScreen.tsx` — electricity is the primary use case (monthly utility bills)
- `src/components/wizard/screens/HeizungScreen.tsx` — heating invoices may also be monthly
- `src/components/wizard/screens/FuhrparkScreen.tsx` — fleet fuel could have monthly breakdown
- `src/lib/actions/entries.ts` — already supports multi-entry; no changes needed

### Proposed Fix Approach

1. **Extend `EntryValue`** to include an `id` (database row ID) for existing entries, enabling per-row updates.
2. **Add monthly breakdown UI** for appropriate screens (primarily StromScreen): a `<MonthlyInvoiceTable>` component with 12 rows (Jan–Dec), each row having a quantity input and an optional "Beleg hochladen" button.
3. **Add a "Jahresabschluss" (final annual) toggle** — when enabled, saves the entry with `isFinalAnnual=true` and `billingMonth=null`.
4. **Update `useEntries` hook** to fetch and return all entries per category (not just the first), and expose an `addEntry` / `removeEntry` API.
5. **Update `saveAll`** to diff against existing entries and delete removed ones.

---

## Bug 6 — Firmenprofil Shows No Default Values

### Problem Description

When navigating to the Firmenprofil (Company Profile) wizard screen, the existing seed data values (e.g., "Mustermann Elektro GmbH") are not displayed. The form appears empty even though data exists in the database.

### Root Cause Analysis

**Affected file:** `src/components/wizard/screens/FirmenprofilScreen.tsx`, lines 54–61

The `useEffect` that is supposed to load existing profile data is completely broken:

```typescript
// FirmenprofilScreen.tsx lines 54–61
useEffect(() => {
  fetch('/api/entries?type=profile')  // ← wrong endpoint; no such filter exists
    .catch(() => null)
    .then(() => {
      // Profile is loaded separately since there is no /api/profile route.
      // We rely on the initial page state being empty and the user filling it in.
    });
}, []);
```

Two problems:

1. **Wrong endpoint**: `/api/entries?type=profile` hits the `GET /api/entries` route (`src/app/api/entries/route.ts`). That route only filters by `reportingYearId`, `scope`, and `category`. The `type=profile` query parameter is silently ignored. The route returns `EmissionEntry` records, not `CompanyProfile` data.

2. **Response is completely ignored**: The `.then()` callback is an empty no-op with a comment explaining "We rely on the initial page state being empty." This means the fetch is called, the response is discarded, and the form is never populated. The form state stays at the initialized defaults (`firmenname: ''`, `branche: 'ELEKTROHANDWERK'`, `mitarbeiter: ''`, etc.).

**There is no `/api/profile` route** in the application. The `CompanyProfile` data can only be saved (via `saveCompanyProfile` Server Action) but has no corresponding GET route.

### Affected Files

- `src/components/wizard/screens/FirmenprofilScreen.tsx` — the broken `useEffect` (lines 54–61)
- No `src/app/api/profile/route.ts` exists (needs to be created)

### Proposed Fix Approach

**Option A — Add `/api/profile` GET Route (recommended):**

1. Create `src/app/api/profile/route.ts` with a `GET` handler that returns `prisma.companyProfile.findUnique({ where: { id: 1 } })`.
2. Update `FirmenprofilScreen.tsx` `useEffect` to call `fetch('/api/profile')` and populate form state from the response:

```typescript
useEffect(() => {
  fetch('/api/profile')
    .then((r) => r.json())
    .then((data) => {
      if (data) {
        setForm({
          firmenname: data.firmenname ?? '',
          branche: data.branche ?? 'ELEKTROHANDWERK',
          mitarbeiter: String(data.mitarbeiter ?? ''),
          standort: data.standort ?? '',
          reportingBoundaryNotes: data.reportingBoundaryNotes ?? '',
          exclusions: data.exclusions ?? '',
        });
      }
    })
    .catch(() => null);
}, []);
```

**Option B — Server-side initial data (cleaner for Next.js):**

Pass the profile as a prop from a server component. The `[screen]/page.tsx` can fetch the profile server-side and pass it as `initialProfile` prop to `FirmenprofilScreen`. This avoids the loading flash.

---

## Bug 7 — Company Logo Upload Broken

### Problem Description

The company logo upload on the Firmenprofil screen does not work — the user cannot see or confirm whether the logo was saved.

### Root Cause Analysis

**Affected file:** `src/components/wizard/screens/FirmenprofilScreen.tsx`, lines 87–99

The logo upload handler (`handleLogoUpload`) and the server action (`saveCompanyProfile` in `profile.ts`) are both functionally correct in isolation. The `FileReader.readAsDataURL` approach correctly extracts base64, and `saveCompanyProfile` correctly validates MIME type, checks size, and upserts the `logoPath` field.

However, the upload is "broken" for the following UX reasons, all rooted in the same missing data-loading infrastructure as Bug 6:

#### Root Cause 7a — No Visual Feedback (No Logo Preview)

The `FirmenprofilScreen` form has no `<img>` tag or preview element to show the currently saved logo. After a successful upload, the user only sees a toast notification ("Logo gespeichert.") but no visual confirmation that the correct image was stored. On page reload, the `<input type="file">` field appears empty regardless of whether a logo exists in the database.

#### Root Cause 7b — Existing Logo Never Loaded (Dependency on Bug 6)

Because there is no `/api/profile` route (Bug 6), the form never loads the existing `logoPath` from the database. Even if the user successfully uploads a logo and sees the success toast, navigating away and returning to the Firmenprofil screen will show the logo input as empty. The user has no way to know if the logo persists.

#### Root Cause 7c — Missing Logo in State Type

The `ProfileState` interface (lines 28–35 of `FirmenprofilScreen.tsx`) does not include `logoPath`:

```typescript
interface ProfileState {
  firmenname: string;
  branche: Branche;
  mitarbeiter: string;
  standort: string;
  reportingBoundaryNotes: string;
  exclusions: string;
  // ← logoPath: string | null is missing
}
```

This means even if the existing profile were loaded, `logoPath` would not be part of the reactive state and could not drive an `<img src={form.logoPath}>` preview.

### Affected Files

- `src/components/wizard/screens/FirmenprofilScreen.tsx` — missing logo preview, missing `logoPath` in `ProfileState`, `handleLogoUpload` lacks error UX for oversized/wrong-format files
- `src/app/api/profile/route.ts` — does not exist (needed by Bug 6 fix)
- `src/lib/actions/profile.ts` — no changes needed; the save logic is correct

### Proposed Fix Approach

1. **Fix Bug 6 first** (add `/api/profile` route and populate form state on mount).
2. **Add `logoPath` to `ProfileState`** — include the stored logo URL so it can drive a preview.
3. **Add logo preview** — below the `<input type="file">`, render `{form.logoPath && <img src={form.logoPath} alt="Firmenlogo" className="h-16 w-auto rounded" />}`.
4. **Improve error messages** — in `handleLogoUpload`, validate MIME type client-side before calling `readAsDataURL` (save a round-trip); show specific error messages for wrong format or size.

---

## Bug Dependency Map

```
Bug 6 (No profile loading)
  └─► Bug 7 (Logo upload appears broken — no preview, no persistence confirmation)

Bug 3a (Missing OCR props)
Bug 3b (Wrong response field)
  └─► OCR feature effectively non-functional

Bug 4a (ScreenChangeLog filter wrong)
Bug 4b (Audit API excludes CompanyProfile)
  └─► ScreenChangeLog shows empty on all screens

Bug 1 (Badge → GHG PDF)
  └─► Independent; badge API /api/badge exists and works correctly

Bug 2 (UI/UX simplistic)
  └─► Independent; broad design enhancement required

Bug 5 (No multi-invoice)
  └─► Independent; schema supports it, UI layer does not
```

---

## Files Requiring Changes (Summary)

| File | Bug(s) | Change Type |
|---|---|---|
| `src/components/dashboard/ReportButtons.tsx` | 1 | Route BADGE to `/api/badge` instead of `/api/reports` |
| `src/components/wizard/OcrUploadButton.tsx` | 3 | Add `reportingYearId`/`scope` props; fix `value`→`quantity` |
| `src/components/wizard/screens/*.tsx` | 3 | Pass new OCR props through |
| `src/components/wizard/ScreenChangeLog.tsx` | 4 | Fix filter to use `metadata.category` or relation |
| `src/app/api/audit/route.ts` | 4 | Add `emissionEntry` include; fix CompanyProfile WHERE |
| `src/lib/actions/entries.ts` | 4 | Populate `metadata` with category in `auditLog.create` |
| `src/components/wizard/screens/FirmenprofilScreen.tsx` | 6, 7 | Fix `useEffect` to call `/api/profile`; add logo preview |
| `src/app/api/profile/route.ts` *(new)* | 6, 7 | Create GET handler for CompanyProfile |
| `src/components/wizard/useEntries.ts` | 5 | Support multiple entries per category |
| `docker-compose.yml` | 3 | Add named volume for `REPORTS_PATH` |
| All screen components (CSS, icons, spacing) | 2 | UI/UX enhancement pass |

---

## Related Tests That Must Pass After Fixes

- [ ] OCR upload successfully creates a `StagingEntry` and pre-fills the form field
- [ ] ScreenChangeLog shows recent entries after saving a value on HeizungScreen
- [ ] Firmenprofil loads "Mustermann Elektro GmbH" as default Firmenname on mount
- [ ] Logo upload shows a preview image after successful save
- [ ] Badge button downloads an SVG/PNG badge (not a GHG PDF)
- [ ] Saving a second monthly invoice for STROM creates a second `EmissionEntry` row
- [ ] Dashboard AuditLogPanel shows all changes including CompanyProfile updates
