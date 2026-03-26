# Architecture: Modern UI Redesign

## Status

Approved

## Context

GrünBilanz is a Next.js 15 App Router application styled with Tailwind CSS v3.4
(note: the `package.json` lists `tailwindcss: "^3.4.1"` — the runtime is v3, not v4;
the `tailwind.config.ts` file is the single configuration entry-point).

The redesign transforms the visual language to a premium, modern B2B SaaS aesthetic while
preserving all existing functionality, the green brand identity, and full compatibility with
the Docker-based offline deployment model. Implementation is achievable entirely via:

- Updated CSS custom properties in `globals.css`
- Tailwind utility-class edits to layout and component files
- One new shared constant file for scope chart colors
- No new npm dependencies beyond what `next` already ships

The four open questions from the Feature Specification are resolved below.

---

## Decision 1 — Font Loading: `next/font/google`

### Options Considered

**Option A — `next/font/google`**

`next/font/google` is part of the `next` package (zero new dependency). When
`next build` runs, Next.js fetches the requested font variant from Google Fonts,
generates a CSS `@font-face` declaration pointing to a hashed file under
`.next/static/media/`, and embeds a `<link rel="preload">` tag. The font bytes
are included in the Docker build output (`COPY --from=builder /app/.next/static
./.next/static`) and served entirely from the container at runtime. No external
DNS or CDN request is made when users open the app.

- Pros: Self-hosted at build time; zero runtime network dependency; zero layout
  shift (`display: optional` or `display: swap`); no manual font file management;
  automatic subset optimisation; already part of Next.js — no new package.
- Cons: Requires internet access during `RUN npm run build` in the Docker build
  stage. This is already true for `npm ci` (it fetches all packages); the build
  stage is not air-gapped.

**Option B — Bundled local font file**

Download the Inter variable font WOFF2 files, place them in `public/fonts/`, and
declare a `@font-face` rule in `globals.css`.

- Pros: No network call at any stage; works even in completely air-gapped CI.
- Cons: Manual version management; larger repository; no automatic subset
  optimisation; requires manual `<link rel="preload">` tags to avoid FOUT.

### Decision

**Option A — `next/font/google`.**

The Dockerfile's build stage (`FROM node:20-alpine AS builder`) already issues
network requests for `npm ci`. The same internet access that downloads npm
packages is available for `next build` to self-host the font. The production
runtime stage (`FROM node:20-alpine AS runner`) copies only the compiled output
and serves fonts from `.next/static/media/` — it has no Google Fonts dependency.
`next/font/google` is already part of the `next` package so no new dependency is
introduced.

### Implementation Notes

```ts
// src/app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
```

Apply the CSS variable to `<html>` via `className={inter.variable}` and update
`globals.css` to reference `var(--font-inter)` as the `font-family` for `body`.

---

## Decision 2 — KPI Hero Card Style: Option A (White Elevated Card)

### Options Considered

**Option A — White elevated card with left accent border**

White background (`var(--card)`), a strong multi-layer drop shadow, and a 4 px
left border in `var(--primary)`. Each KPI column gets clear typographic hierarchy:
large tabular number → unit → label.

- Pros: Visually consistent with the redesigned light-mode navigation bar (both
  surfaces are now white); matches the card style used across all other dashboard
  cards; works well alongside the new cool-neutral background; easier to read
  light-colored numbers on white than the reverse.
- Cons: Hero card is less visually distinct from secondary cards; requires a
  slightly stronger shadow to signal importance.

**Option B — Refined dark gradient (keep current direction)**

The existing `from-[#064e3b] to-[#047857]` gradient is kept but tuned to the
updated primary color. Numbers remain white on dark.

- Pros: Strong visual contrast; KPI block stands out clearly.
- Cons: The navigation bar is also being changed from a dark gradient to a white
  bar. Keeping a dark gradient on the KPI card while removing it from the nav
  produces visual inconsistency. The card also embeds hardcoded hex values
  (`from-[#064e3b]`) that the design-token refresh explicitly wants to eliminate.

### Decision

**Option A — White elevated card.**

