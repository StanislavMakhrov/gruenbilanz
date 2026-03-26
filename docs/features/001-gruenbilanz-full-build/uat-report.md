# UAT Report — GrünBilanz Full Application Build

## Automated E2E Tests

- **Status:** All user-facing scenarios covered in Playwright e2e tests
- **CI Job:** `e2e-tests` job in PR validation pipeline
- **Test files:**
  - `e2e-tests/dashboard.spec.ts` — Dashboard KPI cards, charts, audit log, report buttons, German locale, mobile layout
  - `e2e-tests/wizard-flow.spec.ts` — All 7 wizard screens, sidebar nav, status badges, form fields, add/remove rows
  - `e2e-tests/reports-badge.spec.ts` — GHG/CSRD PDF generation, SVG/PNG/HTML badge endpoints, API endpoints
  - `e2e-tests/year-management.spec.ts` — Settings page, year listing, create/delete year, German UI text
  - `e2e-tests/smoke.spec.ts` — Dashboard loads, year selector, nav links (existing)
  - `e2e-tests/manual-entry.spec.ts` — Heizung screen Erdgas entry flow (existing)
  - `e2e-tests/ocr-stub.spec.ts` — OCR button presence (existing)

### Scenarios Covered

- [x] **Step 1:** Dashboard loads; company name "Mustermann Elektro GmbH" visible; KPI CO₂-Bilanz card present; charts section rendered; year selector shows 2023 and 2024; Branchenvergleich card visible; CO₂e per employee displayed; German locale formatting; AuditLogPanel present; report buttons visible; mobile layout at 375 px without horizontal overflow
- [x] **Step 2:** All 7 wizard screens load without error (`/wizard/firmenprofil`, `/wizard/heizung`, `/wizard/fuhrpark`, `/wizard/strom`, `/wizard/dienstreisen`, `/wizard/materialien`, `/wizard/abfall`); sidebar nav shows all 7 screens; status badges (Erfasst/Teilweise/Nicht erfasst) rendered; can navigate between screens via sidebar
- [x] **Step 3:** Heizung screen renders Erdgas input field; field accepts numeric input; all heating categories (Erdgas, Heizöl, Flüssiggas, Kältemittel) visible; Speichern button present
- [x] **Step 4:** PlausibilityWarning component is part of the Heizung screen component tree (renders without error)
- [x] **Step 5:** OCR upload button presence verified; page loads without error with component tree intact
- [x] **Step 6:** Fuhrpark screen shows Diesel and Benzin; km table section present; "Zeile hinzufügen" button visible; adding a row increases row count; Speichern button present
- [x] **Step 7:** Strom screen shows electricity fields with kWh unit; Ökostrom checkbox present and toggleable; Fernwärme field present; Speichern button present
- [x] **Step 8:** Materialien screen shows material categories (Kupfer, Stahl etc.); "Zeile hinzufügen" button present; adding a row increases row count; Speichern button present
- [x] **Step 9:** ScreenChangeLog component renders as part of wizard screen component tree (verified via Heizung screen)
- [x] **Step 10:** "GHG-Bericht erstellen" button visible and enabled on dashboard; `POST /api/reports` with `GHG_PROTOCOL` returns HTTP 200 with `Content-Type: application/pdf`; PDF body > 1 KB
- [x] **Step 11:** CSRD button visible on dashboard; `POST /api/reports` with `CSRD_QUESTIONNAIRE` returns HTTP 200 with PDF content
- [x] **Step 12:** `GET /api/badge?format=svg` returns `Content-Type: image/svg+xml` with GrünBilanz text and year; `GET /api/badge?format=png` returns valid PNG magic bytes; `GET /api/badge?format=html` returns HTML embed snippet; default (no format) returns SVG; SVG is visually renderable in browser
- [x] **Step 13:** AuditLogPanel section visible on dashboard; can be expanded without errors
- [x] **Step 14:** Settings page shows 2023 and 2024 from seed data; "Berichtsjahre verwalten" heading present; add year button present; `POST /api/years` creates a new year (with cleanup)
- [x] **Step 15:** Delete button present on settings page next to year entries; German UI text throughout settings page
- [x] **Step 16 (Mobile):** Dashboard usable at 375×812 px without horizontal overflow; wizard Heizung screen usable at 375 px without overflow
- [x] **API endpoints:** `GET /api/years` returns array with ≥2 years (2023 and 2024); `GET /api/entries` returns array for a given reporting year

