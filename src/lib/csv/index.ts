/**
 * CSV import interface for GrünBilanz.
 *
 * This is a STUB implementation that returns hardcoded preview data.
 * The real implementation would use papaparse or the xlsx library to
 * parse actual CSV/XLSX content server-side (never client-side).
 *
 * Security note: all values are treated as strings to prevent formula injection.
 */

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export interface CsvImportResult {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Simulates CSV/XLSX import from a DATEV or utility company export.
 *
 * Returns hardcoded preview data mimicking a typical DATEV CSV structure.
 * Real implementation: POST file to /api/csv → server parses → returns headers + rows.
 *
 * @param file - The uploaded CSV or XLSX file
 */
export async function importFromCsv(file: File | Buffer): Promise<CsvImportResult> {
  // Use Buffer.isBuffer() for proper TypeScript narrowing — instanceof Buffer does not narrow
  // generics (Buffer<ArrayBufferLike>) correctly in stricter TS versions.
  const size = Buffer.isBuffer(file) ? file.length : file.size;
  if (size > MAX_FILE_SIZE_BYTES) {
    throw new Error('CSV-Import fehlgeschlagen: Datei zu groß (max. 10 MB)');
  }

  // Validate MIME type for File objects
  if (file instanceof File) {
    const isAllowed = ALLOWED_MIME_TYPES.some(
      (t) => file.type === t || file.name.endsWith('.csv') || file.name.endsWith('.xlsx'),
    );
    if (!isAllowed) {
      throw new Error('CSV-Import fehlgeschlagen: Nur CSV- und XLSX-Dateien werden unterstützt');
    }
  }

  // Simulate brief processing delay
  await new Promise<void>((resolve) => setTimeout(resolve, 500));

  // Hardcoded stub response mimicking a DATEV fuel cost export
  return {
    headers: ['Kostenstelle', 'Kategorie', 'Menge', 'Einheit', 'Datum'],
    rows: [
      { Kostenstelle: 'Fuhrpark', Kategorie: 'Diesel', Menge: '1200', Einheit: 'L', Datum: '31.01.2024' },
      { Kostenstelle: 'Fuhrpark', Kategorie: 'Diesel', Menge: '980', Einheit: 'L', Datum: '28.02.2024' },
      { Kostenstelle: 'Fuhrpark', Kategorie: 'Benzin', Menge: '180', Einheit: 'L', Datum: '31.01.2024' },
      { Kostenstelle: 'Heizung', Kategorie: 'Erdgas', Menge: '720', Einheit: 'm³', Datum: '31.01.2024' },
      { Kostenstelle: 'Heizung', Kategorie: 'Erdgas', Menge: '650', Einheit: 'm³', Datum: '28.02.2024' },
    ],
  };
}
