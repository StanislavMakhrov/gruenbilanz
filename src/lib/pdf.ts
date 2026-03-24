/**
 * PDF report generation helper for GrünBilanz.
 *
 * Wraps @react-pdf/renderer to produce GHG Protocol and CSRD questionnaire PDFs.
 * MUST run on Node.js runtime only — never Edge runtime.
 * Enforced at the API route level via `export const runtime = 'nodejs'`.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
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
  // Dynamic import to avoid loading react-pdf in Edge runtime
  const { GHGReport } = await import('@/components/reports/GHGReport');
  const { CSRDQuestionnaire } = await import('@/components/reports/CSRDQuestionnaire');

  const component =
    type === 'GHG_PROTOCOL'
      ? React.createElement(GHGReport, { data })
      : React.createElement(CSRDQuestionnaire, { data });

  const buffer = await renderToBuffer(component);
  return Buffer.from(buffer);
}
