/**
 * GET/POST/PUT/DELETE /api/entries — REST API for EmissionEntry CRUD.
 * Supplements Server Actions for external tooling access.
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { saveEntry, deleteEntry } from '@/lib/actions';
import { prisma } from '@/lib/prisma';
import type { Scope, EmissionCategory } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const reportingYearId = searchParams.get('reportingYearId');
  const scope = searchParams.get('scope') as Scope | null;
  const category = searchParams.get('category') as EmissionCategory | null;

  const entries = await prisma.emissionEntry.findMany({
    where: {
      ...(reportingYearId ? { reportingYearId: parseInt(reportingYearId) } : {}),
      ...(scope ? { scope } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const result = await saveEntry(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') ?? '0');
    if (!id) return NextResponse.json({ error: 'id erforderlich.' }, { status: 400 });

    const body = await request.json();
    const result = await saveEntry({ ...body, id });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') ?? '0');
  if (!id) return NextResponse.json({ error: 'id erforderlich.' }, { status: 400 });

  const result = await deleteEntry(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
