# Feature: Modern UI Redesign

## Overview

GrünBilanz currently presents a functional but visually dated interface built on plain Tailwind utility classes, a dark emerald gradient navigation bar, and standard white cards with subtle shadows. The redesign transforms the application into a premium, modern B2B SaaS experience — comparable to products like Linear, Vercel, or Stripe — while preserving the green/emerald brand identity that communicates sustainability.

The goal is not to add new functionality but to elevate every visual surface so that German Handwerksbetriebe and their Großkunden perceive GrünBilanz as a trustworthy, polished product.

---

## User Goals

- **Betriebsinhaber** wants an app that looks professional enough to show to customers and banks alongside the PDF reports it generates.
- **Betriebsinhaber** wants data-heavy screens (charts, tables) to feel easy to scan and understand at a glance.
- **Betriebsinhaber** wants the interface to feel modern and on par with other SaaS tools they use daily (e.g., online banking, booking platforms).
- **All users** benefit from clear visual hierarchy that guides attention to the most important numbers and actions first.

---

## Scope

### In Scope

- **Global typography**: Replace the system-UI font stack with Inter (or an equivalent premium variable font) loaded via `next/font` for zero layout shift and no external network dependency at runtime.
- **CSS design tokens**: Refine the existing HSL CSS variables in `globals.css` to a more sophisticated, cool-tinted neutral background palette with a darker, richer primary green and a complementary accent.
- **Navigation bar**: Redesign the top navigation from the current opaque dark-green gradient to a clean, frosted-glass or light-mode top bar with proper logo treatment, active link indicators, and an optional collapsible mobile drawer.
- **Dashboard hero header**: Upgrade the gradient-tinted hero section (company name + year selector) to a more structured page header with clear typographic hierarchy.
- **KPI Hero Card**: Redesign the dark gradient KPI card with a more refined layout — richer data presentation, better number hierarchy (large metric / small label / contextual sub-label), and optionally a trend indicator.
- **Data cards (charts, benchmark, status)**: Standardise the white card style across all secondary cards with a consistent elevated-shadow pattern, a subtle inner border, and refined padding.
- **Scope Donut chart**: Upgrade chart colors to a more curated, accessible green palette with better legend layout and a central label showing the total.
- **Category Bar chart**: Improve bar colors, axis typography, gridline style, and add a color legend that distinguishes scopes clearly.
- **Year-over-Year chart**: Refine grouped bar chart with consistent scope colors, cleaner axis labels, and optional trend arrows.
- **Benchmark card**: Redesign the progress-bar comparison with a more visual, side-by-side gauge treatment and a clearer result indicator.
- **Category Status List**: Upgrade the per-scope checklist with more visual progress indication (e.g., a per-scope completion ring or progress bar above each section).
- **Report Buttons**: Redesign the three action buttons (GHG report, CSRD questionnaire, Badge) as a more premium action section with better icon treatment and hover states.
- **Year Selector**: Replace the native `<select>` with a styled custom dropdown or segmented control that fits the design system.
- **Audit Log Panel**: Modernise the collapsible table with cleaner typography, alternating row shading, and styled action badges.
- **Empty states**: All "no data" fallback panels should be replaced with illustrated or icon-based empty state designs that include a clear call-to-action.
- **Micro-interactions**: Add tasteful CSS transitions for card hover elevation, button active states, and chart tooltip appearances.
- **Wizard and Settings pages**: Apply the same design tokens (typography, card style, color) for visual consistency across all app routes, even if their layout is not redesigned in depth.

### Out of Scope

- No new features, data fields, or business logic changes.
- No structural changes to the database schema or API routes.
- No changes to PDF report or badge output styling.
- No introduction of a sidebar navigation (the current top-bar navigation model is retained; a sidebar can be a separate future feature).
- No dark-mode implementation beyond what already exists in the CSS variables (dark mode variables remain as-is unless they fall naturally out of the token refresh).
- No third-party component library adoption (e.g., shadcn/ui, Radix UI primitives not already in use) — all styling uses Tailwind CSS utility classes and the existing CSS variable system.
- No changes to the wizard multi-step flow UX (page structure, step order, form logic).

---

## User Experience

### Typography

- Inter is the reference typeface: a neutral, highly legible grotesque used across leading SaaS products.
- It must be loaded with `next/font/google` (or a self-hosted variant) so it is inlined at build time with no runtime network requests, preserving the current offline/Docker-first deployment model.
- Font weights in use: 400 (body), 500 (medium — labels, secondary headings), 600 (semibold — card titles, KPI labels), 700 (bold — hero numbers, page titles).
- Font size scale remains Tailwind's default (`text-xs` through `text-5xl`) but is applied more consistently with tighter tracking on headings and relaxed line-height on body copy.

### Color Palette

The existing HSL CSS variable structure in `globals.css` is retained; the values are refined:

