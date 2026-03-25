# UAT Report — 7 Bug Fixes

**Branch:** `copilot/feature-grunbilanz-full-application-build-again`
**Date:** 2026-03-25
**Agent:** UAT Tester

---

## Automated E2E Tests

- **File:** `e2e-tests/bug-fixes.spec.ts`
- **CI Job:** `e2e-tests` in PR validation pipeline

### Scenarios Covered

- [x] Bug 1: Badge button is visible; click sends GET /api/badge (not POST /api/reports); description says "Digitales Badge"
- [x] Bug 2: Lucide SVG icons render on dashboard; KpiCard has hover:shadow CSS; wizard screens load without error
- [x] Bug 3: POST /api/ocr endpoint exists; response shape uses `quantity` not `value`; file inputs present on Heizung
- [x] Bug 4: GET /api/audit returns valid JSON; accepts reportingYearId filter; ScreenChangeLog renders on Heizung and Firmenprofil
- [x] Bug 5: "Beleg hinzufügen" button on Heizung and Strom; upload shows invoice row with month select, Jahresabrechnung checkbox, remove button, and OCR quantity
- [x] Bug 6: GET /api/profile returns 200 with seed data (Mustermann Elektro GmbH, 12 employees, München, Bayern, ELEKTROHANDWERK); Firmenprofil screen pre-fills inputs; never calls wrong endpoint
- [x] Bug 7: Logo file input present; hint text "JPEG oder PNG, max. 10 MB"; GET /api/profile includes `logoPath` field; upload triggers save handler

---

## Manual UAT Checklist

### How to run

```bash
docker pull ghcr.io/gruenbilanz/gruenbilanz:pr-<N>
docker run --rm -p 3000:3000 ghcr.io/gruenbilanz/gruenbilanz:pr-<N>
```

Open `http://localhost:3000` — demo data is seeded automatically on first start.

> **No login required** — the application has no authentication layer.

---

### Bug 1 — Badge button calls GET /api/badge

1. Open the dashboard (`/`)
2. Click **"Nachhaltigkeits-Badge"** in the "Berichte & Nachweise" panel
3. **Expected:** Browser downloads a file named `GruenBilanz_Badge.svg`; no PDF generated; a toast "Badge wurde erfolgreich heruntergeladen." appears
4. **Also verify:** Opening DevTools → Network confirms the request is `GET /api/badge?format=svg`, **not** `POST /api/reports`

---

### Bug 2 — UI: Lucide icons, hover shadows, skeleton loaders

1. Open the dashboard
2. **Expected:** KPI cards show green leaf/user SVG icons; hovering over a KPI card shows a subtle shadow
3. Navigate to any wizard screen (e.g. `/wizard/heizung`)
4. **Expected:** Sidebar menu icon and back-arrow icon render as SVGs (not text/emoji); "Letzte Änderungen" changelog panel shows a skeleton loader briefly while fetching

---

### Bug 3 — OCR upload sends correct fields; uses `quantity` in response

1. Navigate to `/wizard/heizung`
2. Click **"Beleg hinzufügen"** under any heating category and upload a PDF invoice
3. **Expected:** The request to `/api/ocr` includes `reportingYearId`, `scope=SCOPE1`, and `category`; the recognised value appears as "Erkannter Wert: X m³" (not blank)
4. Repeat on `/wizard/strom` (scope should be `SCOPE2`)

---

### Bug 4 — Audit log shows metadata.category; CompanyProfile changes logged

1. Navigate to `/wizard/heizung`, enter a value for Erdgas, click **Speichern**
2. Open the "Letzte Änderungen" panel on the Heizung screen
3. **Expected:** The new entry appears (previously the list was always empty due to wrong filter)
4. Navigate to `/wizard/firmenprofil`, change the company name, click **Speichern**
5. Open the dashboard Aktivitäten/Audit panel
6. **Expected:** A CompanyProfile audit entry appears

---

### Bug 5 — MultiInvoiceUpload: multiple invoices per category

1. Navigate to `/wizard/heizung`
2. Under an Erdgas section, click **"Beleg hinzufügen"** and upload a PDF
3. **Expected:** Invoice row appears with: filename, spinner→recognised value, "Monat (optional)" dropdown, "Jahresabrechnung" checkbox, red trash icon
4. Select **März** from the month dropdown → value stays as 3
5. Check **Jahresabrechnung** → month dropdown resets to "— kein Monat —"
6. Click the trash icon → invoice row disappears
7. Repeat on `/wizard/strom`

---

### Bug 6 — Firmenprofil pre-fills from DB

1. Navigate to `/wizard/firmenprofil` (first visit or page reload)
2. **Expected:** The form is pre-filled:
   - Firmenname: **Mustermann Elektro GmbH**
   - Mitarbeiteranzahl: **12**
   - Standort: **München, Bayern**
   - Branche: **Elektrohandwerk**
3. DevTools → Network confirms `GET /api/profile` is called (not `/api/entries?type=profile`)

---

### Bug 7 — Logo upload preview

1. Navigate to `/wizard/firmenprofil`
2. Under **"Unternehmenslogo"**, choose a JPEG or PNG file (< 10 MB)
3. **Expected:** After selecting the file, a preview `<img>` appears immediately above the file input showing the uploaded logo
4. Reload the page — **Expected:** The logo preview still appears (loaded from `GET /api/profile → logoPath`)
5. Try uploading a non-image file (e.g. `.pdf`) — **Expected:** Toast error "Logo muss im JPEG- oder PNG-Format vorliegen."
6. Try uploading an image > 10 MB — **Expected:** Toast error "Logo darf nicht größer als 10 MB sein."

---

## Manual UAT Result

**Status:** ⏳ Awaiting Maintainer verification

Reply to this PR with **PASS** or **FAIL: \<page\> | \<expected\> | \<actual\>**.
