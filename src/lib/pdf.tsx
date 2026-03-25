/**
 * PDF report generation helper for GrünBilanz.
 *
 * Wraps @react-pdf/renderer to produce GHG Protocol and CSRD questionnaire PDFs.
 * MUST run on Node.js runtime only — never Edge runtime.
 * Enforced at the API route level via `export const runtime = 'nodejs'`.
 *
 * WHY .tsx (not .ts):
 * Next.js 15's server bundle aliases `react` to the RSC-vendored React 19 canary,
 * which creates elements with `$$typeof: Symbol.for("react.transitional.element")`.
 * @react-pdf/renderer (built against React 18) only recognises
 * `Symbol.for("react.element")`, so calling `React.createElement()` with the RSC
 * React causes a runtime crash inside renderToBuffer.
 *
 * The webpack alias in next.config.ts maps `react/jsx-runtime` → `lib/pdf-jsx-runtime.js`
 * for this file. Using JSX syntax here means the SWC/webpack transform calls our
 * custom runtime (which creates elements with the correct React 18 symbol) instead of
 * the RSC React's createElement.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import type React from 'react';
import type { ReportType, CompanyProfile, EmissionEntry, MaterialEntry, ReportingYear } from '@prisma/client';

/** All data required to render either report type */
export interface ReportData {
  company: CompanyProfile;
  year: ReportingYear;
  entries: EmissionEntry[];
  materialEntries: MaterialEntry[];
  /** Pre-calculated CO₂e totals per scope (kg) */
  scope1TotalKg: number;
  scope2TotalKg: number;
  scope3TotalKg: number;
  /** Formatted timestamp for report generation date */
  generatedAt: Date;
}

/**
 * Renders a report to a PDF Buffer using @react-pdf/renderer.
 *
 * @param type - GHG_PROTOCOL or CSRD_QUESTIONNAIRE
 * @param data - All required data for the report
 * @returns Buffer containing the rendered PDF bytes
 */
export async function renderReport(type: ReportType, data: ReportData): Promise<Buffer> {
  // Dynamic imports keep the PDF components out of the initial server bundle,
  // which avoids pulling heavy @react-pdf/renderer assets into pages that don't need them.
  if (type === 'GHG_PROTOCOL') {
    const { GHGReport } = await import('@/components/reports/GHGReport');
    // JSX here is compiled via pdf-jsx-runtime (see next.config.ts webpack alias).
    // This ensures $$typeof === Symbol.for("react.element"), which @react-pdf/renderer
    // expects — NOT the RSC React 19 canary's "react.transitional.element".
    // Cast via unknown: renderToBuffer expects DocumentProps but GHGReport returns GHGReportProps;
    // the runtime is correct because GHGReport renders a <Document> root.
    const buffer = await renderToBuffer(<GHGReport data={data} /> as unknown as React.ReactElement<object>);
    return Buffer.from(buffer);
  }

  const { CSRDQuestionnaire } = await import('@/components/reports/CSRDQuestionnaire');
  // Same cast rationale as GHGReport above.
  const buffer = await renderToBuffer(<CSRDQuestionnaire data={data} /> as unknown as React.ReactElement<object>);
  return Buffer.from(buffer);
}