Removing the dark gradient from the navigation while keeping it only on the KPI
card creates an orphaned visual element. The white elevated card approach is
internally consistent, aligns with the premium-SaaS direction (Vercel/Linear
dashboards use white cards with strong shadows for hero metrics), and uses only
CSS custom properties — no hardcoded hex colors.

To ensure the hero card reads as the primary element, it receives:
- `shadow-lg` elevated shadow (heavier than secondary cards at `shadow-sm`/`shadow-md`)
- A 4 px solid left border in `var(--primary)` as a green brand anchor
- `text-5xl` tabular numerals for the metric values
- A subtle top-of-card color band (`bg-primary/5`) or a tinted header row

---

## Decision 3 — Scope 3 Color: Amber

### Options Considered

**Option A — Amber/gold for Scope 3 (`#d97706`)**

- Scope 1 → deep forest green (`#166534`)
- Scope 2 → teal-green (`#0d9488`)
- Scope 3 → warm amber (`#d97706`)

- Pros: The three colors are visually distinct at every contrast level, including
  for users with deuteranopia/protanopia (green-red color blindness). Amber for
  indirect/external emissions is an established convention in ESG reporting
  software. The current all-green scheme (green-700 / green-500 / green-300) fails
  WCAG AA contrast requirements for the two lighter shades against white.
- Cons: Amber departs from the exclusively green brand palette.

**Option B — Three distinct greens (differentiated but all-green)**

Use a teal, a mid-green, and a yellow-green — staying within the green family.

- Pros: Brand palette remains all-green.
- Cons: On low-contrast displays and for color-blind users the three greens are
  still difficult to distinguish. Teal and mid-green are easy to confuse even for
  users with normal color vision at small sizes.

### Decision

**Option A — Amber for Scope 3.**

The accessibility argument is conclusive: the current green-700 / green-500 /
green-300 scheme fails WCAG AA contrast for the two lighter shades. The three-
color system (deep green / teal / amber) is established ESG convention and
significantly improves chart legibility for all users. The amber accent is
contained to chart elements; the navigation bar, cards, and primary actions
remain fully green.

### Implementation Notes

Define a single shared constant in `src/lib/scopeColors.ts`:

```ts
export const SCOPE_COLORS = {
  SCOPE1: '#166534', // deep forest green — direct emissions
  SCOPE2: '#0d9488', // teal-green      — energy/electricity
  SCOPE3: '#d97706', // amber            — indirect/supply chain
} as const;
```

All chart components (`ScopeDonut`, `CategoryBarChart`, `YearOverYearChart`) import
from this single source. Legend labels and tooltip entries also use these values.
This eliminates the current inline color duplication across three files.

---

## Decision 4 — Year Selector: CSS-Styled Native `<select>`

### Options Considered

**Option A — Fully custom accessible listbox component**

Replace `<select>` with a `<div role="combobox">` / `<ul role="listbox">` pattern,
manually managing keyboard navigation, `aria-activedescendant`, focus trapping, and
`createReportingYear` integration.

- Pros: Maximum visual control; fully custom appearance on every browser/OS.
- Cons: The current `YearSelector` component already manages four pieces of state
  (`isPending`, `isCreating`, `router`, `useTransition`) and a server action call.
  Layering a full ARIA listbox implementation onto this logic significantly raises
  the risk of regressions. Native `<select>` provides free keyboard navigation,
  screen-reader support, and mobile-native picker UI at zero implementation cost.

**Option B — CSS-styled `<select>` wrapper**

Wrap the existing `<select>` in a positioned `<div>` that hides the browser's
default arrow and renders a `ChevronDown` icon from `lucide-react` on top.
Apply Tailwind classes for font, border, radius, focus ring, and padding.

- Pros: Retains native browser semantics (keyboard navigation, screen-reader
  label association, mobile pickers); zero state-management changes; visually
  achieves the design goal; much lower implementation risk.
- Cons: The `<select>` appearance cannot be fully controlled on all platforms
  (some mobile OSes still show the native picker overlay). The option list
  cannot be styled.

### Decision

**Option B — CSS-styled `<select>` wrapper.**

