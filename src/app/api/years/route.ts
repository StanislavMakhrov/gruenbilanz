/**
 * GET /api/years — returns all ReportingYear records sorted descending.
 * Used by the wizard to determine the active year when no yearId param is set.
 * POST /api/years — creates a new ReportingYear.
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createReportingYear } from '@/lib/actions';

export async function GET(): Promise<NextResponse> {
  try {
    const years = await prisma.reportingYear.findMany({
      orderBy: { year: 'desc' },
      select: { id: true, year: true, createdAt: true },
    });
    return NextResponse.json(years);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { year } = (await request.json()) as { year: number };
    if (!year) return NextResponse.json({ error: 'year erforderlich' }, { status: 400 });
    const result = await createReportingYear(year);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }
}
