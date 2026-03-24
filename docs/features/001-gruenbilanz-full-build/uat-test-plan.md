# UAT Test Plan: GrünBilanz Full Application Build

## Goal

Verify that the complete GrünBilanz application works correctly in the running app, covering
the full user journey from first-run seed data through wizard entry, report generation, and
settings management.

---

## Prerequisites

```bash
# Start the application
docker compose up -d

# Wait for the health check to report healthy (≤ 30 s)
docker compose ps   # both services should show "healthy" or "running"
```

Navigate to **http://localhost:3000** in your browser.

---

## Test Steps

### Step 1: First-Run Dashboard

1. Open `http://localhost:3000`
2. Verify the page loads within 2 seconds
3. Observe the dashboard

**Verify:**
- Company name "Mustermann Elektro GmbH" is visible in the header/profile area
- The Scope 1/2/3 donut chart renders with non-zero values
- The per-category bar chart renders at least one bar per scope
- The year-over-year comparison chart shows two years (2023 and 2024)
- The "Branchenvergleich" card shows a benchmark value for Elektrohandwerk
- The CO₂e per employee KPI is displayed (non-zero)
- Numbers are formatted with German locale (e.g., `1.234,56` — period as thousands separator, comma as decimal)
- The AuditLogPanel is visible (may be collapsed)
- The year selector shows at least 2024

---

### Step 2: Wizard Navigation and Status Badges

1. From the dashboard, click the link/button to open the wizard (or navigate directly to `/wizard/1`)
2. Verify the side navigation shows all 7 screens:
   - Screen 1: Firmenprofil
   - Screen 2: Heizung & Kältemittel
   - Screen 3: Fuhrpark
   - Screen 4: Strom & Fernwärme
   - Screen 5: Dienstreisen & Pendler
   - Screen 6: Materialien
   - Screen 7: Abfall
3. For each screen, verify a status badge is shown (one of: "Nicht erfasst", "Teilweise", "Erfasst")
4. Screens with seed data should show "Teilweise" or "Erfasst"

---

### Step 3: Manual Entry — Erdgas (Screen 2)

1. Navigate to `/wizard/2` (Heizung & Kältemittel)
2. Clear any existing value in the **Erdgas** field and enter `1000`
3. Click outside the field (trigger `onBlur`)
4. **Verify:** A German success toast appears (e.g., "Gespeichert" or "Erfolgreich gespeichert")
5. Navigate back to the dashboard
6. **Verify:** The Scope 1 CO₂e total reflects the new Erdgas value (1000 m³ × 2.000 kg/m³ = 2000 kg CO₂e from this entry)
7. Navigate back to Screen 2
8. **Verify:** The Erdgas field is pre-filled with `1000` (value persisted)

---

### Step 4: PlausibilityWarning Does Not Block Save

1. On Screen 2, enter an extremely large value in the Erdgas field (e.g., `9999999`)
2. Click outside the field
3. **Verify:** A yellow/orange warning banner appears (PlausibilityWarning)
4. **Verify:** The value is still saved (toast appears); the warning does not block the save
5. Restore the field to a reasonable value (e.g., `1000`) and save again

---

### Step 5: OCR Upload Stub (Screen 2)

1. On Screen 2, find the OCR upload button (for Erdgas or Heizöl)
2. Click the OCR button
3. **Verify:** A spinner/loading indicator appears for 1–2 seconds
4. **Verify:** A yellow preview banner appears with a hardcoded stub value
5. Click "Bestätigen" (or equivalent confirm button)
6. **Verify:** The value is moved to the input field

---

### Step 6: Vehicle-km Table (Screen 3 — Fuhrpark)

1. Navigate to `/wizard/3` (Fuhrpark)
2. Locate the vehicle-km table
3. Click "Zeile hinzufügen" (or equivalent add-row button)
4. Fill in a vehicle type and km value
5. Save the screen
6. **Verify:** The new row persists on revisit
7. Click the remove/delete button for the row
8. **Verify:** Row is removed and save succeeds

---

### Step 7: Strom with Ökostrom Flag (Screen 4)

1. Navigate to `/wizard/4` (Strom & Fernwärme)
2. Enter `10000` in the annual Strom field
3. Enable the Ökostrom flag/checkbox
4. Enter a provider name
5. Save
6. **Verify:** Toast appears; values persisted
7. Navigate to the dashboard and verify the Scope 2 CO₂e is lower than it would be with
   the grid-mix factor (Ökostrom factor ~0.025 kg/kWh vs. grid mix ~0.380 kg/kWh)

---

### Step 8: Materialien Table (Screen 6)

1. Navigate to `/wizard/6` (Materialien)
2. Add at least one material row (e.g., Kupfer, 100 kg, with a supplier memo)
3. Save
4. **Verify:** Row appears in the table on revisit
5. Delete the row and verify it disappears

---

### Step 9: ScreenChangeLog

1. On any wizard screen, perform a save
2. **Verify:** The `ScreenChangeLog` panel shows the most recent audit entry for that screen
3. The entry should include the field name and new value