The visual goal (matching Inter font, custom border, custom chevron icon) is
fully achievable with a positioned wrapper. The implementation complexity of a
full ARIA listbox is disproportionate given that `YearSelector` also manages a
server action for year creation. Native `<select>` provides superior accessibility
with zero additional work.

### Implementation Notes

```tsx
// Wrapper div uses `relative` + `pointer-events-none` overlay for the icon.
<div className="relative">
  <select
    className="appearance-none w-full text-sm border border-border rounded-lg
               px-3 py-2 pr-8 bg-card focus:outline-none focus:ring-2
               focus:ring-ring min-h-[44px] font-sans"
    /* ... existing props */
  >
    {/* ... existing options */}
  </select>
  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4
                           text-muted-foreground pointer-events-none" />
</div>
```

The `appearance-none` Tailwind class suppresses the browser default arrow on
Chromium and Firefox. On Safari iOS the native sheet still appears on tap —
this is acceptable and expected behavior for a `<select>` element.

---

## Library / Package Changes

### No new npm dependencies required

All design goals are achievable with existing packages:

| Need | Solution | Package |
|---|---|---|
| Inter font | `next/font/google` | `next` (already installed) |
| Chevron/icons | `ChevronDown`, `Loader2`, `BarChart2`, `Leaf` | `lucide-react` (already installed) |
| CSS transitions | Tailwind `transition-*` utilities | `tailwindcss` (already installed) |
| Chart colors | Inline `fill` props on Recharts cells | `recharts` (already installed) |

**No `npm install` step is needed.** The redesign is a zero-dependency-addition change.

---

## CSS / Tailwind Architecture

### globals.css — Design Token Refresh

The existing HSL variable structure is preserved; only the values are updated:

```css
:root {
  /* Cooler, near-neutral off-white — replaces green-tinted background */
  --background: 220 14% 96%;
  /* Pure near-black with warm tint */
  --foreground: 220 13% 13%;
  --card:       0 0% 100%;
  --card-foreground: 220 13% 13%;
  /* Richer, deeper forest green */
  --primary:    142 76% 24%;
  --primary-foreground: 0 0% 100%;
  /* Neutral light grey-green */
  --secondary:  210 16% 93%;
  --secondary-foreground: 215 25% 27%;
  /* Cool grey muted */
  --muted:      210 14% 93%;
  --muted-foreground: 215 16% 47%;
  /* Neutral accent */
  --accent:     142 20% 92%;
  --accent-foreground: 142 76% 18%;
  /* Destructive unchanged */
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  /* Crisp neutral border */
  --border:     214 13% 88%;
  --input:      214 13% 88%;
  --ring:       142 76% 24%;
  /* Increased radius for modern premium feel */
  --radius:     1rem;
}
```

The dark-mode block (`.dark { ... }`) is left untouched — it is out of scope
and no dark-mode work is planned.

### tailwind.config.ts — No Changes Needed

The existing config already maps all design tokens to Tailwind color names via
`hsl(var(--...))` references. The `emerald` and `green` color extensions remain
in place (they are used by chart components that hardcode specific shades).
The scope color refactoring moves all chart colors to `src/lib/scopeColors.ts`
so the hardcoded chart hex values are no longer referenced in class names.

**One addition**: Add `fontFamily` to the `theme.extend` block to expose
`--font-inter` as the `font-sans` stack:

```ts
extend: {
  fontFamily: {
    sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  },
  // ... rest of existing extend block
}
```

This ensures `font-sans` (applied to `body` in `globals.css`) automatically
resolves to Inter once the CSS variable is set by `next/font/google`.

---

## Component Update Strategy: Incremental, File-by-File

All changes are mechanical (class string swaps, color constant substitutions).
The update order is:

