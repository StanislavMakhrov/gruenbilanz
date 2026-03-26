# Code Review: Bug Fixes (Feature 001)

**Reviewer:** Code Reviewer Agent  
**Date:** 2025-07-14  
**Branch:** `copilot/feature-grunbilanz-full-application-build-again`

---

## Summary

Reviewed the implementation of 8 UI/UX bug fixes across the GrünBilanz wizard, dashboard,
badge API, and file upload handling. The core logic of all fixes is sound, documentation
is thorough, and the test suite passes. However, one **Major** issue was found: the three
screens that received `MultiInvoiceUpload` in Bug 5 (FuhrparkScreen, DienstreisenScreen,
AbfallScreen) still render the old `OcrUploadButton` and `FieldDocumentZone` components
alongside it — creating exactly the redundancy that Bug 8 was meant to eliminate on
HeizungScreen and StromScreen. This directly contradicts the stated outcome in `changes.md`.
Two Minor issues (double-fetch in ScreenChangeLog and unescaped company name in badge output)
are also documented below.

---

## Verification Results

| Check | Result |
|-------|--------|
| Tests | ✅ Pass — 52/52 (3 files) |
| Build | ✅ Success — no TypeScript errors, no deprecation warnings |
| Docker | Not run (environment constraint — no Docker daemon available) |
| Lint warnings | Pre-existing `<img>` warning in FirmenprofilScreen — noted in Developer log |

---

## Specification Compliance

| Bug | Fix Implemented | Tested | Notes |
|-----|----------------|--------|-------|
| Bug 1 — Badge API respects `reportingYearId` | ✅ | ✅ | Correct priority: `reportingYearId` → `year` → latest |
| Bug 2 — Consistent `lucide-react` icon in layout | ✅ | TypeScript only | `Settings` icon replaces inline SVG |
| Bug 3 — `FieldDocumentZone` loads docs on mount | ✅ | ⚠️ | Test covers `OcrApiResponse.quantity`, not the mount `useEffect` |
| Bug 4a — Zero values saved | ✅ | ✅ | `entry.quantity === 0` guard removed |
| Bug 4b — Changelog refreshes on re-open | ✅ | ✅ | `setLogs([])` on close triggers fresh fetch |
| Bug 5 — Multi-invoice on Fuhrpark/Dienstreisen/Abfall | ⚠️ | ✅ | `MultiInvoiceUpload` added but old UI **not removed** — see Major Issue #1 |
| Bug 6 — Firmenprofil loads defaults on mount | ✅ | ✅ | Skeleton loader + `r.ok` check |
| Bug 7 — Logo upload handles corrupted files | ✅ | ✅ | `reader.onerror` handler added |
| Bug 8 — Redundant buttons removed from Heizung/Strom | ✅ | TypeScript only | Clean — `MultiInvoiceUpload` is sole upload UI |

