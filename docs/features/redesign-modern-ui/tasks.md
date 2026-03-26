# Tasks: Modern UI Redesign

## Overview

Break down the GrünBilanz UI redesign into discrete, independently verifiable implementation
tasks. The redesign elevates the visual language to a premium, modern B2B SaaS aesthetic —
comparable to Linear/Vercel/Stripe — while preserving all existing functionality, the
green brand identity, and full Docker-offline compatibility.

**Reference:** [`specification.md`](./specification.md) · [`architecture.md`](./architecture.md)

**Key constraint:** Zero new npm packages. Only `next`, `lucide-react`, `recharts`, and
`tailwindcss` (already installed) are used.

---

## Tasks

### Task 1: CSS Design Token Refresh (`globals.css` + `tailwind.config.ts`)

**Priority:** High

**Description:**
Update all HSL CSS custom property values in `src/app/globals.css` to the refined
cool-neutral palette specified in the architecture ADR. Add `fontFamily.sans` to
`tailwind.config.ts` so the Inter CSS variable resolves correctly throughout the app.

**Files to change:**
- `src/app/globals.css`
- `tailwind.config.ts`

**What to do:**

*`globals.css` `:root` block — replace current HSL values with:*
```css
--background: 220 14% 96%;
--foreground: 220 13% 13%;
--card:       0 0% 100%;
--card-foreground: 220 13% 13%;
--primary:    142 76% 24%;
--primary-foreground: 0 0% 100%;
--secondary:  210 16% 93%;
--secondary-foreground: 215 25% 27%;
--muted:      210 14% 93%;
--muted-foreground: 215 16% 47%;
--accent:     142 20% 92%;
--accent-foreground: 142 76% 18%;
--destructive: 0 84% 60%;
--destructive-foreground: 0 0% 100%;
--border:     214 13% 88%;
--input:      214 13% 88%;
--ring:       142 76% 24%;
--radius:     1rem;
```

*`tailwind.config.ts` — add inside `theme.extend`:*
```ts
fontFamily: {
  sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
},
```

Leave the `.dark { ... }` block in `globals.css` untouched (out of scope).

**Acceptance Criteria:**
- [ ] All CSS variables in `:root` match the values above; no hardcoded hex color values remain in `globals.css`
- [ ] `--radius` is `1rem`
- [ ] `tailwind.config.ts` has `theme.extend.fontFamily.sans` set to `['var(--font-inter)', ...]`
- [ ] `.dark` block is untouched
- [ ] `next build` passes with no TypeScript errors
- [ ] Visual smoke-check: app background is a cool off-white, cards are pure white, primary green is deeper/richer

**Dependencies:** None

**Notes:**
This is the foundation for all subsequent tasks. Token changes propagate across the entire
app instantly via Tailwind's `hsl(var(--...))` references. Run the app locally after this
task and verify that no component has obviously broken styling (e.g., white-on-white text)
before proceeding.

---

### Task 2: Inter Font Loading + Navigation Bar Redesign (`layout.tsx`)

**Priority:** High

**Description:**
Import Inter via `next/font/google`, apply it to the `<html>` element, and redesign the
top navigation bar from the current dark emerald gradient to a clean white light-mode bar.

**Files to change:**
- `src/app/layout.tsx`

**What to do:**

*Font import (add at top of file):*
```ts
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
```

*Apply to `<html>`:*
```tsx
<html lang="de" className={inter.variable}>
```

*Navigation bar — replace the current dark gradient `<nav>` / `<header>` wrapper with:*
- Background: `bg-white` (or `bg-card`)
- Bottom border: `border-b border-border`
- Subtle shadow: `shadow-sm`
- Remove all `from-[#064e3b]`, `to-[#047857]`, `bg-gradient-to-r`, and any `bg-emerald-*` / `bg-green-*` classes
- Logo/wordmark: leaf icon (use `🌿` emoji as interim or a `Leaf` icon from `lucide-react`) + "GrünBilanz" in `font-semibold text-primary`
- Nav links ("Erfassung", Settings icon): `text-foreground hover:text-primary transition-colors duration-150`; active link uses `text-primary font-medium`
- Height: retain `h-14` (56 px)
- Sticky behavior: retain `sticky top-0 z-50`