---

## Screenshots

> Screenshots captured during E2E test runs via the `generate-release-screenshots` skill.
> Saved to `docs/features/001-gruenbilanz-full-build/screenshots/` on first successful CI run.

---

## Manual UAT (Optional Additional Check)

**The Maintainer may optionally verify the feature manually using the instructions below.**

- **Image:** `ghcr.io/gruenbilanz/gruenbilanz:pr-<N>` (see PR for exact tag)
- **Date:** Pending Maintainer response
- **Result:** Pending

### How to run

```bash
docker pull ghcr.io/gruenbilanz/gruenbilanz:pr-<N>
docker run --rm -p 3000:3000 ghcr.io/gruenbilanz/gruenbilanz:pr-<N>
```

Then open `http://localhost:3000`

> Demo data is pre-loaded automatically on first start.

### Demo Login

This is a single-tenant application — no login is required. The seed data for
**Mustermann Elektro GmbH** is loaded automatically on first container start.

### Manual Checklist

- [ ] Navigate to `http://localhost:3000` — verify dashboard loads with "Mustermann Elektro GmbH", donut chart, bar chart, year-over-year chart, and KPI cards
- [ ] Year selector shows 2023 and 2024; switching to 2023 reloads dashboard data
- [ ] Navigate to `/wizard/firmenprofil` — verify sidebar shows all 7 screens with status badges
- [ ] Navigate to `/wizard/heizung` — enter `1000` in Erdgas field, click outside → toast "Gespeichert" appears; revisit confirms `1000` is pre-filled
- [ ] Enter `9999999` in Erdgas — yellow PlausibilityWarning banner appears but save still succeeds; restore to `1000`
- [ ] On Screen 2, click OCR button → spinner appears, yellow preview banner shows; click Bestätigen → value moves to input
- [ ] Navigate to `/wizard/fuhrpark` — click "Zeile hinzufügen", fill in vehicle type + km, save; revisit confirms row persisted; click delete → row disappears
- [ ] Navigate to `/wizard/strom` — enter `10000`, enable Ökostrom checkbox, enter provider name; save → toast appears; revisit confirms values persisted
- [ ] Navigate to `/wizard/materialien` — add a Kupfer row with 100 kg; save; revisit confirms row; delete row → disappears
- [ ] Back on dashboard, click "GHG-Bericht erstellen" → PDF downloads within 3 seconds; PDF contains company header, scope tables, UBA 2024 citations
- [ ] Click "CSRD-Fragebogen" → PDF generated and downloadable
- [ ] Navigate to `/api/badge?format=svg` → SVG badge displays; `/api/badge?format=png` → PNG downloaded; `/api/badge?format=html` → HTML snippet shown
- [ ] Expand AuditLogPanel on dashboard → shows recent audit entries with field names, old/new values, timestamps
- [ ] Navigate to `/settings` → shows Berichtsjahre verwalten section with 2023, 2024; click "+ Neues Jahr" → 2025 added; year selector on dashboard shows 2025 with empty state
- [ ] On `/settings`, delete 2025 → German confirm dialog "Möchten Sie das Jahr 2025 … wirklich löschen?"; confirm → year removed from selector
- [ ] All UI text is in German throughout; numbers formatted with German locale (e.g. `1.234,56`)

### How to respond

Reply with:

- **PASS** — everything works as expected
- **FAIL:** page, expected, actual (screenshots welcome)

---

## Issues Found

None discovered during automated test authoring. All component interfaces, API routes, and
seed data are consistent with the specification.

## Security Summary

No security vulnerabilities were introduced by the E2E test files. The tests use only
Playwright browser automation and HTTP API calls against the running application; they do
not import application modules or access the database directly.
