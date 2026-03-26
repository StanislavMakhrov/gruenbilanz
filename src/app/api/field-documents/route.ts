/**
 * GET/POST /api/field-documents — Per-field document attachments.
 * One FieldDocument per (fieldKey, year). Stored in container filesystem.
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const FIELD_DOCS_DIR = process.env.REPORTS_PATH ? join(process.env.REPORTS_PATH, 'field-docs') : '/app/reports/field-docs';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const fieldKey = searchParams.get('fieldKey');
  const year = parseInt(searchParams.get('year') ?? '0');

  if (!fieldKey || !year) {
    return NextResponse.json({ error: 'fieldKey und year sind erforderlich.' }, { status: 400 });
  }

  const doc = await prisma.fieldDocument.findUnique({
    where: { fieldKey_year: { fieldKey, year } },
  });

  return NextResponse.json(doc ?? null);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fieldKey = formData.get('fieldKey') as string | null;
    const year = parseInt(formData.get('year') as string);

    if (!file || !fieldKey || !year) {
      return NextResponse.json({ error: 'file, fieldKey und year sind erforderlich.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Datei zu groß (max. 10 MB).' }, { status: 400 });
    }

    // Save file to container filesystem
    await mkdir(FIELD_DOCS_DIR, { recursive: true });
    const safeName = `${fieldKey}_${year}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = join(FIELD_DOCS_DIR, safeName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Upsert FieldDocument record
    const doc = await prisma.fieldDocument.upsert({
      where: { fieldKey_year: { fieldKey, year } },
      create: { fieldKey, year, filePath, originalFilename: file.name, mimeType: file.type },
      update: { filePath, originalFilename: file.name, mimeType: file.type },
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error('field-documents POST error:', error);
    return NextResponse.json({ error: 'Datei-Upload fehlgeschlagen.' }, { status: 500 });
  }
}
