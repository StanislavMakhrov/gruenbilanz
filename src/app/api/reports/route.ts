/**
 * POST /api/reports — Generates a GHG Protocol or CSRD PDF report.
 * Must run on Node.js runtime (react-pdf requires full Node.js environment).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderReport } from '@/lib/pdf';
import { calculateCO2e } from '@/lib/emissions';
import type { ReportType } from '@prisma/client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { reportingYearId: number; type?: string };
    const { reportingYearId, type = 'GHG_PROTOCOL' } = body;

    if (!reportingYearId) {
      return NextResponse.json({ error: 'reportingYearId ist erforderlich.' }, { status: 400 });
    }

    const [company, year, entries, materialEntries] = await Promise.all([
      prisma.companyProfile.findUniqueOrThrow({ where: { id: 1 } }),
      prisma.reportingYear.findUniqueOrThrow({ where: { id: reportingYearId } }),
      prisma.emissionEntry.findMany({ where: { reportingYearId } }),
      prisma.materialEntry.findMany({ where: { reportingYearId } }),
    ]);

    // Calculate scope totals
    const scope1Entries = entries.filter((e) => e.scope === 'SCOPE1');
    const scope2Entries = entries.filter((e) => e.scope === 'SCOPE2');
    const scope3Entries = entries.filter((e) => e.scope === 'SCOPE3');

    const [scope1Kg, scope2Kg] = await Promise.all([
      Promise.all(scope1Entries.map((e) => calculateCO2e(e.category, e.quantity, year.year))).then((vals) => vals.reduce((a, b) => a + b, 0)),
      Promise.all(scope2Entries.map((e) => calculateCO2e(e.category, e.quantity, year.year, { isOekostrom: e.isOekostrom }))).then((vals) => vals.reduce((a, b) => a + b, 0)),
    ]);

    const scope3FromEntries = await Promise.all(
      scope3Entries.map((e) => calculateCO2e(e.category, e.quantity, year.year)),
    ).then((vals) => vals.reduce((a, b) => a + b, 0));

    const scope3FromMaterials = await Promise.all(
      materialEntries.map((m) => calculateCO2e(m.material, m.quantityKg, year.year)),
    ).then((vals) => vals.reduce((a, b) => a + b, 0));

    const scope3Kg = scope3FromEntries + scope3FromMaterials;

    const reportType = type as ReportType;
    const pdfBuffer = await renderReport(reportType, {
      company,
      year,
      entries,
      materialEntries,
      scope1TotalKg: scope1Kg,
      scope2TotalKg: scope2Kg,
      scope3TotalKg: scope3Kg,
      generatedAt: new Date(),
    });

    // Save report record
    const reportRecord = await prisma.report.create({
      data: {
        reportingYearId,
        type: reportType,
        filePath: `report_${reportingYearId}_${type}_${Date.now()}.pdf`,
      },
    });

    const filename = `GruenBilanz_${type}_${year.year}.pdf`;
    // Convert Buffer to Uint8Array — Uint8Array is a valid BodyInit, Buffer (a subclass) is not
    // recognized as such in TypeScript's DOM lib types, so explicit conversion is required.
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Report-Id': String(reportRecord.id),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('report generation error:', error);
    return NextResponse.json(
      { error: 'PDF-Erstellung fehlgeschlagen.', detail: msg },
      { status: 500 },
    );
  }
}