**Acceptance Criteria:**
- [ ] Inter font loads via `next/font/google` with `variable: '--font-inter'` and `display: 'swap'`
- [ ] `<html>` element has `className` containing `inter.variable`
- [ ] Navigation bar has a white/light background — no dark gradient classes remain
- [ ] Navigation bar has `border-b border-border` and/or `shadow-sm`
- [ ] Logo treatment: icon + "GrünBilanz" text in `text-primary font-semibold`
- [ ] No hardcoded hex color values remain in `layout.tsx`
- [ ] App renders with Inter typeface visibly applied (body copy, headings)
- [ ] `next build` passes with no TypeScript errors
- [ ] Navigation is usable at both 375 px (mobile) and 1440 px (desktop)
- [ ] All existing Playwright e2e tests pass

**Dependencies:** Task 1

**Notes:**
`next/font/google` downloads and self-hosts the font at build time — no runtime CDN
request. The Docker build stage already has internet access (for `npm ci`), so this works
in the offline Docker deployment model. After this task the app body text will visibly
switch to Inter.

---

### Task 3: Shared Scope Color Constants (`src/lib/scopeColors.ts`)

**Priority:** High

**Description:**
Create a single TypeScript constant file that defines the three scope chart colors. All
chart components will import from this file, eliminating inline color duplication.

**Files to change:**
- `src/lib/scopeColors.ts` (**new file**)

**What to do:**

Create `src/lib/scopeColors.ts` with:
```ts
/**
 * Canonical chart colors for CO₂ emission scopes.
 *
 * Scope 1 — Direct emissions:   deep forest green  (WCAG AA on white ✓)
 * Scope 2 — Energy/electricity: teal-green         (WCAG AA on white ✓)
 * Scope 3 — Indirect/supply:    warm amber          (WCAG AA on white ✓; ESG convention)
 */
export const SCOPE_COLORS = {
  SCOPE1: '#166534', // deep forest green
  SCOPE2: '#0d9488', // teal-green
  SCOPE3: '#d97706', // warm amber
} as const;

export type ScopeColorKey = keyof typeof SCOPE_COLORS;
```

**Acceptance Criteria:**
- [ ] File `src/lib/scopeColors.ts` exists and exports `SCOPE_COLORS` as a `const` assertion
- [ ] Three color values match the spec: `#166534`, `#0d9488`, `#d97706`
- [ ] `ScopeColorKey` type is exported
- [ ] `next build` passes with no TypeScript errors

**Dependencies:** None (can be done in parallel with Tasks 1–2)

**Notes:**
This is a pure new-file addition — zero risk to existing functionality. It must exist
before Tasks 7 (charts) and 8 (secondary cards) can be completed.

---

### Task 4: KPI Hero Card Redesign (`KpiCard.tsx`)

**Priority:** High

**Description:**
Redesign the full-width KPI hero card from a dark emerald gradient card to a white
elevated card with a left accent border, clear typographic hierarchy, and a
year-over-year trend indicator.

**Files to change:**
- `src/components/dashboard/KpiCard.tsx`

**What to do:**

Replace the dark gradient card wrapper with:
- Outer wrapper: `bg-card rounded-xl shadow-lg border border-border border-l-4 border-l-primary p-6`
  - Note: Tailwind does not have `border-l-primary` by default — use `style={{ borderLeftColor: 'hsl(var(--primary))' }}` on the wrapper or add a custom utility, or use `border-l-[hsl(var(--primary))]`