**Spec Deviations Found:** 1 (Bug 5 — see Major Issue #1)

---

## Adversarial Testing

| Test Case | Result | Notes |
|-----------|--------|-------|
| Badge with `reportingYearId` param | Pass | Correct DB lookup via `findUnique` |
| Badge with non-numeric `reportingYearId` | Pass | `isNaN` guard skips to fallback |
| Badge with unknown `reportingYearId` | Pass | Falls back to `year` then latest |
| Save entry with `quantity = 0` | Pass | No longer silently skipped |
| Re-open changelog after save | Pass | Logs cleared on close, fresh fetch on re-open |
| Corrupted logo file upload | Pass | `reader.onerror` toast shown |
| Profile load with 500 response | Pass | `r.ok` check throws; form left at defaults |
| Company name with `&` in badge SVG | **Fail** | `<title>` contains unescaped `&` — invalid XML |
| Fuhrpark: multiple invoice upload zones visible | **Fail** | Three upload UIs rendered (see Major Issue #1) |

---

## Review Decision

**Status: Changes Requested**

One Major issue must be resolved before approval.

---

## Issues Found

### Blockers

None.

---

### Major Issues

#### Major 1 — Bug 5: `OcrUploadButton` and `FieldDocumentZone` not removed from Fuhrpark, Dienstreisen, and Abfall screens

**Files:** `src/components/wizard/screens/FuhrparkScreen.tsx`,
`src/components/wizard/screens/DienstreisenScreen.tsx`,
`src/components/wizard/screens/AbfallScreen.tsx`

**Evidence:**
```
src/components/wizard/screens/FuhrparkScreen.tsx:15:import FieldDocumentZone from '@/components/wizard/FieldDocumentZone';
src/components/wizard/screens/FuhrparkScreen.tsx:16:import OcrUploadButton from '@/components/wizard/OcrUploadButton';
src/components/wizard/screens/FuhrparkScreen.tsx:157: <OcrUploadButton ... />
src/components/wizard/screens/FuhrparkScreen.tsx:174: <FieldDocumentZone ... />
src/components/wizard/screens/FuhrparkScreen.tsx:176: <MultiInvoiceUpload ... />   ← all three rendered per field
```

The same pattern exists in DienstreisenScreen (lines 14–15, 118, 139–141, 146–148) and
AbfallScreen (lines 14–15, 107, 139–141).

**Why it matters:** The `changes.md` document explicitly states:
> "All five data-entry screens now offer the same invoice upload experience."
> "MultiInvoiceUpload is now the sole upload UI on these screens."

But after these fixes HeizungScreen and StromScreen have **one** upload UI per field, while
FuhrparkScreen, DienstreisenScreen, and AbfallScreen have **three** — `OcrUploadButton`,
`FieldDocumentZone`, and `MultiInvoiceUpload` — for every emission field. This is exactly
the redundancy that Bug 8 fixed for the first two screens, and it should equally apply to the
three screens touched by Bug 5. Users on these screens will see confusing, duplicated upload
zones.

**Fix required:** Remove `OcrUploadButton` and `FieldDocumentZone` imports and JSX from
FuhrparkScreen, DienstreisenScreen, and AbfallScreen, leaving only `MultiInvoiceUpload`,
consistent with HeizungScreen and StromScreen.

---

### Minor Issues

#### Minor 1 — `ScreenChangeLog`: `logs.length` in `useEffect` dependency array causes double fetch

**File:** `src/components/wizard/ScreenChangeLog.tsx`, line 88

```typescript
}, [isOpen, reportingYearId, categories, logs.length]);
```

When the panel is opened and logs are fetched (N > 0 items), `logs.length` changes from 0 to N,
triggering a second identical API fetch. This is wasteful but not catastrophic (the second fetch
overwrites the same data). The `logs.length` dependency was presumably added to be part of the
"clear on close and refetch on open" mechanism, but it is not needed: when `setLogs([])` is
called on close and `isOpen` becomes `false`, the effect guard `if (!isOpen) return` prevents
any fetch. The next open triggers the effect via the `isOpen` change alone.

**Fix:** Remove `logs.length` from the dependency array. The clear-on-close / fetch-on-open
behaviour works correctly with only `[isOpen, reportingYearId, categories]`.

---

#### Minor 2 — Badge route does not escape `companyName` in SVG/HTML output

**File:** `src/app/api/badge/route.ts`, `buildSvg()` function and the HTML embed block

The `companyName` value (read from the `companyProfile` table) is interpolated directly into:
- The SVG `<title>` element: `<title>GrünBilanz — ${companyName} — ...</title>`
- The HTML comment: `<!-- GrünBilanz Nachhaltigkeitsbadge — ${companyName} ... -->`

XML/SVG requires `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, and `"` → `&quot;` in text
content and attributes. A company name like `Meister & Söhne GmbH` produces invalid SVG
XML. A name containing `-->` would terminate the HTML comment and could inject arbitrary HTML
when the `?format=html` snippet is embedded in a page.

**Fix:** Apply an XML escape helper to `companyName` before interpolating it into SVG/HTML
output. For example:

```typescript
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

---

### Suggestions

#### Suggestion 1 — Test for Bug 3 describes a different fix than the one implemented

**File:** `src/__tests__/bugfixes.test.ts`, lines 19–50

The test header says "Bug 3: OcrUploadButton field name mapping (quantity vs value)" and tests
the `OcrApiResponse.quantity` field. The actual Bug 3 fix was adding a `useEffect` to
`FieldDocumentZone` that fetches previously uploaded documents on mount. These are unrelated
concerns. The `OcrApiResponse` interface test is valid but belongs under a different bug label.
Consider adding a comment clarifying that the `FieldDocumentZone` mount behaviour is verified
by build/TypeScript-compilation and integration tests rather than this unit test.

---

## Critical Questions Answered

- **What could make this code fail?**  
  The three-upload-zone issue on Fuhrpark/Dienstreisen/Abfall (Major #1) is an active user-visible
  bug. Company names with `&` will produce invalid SVG (Minor #2). Otherwise failures are bounded
  to network/DB unavailability with appropriate fallbacks in place.

- **What edge cases might not be handled?**  
  `reportingYearId` with value `0` is treated as `isNaN(0) === false` — so `rid=0` would call
  `findUnique({ where: { id: 0 } })` which will return `null` and fall through correctly. No
  issue.

- **Are all error paths tested?**  
  The `r.ok` guard (Bug 6/7), the `reader.onerror` handler (Bug 7), and the zero-save guard
  removal (Bug 4a) all have direct test coverage. The `FieldDocumentZone` fetch error is
  silently swallowed (`catch(() => null)`) — acceptable for an optional UI enhancement.

---

## Checklist Summary

| Category | Status |
|----------|--------|
| Correctness | ⚠️ — Major #1 (duplicate upload zones) |
| Spec Compliance | ⚠️ — Bug 5 outcome not fully implemented |
| Code Quality | ✅ — clean, focused changes, good comments |
| Architecture | ✅ — no new patterns or dependencies introduced |
| Testing | ✅ — 52/52 pass; minor test description mismatch (Suggestion 1) |
| Documentation | ✅ — `changes.md` and `work-protocol.md` present; `docs/features.md` updated |
| Security | ⚠️ — Minor #2 (unescaped company name in SVG/HTML badge) |

---

## Work Protocol & Documentation Verification

- `work-protocol.md` exists ✅
- Developer agent log present ✅
- Technical Writer agent log present ✅
- `docs/features.md` updated ✅
- `docs/architecture.md` — no change required (no architectural changes) ✅
- `docs/testing-strategy.md` — no change required (no new test frameworks) ✅
- `README.md` — no change required (no installation/usage changes) ✅
- CHANGELOG.md not modified ✅

---

## Next Steps

**Changes Required — please hand off to Developer agent:**

1. **(Major — required for approval)** Remove `OcrUploadButton` and `FieldDocumentZone` from
   FuhrparkScreen, DienstreisenScreen, and AbfallScreen, keeping only `MultiInvoiceUpload` per
   field, consistent with HeizungScreen and StromScreen.

2. **(Minor — recommended)** Remove `logs.length` from the `useEffect` dependency array in
   `ScreenChangeLog.tsx` to prevent double-fetching.

3. **(Minor — recommended)** Add an XML escape helper to `badge/route.ts` and apply it to
   `companyName` in `buildSvg()` and the HTML embed block.

After the Developer addresses these items, re-submit for a follow-up code review.
