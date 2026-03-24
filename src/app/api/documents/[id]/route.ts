/**
 * GET /api/documents/[id] — Streams an uploaded document's bytes.
 * The document bytes are stored in UploadedDocument.data (PostgreSQL Bytes).
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = parseInt(params.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Ungültige Dokument-ID.' }, { status: 400 });
  }

  const doc = await prisma.uploadedDocument.findUnique({ where: { id } });

  if (!doc) {
    return NextResponse.json({ error: 'Dokument nicht gefunden.' }, { status: 404 });
  }

  return new NextResponse(doc.data, {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.filename)}"`,
      'Content-Length': String(doc.data.length),
    },
  });
}