- Remove all `from-[#064e3b]`, `to-[#047857]`, `bg-gradient-to-r`, `text-white` gradient classes
- KPI columns: two-column flex layout with a vertical divider (`border-r border-border` on left column)
- Metric value: `text-5xl font-bold tabular-nums text-foreground`
- Unit label: `text-base font-medium text-muted-foreground`
- Description label: `text-sm text-muted-foreground`
- Trend indicator (when prior year data available): a small arrow icon (`TrendingUp` / `TrendingDown` from `lucide-react`) + percentage delta in `text-xs font-medium`; green for improvement, amber for regression
- Optional tinted header band: `bg-primary/5 -mx-6 -mt-6 px-6 py-3 mb-4 rounded-t-xl` containing a section label like "Gesamtemissionen"

**Acceptance Criteria:**
- [ ] Card background is white (`bg-card`) — no dark gradient remains
- [ ] Card has `shadow-lg` and a left accent border in `var(--primary)` color
- [ ] KPI metric values use `text-5xl font-bold tabular-nums`
- [ ] Two KPI columns are visually separated by a divider
- [ ] Trend indicator renders when prior-year data is available (arrow icon + delta %)
- [ ] No hardcoded hex color values remain in the component
- [ ] Component renders correctly with and without prior-year data
- [ ] `next build` passes with no TypeScript errors

**Dependencies:** Task 1 (tokens must exist)

**Notes:**
The `border-l-4` left accent border is the key brand anchor that differentiates this card
from secondary cards (which use `shadow-sm`). The `shadow-lg` ensures it reads as the
primary element on the page. Check that the trend indicator gracefully handles the case
where no prior-year record exists (render nothing, not an error).

---

### Task 5: Dashboard Page Header + Empty State (`page.tsx`)

**Priority:** High

**Description:**
Replace the gradient-tinted hero section with a structured, typographic page header.
Also upgrade any bare text/emoji empty states on the dashboard to icon-based empty state
components.

**Files to change:**
- `src/app/page.tsx`

**What to do:**

*Page header — replace the gradient hero section with:*
```tsx
<div className="mb-8">
  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
    {company.name}
  </h1>
  <p className="mt-1 text-sm text-muted-foreground">
    CO₂-Bilanz · Berichtsjahr {selectedYear}
  </p>
</div>
```
- Year selector and "Daten erfassen" CTA button: align right on desktop (`flex justify-between items-start`), stack below on mobile
- Remove all gradient classes from the header section

*Empty state — replace bare text/emoji fallbacks with:*
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Leaf className="h-12 w-12 text-muted-foreground mb-4" />
  <h2 className="text-lg font-semibold text-foreground mb-1">
    Noch keine Emissionsdaten erfasst
  </h2>
  <p className="text-sm text-muted-foreground mb-4">
    Erfassen Sie Ihre Verbrauchsdaten, um die CO₂-Bilanz zu berechnen.
  </p>
  <a href="/wizard" className="text-sm font-medium text-primary hover:underline">
    Jetzt Daten erfassen →
  </a>
</div>
```
- Import `Leaf` from `lucide-react`
- Apply the empty state wherever the dashboard currently shows a plain text/emoji fallback

**Acceptance Criteria:**
- [ ] Page header shows company name as `h1` with `text-3xl font-semibold tracking-tight`
- [ ] Subtitle line shows "CO₂-Bilanz · Berichtsjahr {year}" in `text-muted-foreground`
- [ ] No gradient classes remain on the page header section
- [ ] Year selector and CTA button are right-aligned on desktop, stacked on mobile
- [ ] Empty state uses `Leaf` icon (48 px), German headline, body text, and "Jetzt Daten erfassen →" link
- [ ] No bare emoji-only or plain-text-only fallbacks remain on the dashboard
- [ ] `next build` passes with no TypeScript errors
- [ ] All existing Playwright e2e tests pass

**Dependencies:** Task 1 (tokens), Task 2 (layout/Inter)

**Notes:**
The page header intentionally has no background color — the cool off-white page background
(from Task 1) provides visual breathing room. Do not add a card wrapper around the header.
Check that `Leaf` is exported from the installed version of `lucide-react` (`lucide-react`
is already in `package.json`).

---

### Task 6: Year Selector — CSS-Styled Native `<select>` (`YearSelector.tsx`)

**Priority:** Medium

**Description:**
Wrap the existing `<select>` element in a positioned div with a `ChevronDown` icon
overlay to replace the browser-default arrow. Apply consistent Inter font, border,
radius, and focus ring styling.

**Files to change:**
- `src/components/dashboard/YearSelector.tsx`

**What to do:**

Wrap the existing `<select>` in:
```tsx
<div className="relative inline-block">
  <select
    className="appearance-none w-full text-sm font-sans border border-border
               rounded-lg px-3 py-2 pr-8 bg-card text-foreground
               focus:outline-none focus:ring-2 focus:ring-ring
               min-h-[44px] cursor-pointer transition-colors duration-150
               hover:border-primary/50"
    {/* ...keep all existing props (value, onChange, disabled, etc.) */}
  >
    {/* ...keep all existing <option> children */}
  </select>
  <ChevronDown
    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4
               text-muted-foreground pointer-events-none"
  />