1. **Foundation** — `globals.css` token values + `tailwind.config.ts` fontFamily
2. **Layout** — `src/app/layout.tsx`: Inter font loading + nav bar redesign
3. **Shared constant** — `src/lib/scopeColors.ts`: single source for scope colors
4. **KPI card** — `src/components/dashboard/KpiCard.tsx`
5. **Dashboard page** — `src/app/page.tsx`: page header + empty state
6. **Year selector** — `src/components/dashboard/YearSelector.tsx`
7. **Charts** — `ScopeDonut`, `CategoryBarChart`, `YearOverYearChart`
8. **Secondary cards** — `BranchenvergleichCard`, `CategoryStatusList`,
   `AuditLogPanel`, `ReportButtons`
9. **Wizard & Settings pages** — token consistency pass only

Each step is independently committable and testable. The existing Playwright e2e
test suite runs after each step to catch regressions before moving forward.

No component is deleted; all are edited in-place. This approach minimises merge
conflicts and keeps each changeset reviewable.

---

## What NOT to Change (Scope Limits)

| Area | Reason |
|---|---|
| Database schema / Prisma models | Out of scope — no data model changes |
| API routes / Server Actions | Out of scope — logic unchanged |
| PDF / Badge report output | Out of scope — separate rendering path |
| Dark mode CSS variables | Out of scope — `.dark {}` block untouched |
| Wizard multi-step flow UX | Out of scope — form structure unchanged |
| Navigation model (top bar) | Retained — sidebar is a future feature |
| Recharts library version | No upgrade needed — existing v2 API sufficient |
| Playwright e2e test selectors | Must continue to pass without modification |
| `next.config.ts` / `Dockerfile` | No changes needed |
| `src/lib/emissions.ts` and related business logic | Never touched by UI work |

---

## Components Affected

| File | Change type |
|---|---|
| `src/app/globals.css` | CSS variable value updates; Inter `font-family` reference |
| `src/app/layout.tsx` | Inter font import; nav bar class changes (white bg, border-b) |
| `src/tailwind.config.ts` | `theme.extend.fontFamily.sans` addition |
| `src/lib/scopeColors.ts` | **New file** — shared scope color constants |
| `src/app/page.tsx` | Page header redesign; empty state icon treatment |
| `src/components/dashboard/KpiCard.tsx` | White elevated card with accent border |
| `src/components/dashboard/YearSelector.tsx` | CSS-styled `<select>` + ChevronDown |
| `src/components/dashboard/ScopeDonut.tsx` | Import `SCOPE_COLORS`; center label; legend above |
| `src/components/dashboard/CategoryBarChart.tsx` | Import `SCOPE_COLORS`; rounded bar tops; gridline/axis style |
| `src/components/dashboard/YearOverYearChart.tsx` | Import `SCOPE_COLORS`; axis/gridline style |
| `src/components/dashboard/BranchenvergleichCard.tsx` | Card style tokens; typography |
| `src/components/dashboard/CategoryStatusList.tsx` | Card style; progress indication |
| `src/components/dashboard/AuditLogPanel.tsx` | ChevronDown icon; striped rows; action badges |
| `src/components/dashboard/ReportButtons.tsx` | Premium card treatment; Loader2 spinner |
| `src/app/wizard/WizardLayoutInner.tsx` | Token consistency pass |
| `src/app/settings/SettingsClient.tsx` | Token consistency pass |

---

## Consequences

### Positive

- Zero new npm dependencies — no supply-chain risk, no Docker image size increase.
- All changes are pure CSS/class edits — no business logic is touched.
- Shared `scopeColors.ts` constant eliminates color drift between chart components.
- `next/font/google` ensures Inter is subset and preloaded correctly with no FOUT.
- Accessibility improves: the three-color scope system passes WCAG AA; larger
  radius and refined spacing improve touch targets.

### Negative / Risks to Monitor

- `--radius: 1rem` applied globally may cause minor layout shifts on components
  that currently assume a smaller radius. Developer should verify all rounded
  corners after the token change.
- `appearance-none` on `<select>` in Safari desktop shows no arrow — the
  `ChevronDown` overlay covers this, but must be verified in cross-browser QA.
- Amber (Scope 3) departs from the all-green palette; confirm this is acceptable
  with the Maintainer before finalising the implementation. *(This ADR recommends
  amber; the Maintainer may override to an alternative such as teal-500 if brand
  consistency is prioritised over ESG convention.)*
