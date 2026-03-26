# Bug Fixes — Summary of Changes

**Feature ID:** 001-bug-fixes  
**Branch:** `copilot/feature-grunbilanz-full-application-build-again`  
**Date:** 2025-07-14  
**Status:** ✅ All 8 fixes implemented and tested

---

## Overview

Eight UI/UX and correctness bugs were identified and fixed in the GrünBilanz application. The fixes span the data-entry wizard, the dashboard, file upload handling, and the badge API. All fixes are backward-compatible and do not require database migrations.

---

## Fix 1 — Badge API now accepts `reportingYearId`

**Files changed:** `src/app/api/badge/route.ts`, `src/components/dashboard/ReportButtons.tsx`

**Problem:** The badge API (`GET /api/badge`) only accepted a `year` calendar-year parameter. The client called the endpoint with a `reportingYearId` query string, which was silently ignored — the badge always used the most recently created reporting year from the database regardless of what the user had selected.

**Fix:** The badge API now checks for `reportingYearId` first, looks up the matching `ReportingYear` record, and derives the calendar year from it. It falls back to the `year` parameter, and finally to the most recent year if neither is supplied. This means the badge always reflects the year the user selected on the dashboard.

---

## Fix 2 — Consistent lucide-react icons in layout

**Files changed:** `src/app/layout.tsx`

**Problem:** The main application layout used a hand-coded inline SVG for the settings (gear) icon in the navigation header, while the rest of the application used `lucide-react` icons. This inconsistency made the codebase harder to maintain and could produce visual differences between browsers.

**Fix:** The inline SVG was replaced with the `Settings` component from `lucide-react`, matching the icon system used everywhere else in the application.

---

## Fix 3 — `FieldDocumentZone` loads existing documents on mount

**Files changed:** `src/components/wizard/FieldDocumentZone.tsx`

**Problem:** When a user returned to a wizard screen, the per-field invoice attachment zone (`FieldDocumentZone`) was always empty — previously uploaded documents were not shown. The component only displayed documents that were uploaded during the current browser session.

**Fix:** A `useEffect` hook was added that calls `GET /api/field-documents?fieldKey=<key>&reportingYearId=<id>` on component mount. The returned documents populate the attachment list immediately, so users see all previously uploaded receipts and invoices when they revisit a screen.

---

## Fix 4a — Zero values are now saved correctly

**Files changed:** `src/components/wizard/useEntries.ts`

**Problem:** The `saveCategory` function contained a guard `if (entry.quantity === 0) return` that silently discarded any entry whose quantity was zero. This meant that a user entering a value of 0 (for example, to record that no heating oil was used) would see the field reset on the next page load.

**Fix:** The zero-value guard was removed. Entries with `quantity === 0` are now saved to the database like any other value. The `saveAll` filter was also updated for consistency.

---

## Fix 4b — Changelog panel refreshes when re-opened

**Files changed:** `src/components/wizard/ScreenChangeLog.tsx`

**Problem:** The collapsible "Letzte Änderungen" (recent changes) panel on each wizard screen fetched audit entries when first opened, but then cached them in component state. If the user saved new data and re-opened the panel without a full page reload, the list showed stale entries.

**Fix:** The component now clears its entries when the panel is closed. The next time the panel is opened it triggers a fresh fetch from `GET /api/audit`, so the user always sees up-to-date changes.

---

## Fix 5 — Multi-invoice upload added to Fuhrpark, Dienstreisen, and Abfall

**Files changed:** `src/components/wizard/screens/FuhrparkScreen.tsx`, `src/components/wizard/screens/DienstreisenScreen.tsx`, `src/components/wizard/screens/AbfallScreen.tsx`

**Problem:** The `MultiInvoiceUpload` component — which allows users to attach multiple invoices per emission category, with per-invoice month selection and OCR extraction — was only present on the Heizung (heating) and Strom (electricity) screens. The remaining screens (fuel, business travel, waste) had no equivalent upload UI, forcing manual entry without document evidence.

**Fix:** `MultiInvoiceUpload` was added to the Fuhrpark, Dienstreisen, and Abfall screens. All five data-entry screens now offer the same invoice upload experience.

---

## Fix 6 — Firmenprofil form loads correctly on mount

**Files changed:** `src/components/wizard/screens/FirmenprofilScreen.tsx`

**Problem:** The company profile screen had several issues on initial load:
1. No loading state was shown while the profile was being fetched, causing the form to appear empty then suddenly fill in.
2. The profile fetch did not check `response.ok` before parsing JSON, so HTTP error responses (e.g. 500) were silently parsed as data, often resulting in incorrect defaults.
3. Occasional timing issues meant form values did not populate correctly on first visit.

**Fix:**
- A skeleton loader is displayed while the profile fetch is in progress (`isLoadingProfile` state).
- The fetch now explicitly checks `response.ok`; on failure it logs the error and leaves the form in a known default state.
- Form values are set in the `useEffect` that runs after the fetch completes, ensuring they are always populated from actual server data.

---

## Fix 7 — Logo upload handles corrupted files

**Files changed:** `src/components/wizard/screens/FirmenprofilScreen.tsx`

**Problem:** The logo upload handler used the `FileReader` API to convert the selected image to a base64 data URL. If the selected file was corrupted or unreadable, `FileReader` would emit an `error` event that was not handled — the upload silently failed with no feedback to the user.

**Fix:** An `reader.onerror` handler was added. When the file cannot be read, a German-language error toast ("Logo-Datei konnte nicht gelesen werden.") is shown and the partially read data is discarded, preventing silent failures.

---

## Fix 8 — Removed redundant upload UI from Heizung and Strom screens

**Files changed:** `src/components/wizard/screens/HeizungScreen.tsx`, `src/components/wizard/screens/StromScreen.tsx`

**Problem:** After `MultiInvoiceUpload` was added to Heizung and Strom as the primary document upload experience (Feature 001 build), the older `OcrUploadButton` and `FieldDocumentZone` components were left in place. This created two separate upload zones for the same field — one for single-file OCR and one for multi-invoice upload — confusing users and duplicating stored state.

**Fix:** `OcrUploadButton` and `FieldDocumentZone` were removed from both `HeizungScreen` and `StromScreen`. `MultiInvoiceUpload` is now the sole upload UI on these screens, consistent with all other wizard screens after Fix 5.

---

## Test Coverage

All 8 fixes are covered by unit tests in `src/__tests__/bugfixes.test.ts` (11 new test cases added). The full test suite runs 52 tests and passes without errors. End-to-end scenarios for the complete set of bug fixes are covered in `e2e-tests/bug-fixes.spec.ts`.

---

## No Breaking Changes

None of the fixes alter the database schema, the public API contract, or the Docker deployment. Existing data is not affected. The only visible change to end users is:

- Previously uploaded field documents now appear when revisiting a wizard screen.
- Zero-value entries now persist correctly.
- The Fuhrpark, Dienstreisen, and Abfall screens now have invoice upload UI matching the Heizung and Strom screens.
- The Firmenprofil screen shows a skeleton loader while loading, and shows error feedback for corrupted logo files.
- The badge downloaded from the dashboard always corresponds to the selected reporting year.