</div>
```

- Import `ChevronDown` from `lucide-react`
- `appearance-none` removes the browser default arrow on Chromium/Firefox
- The `pointer-events-none` on the icon ensures clicks pass through to the `<select>`
- Do **not** change any state management, server action calls, or event handlers — only the JSX wrapper and class names

**Acceptance Criteria:**
- [ ] `<select>` has `appearance-none` — no default browser arrow visible on Chrome/Firefox
- [ ] `ChevronDown` icon is visible and positioned over the right side of the select
- [ ] Select matches design system: Inter font, `border-border`, `rounded-lg`, `bg-card`, `focus:ring-2 focus:ring-ring`
- [ ] Min touch target height ≥ 44 px (`min-h-[44px]`)
- [ ] All existing state management and server action calls are unchanged
- [ ] Component works with keyboard navigation (native `<select>` semantics preserved)
- [ ] `next build` passes with no TypeScript errors
- [ ] All existing Playwright e2e tests pass (year selection still works)

**Dependencies:** Task 1 (tokens)

**Notes:**
This is a low-risk, purely visual change — the internal logic of `YearSelector` is
untouched. On Safari iOS the native sheet picker still appears on tap; this is expected
and acceptable. Verify the `ChevronDown` icon does not overlap the last option text by
checking the `pr-8` padding on the `<select>`.

---

### Task 7: Chart Color + Style Upgrade — All Three Charts

**Priority:** High

**Description:**
Update `ScopeDonut`, `CategoryBarChart`, and `YearOverYearChart` to use the shared
`SCOPE_COLORS` constant and apply refined axis, gridline, tooltip, and legend styling
from the specification. Add a centred total label to the donut chart.

**Files to change:**
- `src/components/dashboard/ScopeDonut.tsx`
- `src/components/dashboard/CategoryBarChart.tsx`
- `src/components/dashboard/YearOverYearChart.tsx`

**What to do — per component:**

**`ScopeDonut.tsx`**
- `import { SCOPE_COLORS } from '@/lib/scopeColors'`
- Replace inline color strings with `SCOPE_COLORS.SCOPE1`, `.SCOPE2`, `.SCOPE3`
- Add a centred total label inside the donut ring using Recharts `<Label>` inside `<Pie>`:
  ```tsx
  <Label
    content={({ viewBox }) => {
      const { cx, cy } = viewBox as { cx: number; cy: number };
      return (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
          <tspan className="fill-foreground text-2xl font-bold">{total}t</tspan>
          <tspan x={cx} dy="1.4em" className="fill-muted-foreground text-xs">CO₂e</tspan>
        </text>
      );
    }}
    position="center"
  />
  ```
  Note: Recharts SVG `<text>` elements don't parse Tailwind classes directly — use inline `fill` and `fontSize` style props instead of class names.
- Move legend to **above** the chart area using `<Legend verticalAlign="top" />`
- Use colored squares (`iconType="square"`) as legend markers

**`CategoryBarChart.tsx`**
- `import { SCOPE_COLORS } from '@/lib/scopeColors'`
- Replace inline scope color strings with `SCOPE_COLORS.*`
- Add `radius={[6, 6, 0, 0]}` on each `<Bar>` for rounded top corners
- Axis styling:
  ```tsx
  <XAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
  ```
- Gridlines: `<CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />`
- Tooltip: `<Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid hsl(var(--border))', fontSize: 12 }} />`
- Move legend above chart: `<Legend verticalAlign="top" iconType="square" />`
- Add empty state: when no data, render icon (`BarChart2`) + German headline + CTA link

