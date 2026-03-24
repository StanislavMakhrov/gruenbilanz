# Work Protocol: GrünBilanz Full Application Build

**Work Item:** `docs/features/001-gruenbilanz-full-build/`
**Branch:** `copilot/feature-grunbilanz-full-application-build-again`
**Workflow Type:** Feature
**Created:** 2026-03-24

## Agent Work Log

<!-- Each agent appends their entry below when they complete their work. -->

### Requirements Engineer
- **Date:** 2026-03-24
- **Summary:** Explored repository structure and existing architecture documentation. Read `docs/architecture.md` (arc42, version 1.1) in full, along with `docs/conventions.md`. Created the feature specification at `docs/features/001-gruenbilanz-full-build/specification.md`, covering all product requirements, acceptance criteria, and technical constraints for the complete GrünBilanz application build. Issue number determined as 001 (no prior feature folders exist).
- **Artifacts Produced:**
  - `docs/features/001-gruenbilanz-full-build/specification.md`
  - `docs/features/001-gruenbilanz-full-build/work-protocol.md`
- **Problems Encountered:** None.

### Architect
- **Date:** 2026-03-24
- **Summary:** Read `docs/architecture.md` (arc42 v1.1) in full alongside the feature specification. Confirmed full alignment — all six existing ADRs (ADR-001 through ADR-006) cover every architectural decision required for this feature. No new ADRs were needed. Created `docs/features/001-gruenbilanz-full-build/architecture.md` with a comprehensive feature-level implementation guide covering: component breakdown (76 source files across pages, API routes, and lib modules), data flow for each of the 7 wizard screens, the CO₂e calculation pipeline with full factor-key mapping table, the PDF generation approach (React-PDF on Node.js runtime), Docker/infrastructure setup (multi-stage Dockerfile, supervisord, init.sql seed data strategy), Server Actions design, status badge logic, and unit test requirements. The document is structured as an actionable reference for the Developer agent.
- **Artifacts Produced:**
  - `docs/features/001-gruenbilanz-full-build/architecture.md`
- **Problems Encountered:** None. The architecture was already comprehensively defined in `docs/architecture.md`; this document provides the Developer with a consolidated, feature-scoped view of all implementation details.

### Quality Engineer
- **Date:** 2026-03-24
- **Summary:** Read the feature specification, architecture document, and `docs/testing-strategy.md` in full. Created a comprehensive test plan mapping all 60+ acceptance criteria to automated test cases across five test types (unit, integration, component, E2E, smoke). Defined 31 factor keys and all edge cases for `lib/emissions.ts` and `lib/factors.ts` unit tests (≥ 80% coverage requirement). Specified integration tests for all 9 Server Actions covering happy path, upsert, cascade delete, and failure scenarios. Specified Playwright E2E tests for the primary happy path, year management, OCR stub flow, and PDF generation. Created a separate UAT test plan with 17 manual verification steps covering the full user journey in the running app.
- **Artifacts Produced:**
  - `docs/features/001-gruenbilanz-full-build/test-plan.md`
  - `docs/features/001-gruenbilanz-full-build/uat-test-plan.md`
- **Problems Encountered:** None. No existing test files were present (e2e-tests/ contains only `.gitkeep`), so all test case specifications are greenfield and follow conventions from `docs/testing-strategy.md`.

### Task Planner
- **Date:** 2026-03-24
- **Summary:** Read all prior artifacts (`specification.md`, `architecture.md`, `test-plan.md`, `docs/architecture.md` arc42 v1.1, `docs/conventions.md`) in full. Created a comprehensive `tasks.md` covering 9 implementation phases with 32 tasks (IDs TASK-1.1 through TASK-9.5). Each task includes description, priority (P1/P2/P3), concrete file list, measurable acceptance criteria, and explicit dependency references. The task breakdown follows the implementation order recommended in `architecture.md §12` (infrastructure → lib modules → server actions → dashboard → wizard → reports → settings → unit tests → E2E tests). All 76 source files from the architecture component breakdown are mapped to specific tasks. Unit test coverage requirements (≥ 80% for `emissions.ts` and `factors.ts`) and all non-functional requirements (German UI, mobile-first, WCAG 2.1 AA, TypeScript strict, file size limits) are captured as a cross-cutting concern section.
- **Artifacts Produced:**
  - `docs/features/001-gruenbilanz-full-build/tasks.md` (32 tasks across 9 phases, 1335 lines)
- **Problems Encountered:** None. Specification and architecture documents were fully detailed with no ambiguity. All ADRs (ADR-001 through ADR-006) are finalised; no open questions remain.
