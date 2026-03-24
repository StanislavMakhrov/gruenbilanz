/**
 * GET /api/documents/[id] — Streams an uploaded document's bytes.
 * The document bytes are stored in UploadedDocument.content (PostgreSQL Bytes).
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // Next.js 15 requires awaiting route params (they are now Promise-based)
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Ungültige Dokument-ID.' }, { status: 400 });
  }

  const doc = await prisma.uploadedDocument.findUnique({ where: { id } });

  if (!doc) {
    return NextResponse.json({ error: 'Dokument nicht gefunden.' }, { status: 404 });
  }

  // Convert Prisma Bytes (Buffer) to Uint8Array — Buffer is not a valid BodyInit in TypeScript
  // but Uint8Array is, and Buffer is a subclass of Uint8Array so this is safe at runtime.
  return new NextResponse(new Uint8Array(doc.content), {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.filename)}"`,
      'Content-Length': String(doc.content.length),
    },
  });
}
