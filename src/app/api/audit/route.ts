/**
 * GET /api/audit — Paginated AuditLog query.
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const reportingYearId = searchParams.get('reportingYearId');
  const take = Math.min(parseInt(searchParams.get('take') ?? '50'), 100);
  const skip = parseInt(searchParams.get('skip') ?? '0');

  const logs = await prisma.auditLog.findMany({
    where: reportingYearId
      ? {
          OR: [
            { emissionEntry: { reportingYearId: parseInt(reportingYearId) } },
            { materialEntry: { reportingYearId: parseInt(reportingYearId) } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take,
    skip,
    include: { document: { select: { id: true, filename: true } } },
  });

  return NextResponse.json(logs);
}