**`YearOverYearChart.tsx`**
- `import { SCOPE_COLORS } from '@/lib/scopeColors'`
- Replace inline scope color strings with `SCOPE_COLORS.*`
- Apply the same axis / gridline / tooltip style as `CategoryBarChart` above
- Add `radius={[6, 6, 0, 0]}` on each `<Bar>`
- Move legend above chart
- Add empty state when no multi-year data is available

**Acceptance Criteria:**
- [ ] All three chart components import colors exclusively from `SCOPE_COLORS` — no inline hex color strings remain
- [ ] `ScopeDonut` shows a centre label with total CO₂e (value + "CO₂e" sub-label)
- [ ] `ScopeDonut` legend is positioned above the chart with square markers
- [ ] `CategoryBarChart` bars have `radius={[6,6,0,0]}` (rounded tops)
- [ ] Both bar charts have dashed horizontal gridlines (`strokeDasharray="3 3"`, `vertical={false}`)
- [ ] Both bar charts have axis ticks styled with `fontSize: 12` and muted foreground color; `axisLine={false}`, `tickLine={false}`
- [ ] Tooltip uses `rounded-lg`, `border-border`, and Inter font size
- [ ] `CategoryBarChart` and `YearOverYearChart` display a structured empty state (icon + headline + CTA) when no data
- [ ] Three scope colors pass WCAG AA contrast against white (#166534 ✓, #0d9488 ✓, #d97706 ✓)
- [ ] `next build` passes with no TypeScript errors
- [ ] All existing Playwright e2e tests pass

**Dependencies:** Task 3 (scopeColors.ts must exist)

**Notes:**
Recharts SVG elements do not process Tailwind classes — use inline `style` or direct
props (e.g., `fill`, `fontSize`) for SVG text styling rather than `className`. Keep
`isAnimationActive` at its current default (Recharts entrance animation is sufficient).
The centred donut label requires computing the total value in the component and passing
it as a prop or deriving it from the `data` array.

---

### Task 8: Secondary Cards — Benchmark, Status List, Audit Log, Report Buttons

**Priority:** Medium

**Description:**
Apply consistent card styling tokens and component-specific refinements to the four
remaining dashboard cards: `BranchenvergleichCard`, `CategoryStatusList`, `AuditLogPanel`,
and `ReportButtons`.

**Files to change:**
- `src/components/dashboard/BranchenvergleichCard.tsx`
- `src/components/dashboard/CategoryStatusList.tsx`
- `src/components/dashboard/AuditLogPanel.tsx`
- `src/components/dashboard/ReportButtons.tsx`

**What to do:**

*All four cards — apply consistent base card style:*
- Wrapper: `bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-150 p-6`
- Card header/title: `text-sm font-semibold text-foreground mb-4`
- Remove any hardcoded `bg-white`, `bg-gray-*`, `rounded-2xl`, `rounded-lg` inconsistencies

**`BranchenvergleichCard.tsx`**
- Apply the card base style above
- Progress bar colors: use `bg-primary` for the "Ihr Betrieb" bar; use a neutral `bg-muted` for the benchmark bar
- Result indicator: a clear badge/chip showing "Besser" (green) or "Schlechter" (amber) using `bg-primary/10 text-primary` or `bg-amber-100 text-amber-700` chip classes

**`CategoryStatusList.tsx`**
- Apply the card base style above
- Per-scope section header: add a small colored dot (using `SCOPE_COLORS` as inline `backgroundColor`) before each scope label
- Progress indication: wrap each scope section with a compact progress bar showing completion % using `bg-primary/20` track + `bg-primary` fill
- Import `SCOPE_COLORS` for the scope color dots

**`AuditLogPanel.tsx`**
- Apply the card base style above
- Replace text arrows (`▲ ▼`) with `ChevronDown` / `ChevronUp` from `lucide-react` for expand/collapse toggle
- Animate height transition: add `overflow-hidden transition-all duration-200` to the collapsible wrapper; use `max-h-0` (collapsed) vs `max-h-[600px]` (expanded) — or use a CSS `grid` approach: `grid-rows-[0fr]` → `grid-rows-[1fr]` for a smooth collapse
- Striped table rows: odd rows `bg-muted/30`, even rows transparent
- Action badges: "Erstellt" → `bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full`; "Geändert" → `bg-blue-100 text-blue-800 ...`; "Gelöscht" → `bg-red-100 text-red-800 ...`
- Date column: add `tabular-nums font-mono text-xs` class

**`ReportButtons.tsx`**
- Apply the card base style above
- Layout: three equal-width cards in a CSS `grid grid-cols-1 sm:grid-cols-3 gap-4` within the section
- Icon circles: increase to 48 px (`h-12 w-12`) using `bg-primary/10 rounded-full flex items-center justify-center`
- Primary action (GHG-Bericht): use a solid `bg-primary text-primary-foreground` button below the icon
- Secondary actions (CSRD, Badge): use an outline `border border-primary text-primary` button below each icon
- Loading state: replace pulsing text with `Loader2` icon from `lucide-react` with `animate-spin` class
- Import `Loader2` from `lucide-react`
- Hover effect on each card: `hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 active:scale-[0.98]`

**Acceptance Criteria:**
- [ ] All four cards use `bg-card rounded-xl border border-border shadow-sm p-6` base style
- [ ] All four cards have `hover:shadow-md transition-shadow duration-150` hover elevation
- [ ] `BranchenvergleichCard` progress bar uses `bg-primary` and has a result badge chip
- [ ] `CategoryStatusList` per-scope sections have colored scope dots and a compact progress bar
- [ ] `AuditLogPanel` expand/collapse uses `ChevronDown`/`ChevronUp` icons — no text arrows
- [ ] `AuditLogPanel` panel animates height with a smooth CSS transition (no instant show/hide)
- [ ] `AuditLogPanel` table has striped row backgrounds and styled action badges
- [ ] `AuditLogPanel` date column uses `tabular-nums` class
- [ ] `ReportButtons` uses a 3-column grid layout with equal-width cards
- [ ] `ReportButtons` icon circles are 48 px with `bg-primary/10` backgrounds
- [ ] `ReportButtons` loading state uses `Loader2 animate-spin` — no pulsing text
- [ ] `ReportButtons` primary button is solid `bg-primary`; secondary buttons are outline style
- [ ] `ReportButtons` cards have `hover:-translate-y-0.5 active:scale-[0.98]` micro-interactions
- [ ] No hardcoded color hex values remain in any of the four files
- [ ] `next build` passes with no TypeScript errors
- [ ] All existing Playwright e2e tests pass

**Dependencies:** Task 1 (tokens), Task 3 (scopeColors for `CategoryStatusList`)

**Notes:**
The height animation for `AuditLogPanel` using `max-height` is the simplest CSS-only
approach that avoids JavaScript measurement. Use `max-h-[600px]` as the expanded value
(or a value larger than the realistic maximum panel height). The `grid-rows` trick
(`grid-rows-[0fr]` → `grid-rows-[1fr]`) is more robust but requires a wrapping `min-h-0`
inner div — either approach is acceptable. Keep the collapse state controlled by the
existing React state variable.

---

### Task 9: Wizard & Settings Pages — Token Consistency Pass

**Priority:** Low

**Description:**
Apply the updated design tokens (card style, typography, border radius, color variables)
to the Wizard and Settings pages for visual consistency. This is a class-string update
only — no layout, UX flow, or component structure changes.

**Files to change:**
- `src/app/wizard/WizardLayoutInner.tsx`
- `src/app/settings/SettingsClient.tsx`

**What to do:**

For both files:
- Replace any hardcoded `bg-white` with `bg-card`
- Replace `rounded-2xl`, `rounded-lg` inconsistencies with `rounded-xl`
- Replace `shadow` with `shadow-sm` for standard card resting state
- Ensure card wrappers have `border border-border`
- Ensure heading elements use appropriate Tailwind typography classes (`text-xl font-semibold`, `text-sm text-muted-foreground`, etc.)
- Replace any gradient backgrounds (`bg-gradient-to-r`, `from-green-*`, `to-emerald-*`) with plain `bg-card` or `bg-background`
- Ensure buttons use `bg-primary text-primary-foreground` (primary) or `border border-border text-foreground` (secondary) classes — no hardcoded `bg-emerald-*` or `bg-green-*` button colors
- Do NOT change form field layout, step order, validation logic, or any functional behavior

**Acceptance Criteria:**
- [ ] No `bg-white` literals remain; `bg-card` is used for card surfaces
- [ ] No `rounded-2xl` inconsistencies — all card wrappers use `rounded-xl`
- [ ] No hardcoded `bg-emerald-*`, `bg-green-*`, or hex color values remain in these files
- [ ] Cards have `border border-border shadow-sm` base style
- [ ] All buttons use design-token classes (`bg-primary`, `border-border`, etc.)
- [ ] Wizard step flow, validation, and form submission are functionally unchanged
- [ ] Settings form fields, save/cancel actions are functionally unchanged
- [ ] `next build` passes with no TypeScript errors
- [ ] All existing Playwright e2e tests pass (wizard flow still works end-to-end)

**Dependencies:** Task 1 (tokens must exist)

**Notes:**
This is deliberately the lowest-priority task — the wizard and settings pages are
functional but not the primary showcase. A quick visual pass is sufficient; no pixel-
perfect redesign is expected. If a pattern is unclear (e.g., a button variant that doesn't
map cleanly to the token system), prefer a conservative change over an incorrect one.

---

## Implementation Order

Recommended sequence (each step is independently committable and testable):

1. **Task 3** — `scopeColors.ts` — pure new file, zero risk, unblocks Tasks 7 & 8
2. **Task 1** — CSS tokens + Tailwind config — foundation for all visual changes
3. **Task 2** — Inter font + nav bar — visible brand change; confirms token system works
4. **Task 4** — KPI Hero Card — highest-visibility component; validates card pattern
5. **Task 5** — Dashboard page header + empty state — completes the above-the-fold redesign
6. **Task 6** — Year Selector — isolated, low-risk component update
7. **Task 7** — Charts (all three) — uses `SCOPE_COLORS`; high visual impact
8. **Task 8** — Secondary cards (Benchmark, StatusList, AuditLog, ReportButtons)
9. **Task 9** — Wizard & Settings token pass — lowest risk, done last

Run `next build` and the Playwright e2e suite after each task before committing the next.

---

## Open Questions

All four open questions from the Feature Specification are resolved in the Architecture ADR:

| # | Question | Resolution |
|---|---|---|
| 1 | Font hosting | `next/font/google` (build-time self-hosted; Docker-compatible) |
| 2 | KPI card style | Option A — White elevated card with left accent border |
| 3 | Scope 3 color | Amber (`#d97706`) — approved; ESG convention and WCAG AA |
| 4 | Year selector complexity | Option B — CSS-styled `<select>` wrapper with `ChevronDown` overlay |

No open questions remain that require maintainer input before implementation begins.