| Token | Current intent | Refined direction |
|---|---|---|
| `--background` | Green-tinted near-white | Cooler, near-neutral off-white (very slight warm grey) |
| `--foreground` | Navy | Pure near-black with slight warm tint for softer reading |
| `--primary` | Forest green-700 | Richer, deeper forest green; slightly more blue-shifted for screen legibility |
| `--primary-foreground` | White | White |
| `--secondary` | Light green | Neutral light grey-green — less saturated |
| `--muted` | Pale green | Near-neutral cool grey |
| `--muted-foreground` | Slate grey | Slightly warmer medium grey |
| `--border` | Light green-grey | Crisp neutral light grey |
| `--card` | White | Pure white |
| `--radius` | 0.75rem | Increase slightly to 1rem for larger cards; smaller radius (0.5rem) for inline badges |

Chart scope colors are also refined:
- **Scope 1** (direct emissions): Deep forest green (`#166534` or similar) — confident, grounded.
- **Scope 2** (energy): Medium teal-green (`#0d9488` or similar) — distinctly different from Scope 1 and Scope 3, not just a lighter shade.
- **Scope 3** (indirect): Warm amber-gold (`#d97706` or similar) — visually distinct from the greens, communicates indirect/external origin; commonly used in ESG color conventions.

This three-color system replaces the current dark-green / medium-green / light-green scheme which is hard to distinguish on low-contrast displays and for color-blind users.

### Navigation Bar

The redesigned navigation is a clean, light-mode top bar (not a dark gradient):

- **Background**: White with a bottom border (`border-b`) or a very subtle `shadow-sm` — matches modern SaaS apps (Vercel dashboard, Linear, Notion).
- **Logo mark**: A leaf or tree icon (can use the existing 🌿 emoji as interim) followed by "GrünBilanz" in semibold Inter. Brand color for the wordmark.
- **Navigation links**: "Erfassung" (Wizard) and the Settings icon, styled as pill-shaped or underlined active-state indicators.
- **Height**: 56px (current 56px / `h-14` is acceptable — retain).
- **Sticky behavior**: Retained.
- **Mobile**: The current single-row layout works at mobile sizes; no hamburger menu is required at this stage.

### Dashboard Page Header

Replace the gradient-tinted hero section with a structured page header:

- Company name as `h1` in large semibold Inter.
- Subtitle line: "CO₂-Bilanz · Berichtsjahr {year}" in muted color.
- Year selector and "Daten erfassen" CTA button aligned to the right on desktop, stacked below on mobile.
- No gradient background on the header — let the page background handle the visual breathing room.

### KPI Hero Card

The full-width hero card (currently a dark emerald gradient) should be redesigned:

- **Option A — Elevated white card**: White background with a strong drop shadow and a thick left accent border in primary green. Each KPI (Total CO₂e, CO₂e/MA) occupies a column with a clear typographic hierarchy: large tabular number → unit → label.
- **Option B — Gradient card retained but refined**: If the dark-green gradient is kept, refine it to use the updated primary color with a more subtle gradient direction; add a fine top highlight edge.
- Either option must include: a trend indicator compared to the previous year (arrow + percentage delta) when prior year data is available.
- The two KPI columns should have a subtle divider between them.

### Data Cards (Charts, Benchmark, Status List, Report Buttons)

Consistent card style across all secondary cards:

- Background: `var(--card)` (white).
- Border: 1px `var(--border)` — crisp neutral grey.
- Shadow: A layered shadow system (e.g., `shadow-sm` for resting state, `shadow-md` on hover for interactive cards).
- Border radius: `rounded-xl` (1rem) — slightly larger than current `rounded-2xl` is acceptable; consistency matters more than the exact value.
- Card header: Section title in `text-sm font-semibold` with 16–20px bottom margin before chart content.
- Internal padding: 24px (`p-6`) — retained.

### Chart Styling

All Recharts charts should be upgraded with:

- **Updated scope color palette** (see Color Palette section above — Scope 1 deep green, Scope 2 teal, Scope 3 amber).
- **Custom axis tick styling**: `text-xs` Inter, muted foreground color, no axis lines (only gridlines).
- **Gridlines**: Dashed, very light grey — `#f3f4f6` or similar, horizontal only for bar charts.
- **Tooltips**: White background, `rounded-lg`, 1px border, small drop shadow, Inter font. Show both the formatted value and the percentage of total where applicable.
- **Legend**: Place legends above the chart area (not below) for faster reading; use colored dots or squares (not lines) as legend markers.
- **ScopeDonut**: Add a centred label inside the donut ring showing the total CO₂e in tonnes — eliminates the need to look at the legend to understand the scale.
- **Bar charts**: Bars with fully rounded top corners (`radius={[6,6,0,0]}`); slightly wider bars for better click targets.
- **Animation**: Recharts built-in entrance animation (already present) is sufficient; no additional animation library needed.

### Empty States

Every chart card and the dashboard itself must have a proper empty state when no data is available:

- **Icon**: A relevant lucide-react icon (e.g., `BarChart2` for chart cards, `Leaf` for the overall dashboard) displayed at 48px, in muted foreground.
- **Headline**: Short, friendly German sentence explaining what would appear here (e.g., "Noch keine Emissionsdaten erfasst").
- **Body text**: One sentence explaining the action that will populate this view.
- **CTA**: An inline text-link or small button pointing to the Wizard ("Jetzt Daten erfassen →").
- **No emoji-only fallbacks**: The current plain emoji (`🌿`) and bare text fallbacks should be replaced with the structured empty-state treatment.

### Micro-interactions & Transitions

- All interactive cards (Report Buttons, links) should have `transition-all duration-150` with a subtle `translateY(-1px)` or shadow elevation on hover.
- Buttons should have an `active:scale-[0.98]` press effect.
- The KPI numbers can use a CSS counter animation on first render (via CSS `@keyframes` or a small hook) — optional but impactful.
- The Audit Log panel expand/collapse should animate height with a smooth CSS transition rather than an instant show/hide.
- Chart tooltip fade-in is handled by Recharts' built-in animation.
- No external animation library (Framer Motion, GSAP, etc.) should be added.

### Year Selector

The native `<select>` element should be replaced with a custom-styled dropdown:

- Visually matches the design system (Inter font, border, radius, focus ring).
- Shows a chevron icon (from lucide-react) as the dropdown indicator.
- Must remain accessible (keyboard navigation, focus management).
- Internally still uses a `<select>` element for native browser compatibility, but with custom CSS styling to override browser defaults — or a fully custom listbox component.

### Audit Log Panel

- The expand/collapse toggle should be a cleaner header design with a `ChevronDown`/`ChevronUp` icon (lucide-react) replacing the text arrows (`▲ ▼`).
- The table should use striped row backgrounds for readability.
- Action badges (Erstellt / Geändert / Gelöscht) should use consistent, refined color chips.
- Date column should use a monospace or tabular-nums class for alignment.

### Report Buttons Panel

- Section renamed to "Berichte & Nachweise" (already current) — retained.
- Layout: Three equal-width cards in a row.
- Primary action (GHG-Bericht) has a stronger visual treatment: solid primary-green background button below the icon, instead of just a tinted border card.
- Icon circles are larger (48px) and use the updated primary palette.
- Loading state shows a spinner icon (lucide-react `Loader2` with spin animation) instead of pulsing text.

---

## Success Criteria

- [ ] Inter (or equivalent premium variable font) is loaded via `next/font` and applied to the `body` element.
- [ ] The navigation bar no longer uses a dark emerald gradient; it is a clean light-mode bar consistent with the new design direction.
- [ ] All CSS design tokens (`globals.css`) are updated to the refined palette; no hardcoded `[#064e3b]`-style color values remain in layout or navigation components.
- [ ] The three scope colors in all charts are visually distinct and pass WCAG AA contrast against white backgrounds.
- [ ] All chart cards use the updated scope color palette (Scope 1 deep green, Scope 2 teal-green, Scope 3 amber).
- [ ] All chart cards display a structured empty state (icon + headline + CTA) when no data is available, replacing the current text-only fallbacks.
- [ ] The KPI Hero Card displays a year-over-year trend indicator when prior year data is available.
- [ ] The ScopeDonut chart shows a center label with the total CO₂e.
- [ ] The native `<select>` Year Selector is replaced by a custom-styled component.
- [ ] The Audit Log panel uses a `ChevronDown`/`ChevronUp` icon for expand/collapse.
- [ ] All interactive elements have hover and active CSS transitions.
- [ ] The dashboard passes a visual consistency check: card border radius, shadow level, padding, and typography are uniform across all cards.
- [ ] The application continues to pass all existing Playwright e2e tests without modification.
- [ ] The application builds without TypeScript errors (`next build` clean).
- [ ] The application renders correctly at 375px (mobile) and 1440px (desktop) viewport widths.

---

## Open Questions

1. **Font hosting**: Should Inter be loaded from Google Fonts (requires internet at first load in dev, but `next/font` self-hosts at build time) or bundled as a local font file? For the offline Docker deployment model, `next/font/google` with `display: swap` is acceptable since fonts are downloaded at build time. The Architect should confirm this is compatible with the Docker build stage.

2. **KPI card style**: Option A (white elevated card) vs Option B (refined gradient card) — the Maintainer's preference for the hero KPI card treatment should be confirmed before implementation.

3. **Scope 3 color — amber vs green**: Using amber/gold for Scope 3 (indirect emissions) is a common ESG convention but departs from the all-green brand palette. The Maintainer should confirm this is acceptable, or specify an alternative that maintains differentiation without leaving the green family.

4. **Custom dropdown component complexity**: A fully custom accessible listbox for the Year Selector carries implementation overhead. If the Architect deems it disproportionate, a CSS-only styled `<select>` wrapper is an acceptable fallback.
