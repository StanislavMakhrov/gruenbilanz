/**
 * POST /api/csv — Validates uploaded CSV/XLSX file and returns parsed preview.
 * Uses the CSV stub from lib/csv/index.ts.
 *
 * Must run on Node.js runtime.
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { importFromCsv } from '@/lib/csv';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei übermittelt.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Datei zu groß. Maximal 10 MB erlaubt.' },
        { status: 400 },
      );
    }

    const allowedTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const isAllowed = allowedTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx');
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Ungültiges Dateiformat. Nur CSV- und Excel-Dateien werden akzeptiert.' },
        { status: 400 },
      );
    }

    const result = await importFromCsv(file);
    return NextResponse.json(result);
  } catch (error) {
    console.error('CSV route error:', error);
    return NextResponse.json(
      { error: 'CSV-Import fehlgeschlagen. Bitte erneut versuchen.' },
      { status: 500 },
    );
  }
}
