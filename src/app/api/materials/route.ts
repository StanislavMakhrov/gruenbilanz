/**
 * GET /api/materials — returns MaterialEntry records for a given reportingYearId.
 * Used by the wizard MaterialienScreen to pre-fill the dynamic table on load.
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const reportingYearId = searchParams.get('reportingYearId');

  if (!reportingYearId) {
    return NextResponse.json({ error: 'reportingYearId erforderlich' }, { status: 400 });
  }

  try {
    const materials = await prisma.materialEntry.findMany({
      where: { reportingYearId: parseInt(reportingYearId) },
      orderBy: { createdAt: 'asc' },
      select: { id: true, material: true, quantityKg: true, supplierName: true },
    });
    return NextResponse.json(materials);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
