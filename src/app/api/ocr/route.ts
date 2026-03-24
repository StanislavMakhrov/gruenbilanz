/**
 * POST /api/ocr — Validates uploaded file and returns OCR extraction result.
 * Stores a StagingEntry in the database (expires after 24 hours).
 * Uses the OCR stub from lib/ocr/index.ts.
 *
 * Must run on Node.js runtime (file processing, Prisma).
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractFromFile } from '@/lib/ocr';
import type { EmissionCategory, Scope } from '@prisma/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null;
    const reportingYearId = parseInt(formData.get('reportingYearId') as string);
    const scope = formData.get('scope') as Scope | null;

    if (!file || !category || !reportingYearId || !scope) {
      return NextResponse.json(
        { error: 'Fehlende Pflichtfelder: file, category, reportingYearId, scope' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Datei zu groß. Maximal 10 MB erlaubt.' },
        { status: 400 },
      );
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Ungültiges Dateiformat. Nur PDF und Bilder (JPEG, PNG) werden akzeptiert.' },
        { status: 400 },
      );
    }

    // Store uploaded document bytes in DB
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadedDoc = await prisma.uploadedDocument.create({
      data: {
        filename: file.name,
        mimeType: file.type,
        sizeBytes: buffer.length,
        content: buffer,
      },
    });

    // Run OCR extraction (stub)
    const result = await extractFromFile(file, category);

    if (result.error || result.value === null) {
      return NextResponse.json(
        { error: result.error ?? 'OCR fehlgeschlagen. Bitte Wert manuell eingeben.' },
        { status: 422 },
      );
    }

    // Upsert StagingEntry (expires in 24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const staging = await prisma.stagingEntry.upsert({
      where: {
        reportingYearId_scope_category: {
          reportingYearId,
          scope,
          category: category as EmissionCategory,
        },
      },
      create: {
        reportingYearId,
        scope,
        category: category as EmissionCategory,
        quantity: result.value,
        confidence: result.confidence,
        source: 'OCR',
        expiresAt,
      },
      update: {
        quantity: result.value,
        confidence: result.confidence,
        expiresAt,
      },
    });

    return NextResponse.json({
      stagingId: staging.id,
      documentId: uploadedDoc.id,
      quantity: result.value,
      unit: result.unit,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('OCR route error:', error);
    return NextResponse.json(
      { error: 'OCR-Verarbeitung fehlgeschlagen. Bitte erneut versuchen.' },
      { status: 500 },
    );
  }
}