---

### Step 10: Generate GHG Report PDF

1. From the dashboard, click **"Bericht erstellen"**
2. Wait up to 5 seconds
3. **Verify:** A download link appears in the reports list on the dashboard
4. Click the link
5. **Verify:** A PDF downloads or opens in a new browser tab
6. Inspect the PDF:
   - Company header includes "Mustermann Elektro GmbH", location, and year
   - Scope 1 table lists emission categories with quantities, factors, and CO₂e
   - Methodology section cites "UBA 2024"
   - If any categories are missing, they appear in the data quality section

---

### Step 11: CSRD Questionnaire PDF

1. From the dashboard or reports section, locate the CSRD questionnaire button
2. Click to generate
3. **Verify:** A PDF is generated and downloadable
4. Inspect the PDF for GHG summary and reporting standards section

---

### Step 12: Sustainability Badge

1. Navigate to `/api/badge?format=svg` in the browser
2. **Verify:** An SVG image is displayed
3. Navigate to `/api/badge?format=png`
4. **Verify:** A PNG image is returned
5. Navigate to `/api/badge?format=html`
6. **Verify:** An HTML embed snippet is shown

---

### Step 13: AuditLogPanel

1. Navigate to the dashboard
2. Expand the AuditLogPanel (if collapsed)
3. **Verify:** The panel shows up to 50 recent changes
4. Each entry should show entity type, field name, old value, new value, and timestamp

---

### Step 14: Settings — Create New Reporting Year

1. Click the settings icon (⚙) in the dashboard header
2. **Verify:** You are navigated to `/settings`
3. Click **"+ Neues Jahr anlegen"**
4. Enter `2025` and confirm
5. Navigate to the dashboard
6. Use the year selector to switch to 2025
7. **Verify:** Dashboard shows an empty state for 2025 (no entries)

---

### Step 15: Settings — Delete Reporting Year

1. Return to `/settings`
2. Find the year 2025 in the list
3. Click the delete button
4. **Verify:** A German confirmation dialog appears before deletion
5. Confirm deletion
6. **Verify:** Year 2025 is no longer in the year selector on the dashboard

---

### Step 16: Mobile Layout (375 px viewport)

1. Open browser DevTools and set viewport to **375 × 812 px** (iPhone SE)
2. Navigate to `http://localhost:3000`
3. **Verify:** Dashboard is usable; charts are visible; no horizontal overflow
4. Navigate to a wizard screen
5. **Verify:** All input fields are reachable; touch targets appear large (≥ 44 px)

---

### Step 17: Data Persistence After Restart

1. Enter a new value on any wizard screen and save
2. Run `docker compose restart` in a terminal
3. Wait for the app to come back online (≤ 30 s)
4. Navigate to the same wizard screen
5. **Verify:** The entered value is still present

---

## Expected Results

- **Seed data**: Mustermann Elektro GmbH data visible immediately on first run without any setup
- **Calculations**: Erdgas 1000 m³ → 2000 kg CO₂e; Altmetall value → negative CO₂e contribution
- **Auto-save**: `onBlur` saves immediately with German success toast; no page reload required
- **Pre-fill**: Revisiting a wizard screen always shows the last saved values
- **Status badges**: Accurately reflect how many categories have been captured
- **PDF generation**: Completes within 3 seconds; includes company header, scope tables, and UBA 2024 citations
- **Audit log**: Every save/update/delete creates a traceable entry
- **German UI**: All labels, toasts, dialogs, and messages are in German
- **Data persistence**: All data survives `docker compose restart`

---

## Verification Checklist

- [ ] App starts and is accessible within 30 seconds of `docker compose up -d`
- [ ] Mustermann Elektro GmbH seed data visible on first run
- [ ] All 7 wizard screens accessible via side navigation
- [ ] Status badges reflect entry completeness correctly
- [ ] Manual entry saves and pre-fills correctly
- [ ] Auto-save on blur works with German success toast
- [ ] PlausibilityWarning appears for extreme values but does not block save
- [ ] OCR upload shows spinner and yellow preview banner
- [ ] Ökostrom flag changes the CO₂e calculation noticeably
- [ ] Vehicle-km and material rows can be added and removed
- [ ] GHG Protocol PDF generated within 3 seconds with correct content
- [ ] CSRD questionnaire PDF generated and downloadable
- [ ] Sustainability badge returns PNG, SVG, and HTML
- [ ] AuditLogPanel shows recent changes
- [ ] ScreenChangeLog shows last 5 entries per screen
- [ ] Settings: new year created and visible in year selector
- [ ] Settings: year deleted with German confirmation dialog; cascade removes all data
- [ ] Mobile layout at 375 px works without horizontal overflow
- [ ] Data persists after `docker compose restart`
- [ ] All UI text is in German (no English strings visible)
- [ ] Numbers formatted as `1.234,56` (German locale)
- [ ] Error cases handled gracefully with German error messages
- [ ] No regressions in existing dashboard functionality
