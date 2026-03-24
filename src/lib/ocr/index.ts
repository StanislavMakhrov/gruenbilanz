/**
 * OCR extraction interface for GrünBilanz.
 *
 * This is a STUB implementation that simulates OCR extraction with a 1–2 second delay
 * and returns hardcoded values. The real implementation would POST to the Tesseract
 * container at process.env.TESSERACT_URL/extract.
 *
 * The isolation boundary is intentional: all OCR logic lives here.
 * Replacing the stub with a real Tesseract call only requires editing this file.
 */

/**
 * OCR extraction result per category.
 * Hardcoded values matching the spec for the OCR stub.
 */
const OCR_STUB_VALUES: Record<string, { value: number; unit: string }> = {
  STROM: { value: 45000, unit: 'kWh' },
  ERDGAS: { value: 8500, unit: 'm³' },
  DIESEL_FUHRPARK: { value: 3200, unit: 'L' },
  HEIZOEL: { value: 2800, unit: 'L' },
  FLUESSIGGAS: { value: 450, unit: 'kg' },
  FERNWAERME: { value: 12000, unit: 'kWh' },
  GESCHAEFTSREISEN_FLUG: { value: 8500, unit: 'km' },
  GESCHAEFTSREISEN_BAHN: { value: 3200, unit: 'km' },
  KUPFER: { value: 480, unit: 'kg' },
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'image/webp'];

export interface OcrResult {
  value: number | null;
  unit: string;
  confidence: number;
  error?: string;
}

/**
 * Simulates OCR extraction from a utility bill or invoice.
 *
 * In production this would POST the file to the Tesseract microservice and
 * parse the returned text. As a stub it returns hardcoded values per category
 * after a simulated 1–2 second processing delay.
 *
 * @param file - The uploaded file (File object in browser, Buffer in Node)
 * @param category - The EmissionCategory key to extract (e.g. "ERDGAS")
 */
export async function extractFromFile(
  file: File | Buffer,
  category: string,
): Promise<OcrResult> {
  // Use Buffer.isBuffer() for proper TypeScript narrowing — instanceof Buffer does not narrow
  // generics (Buffer<ArrayBufferLike>) correctly in stricter TS versions.
  const size = Buffer.isBuffer(file) ? file.length : file.size;
  if (size > MAX_FILE_SIZE_BYTES) {
    return { value: null, unit: '', confidence: 0, error: 'OCR fehlgeschlagen: Datei zu groß (max. 10 MB)' };
  }

  // Validate MIME type
  if (file instanceof File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        value: null,
        unit: '',
        confidence: 0,
        error: 'OCR fehlgeschlagen: Ungültiges Dateiformat (nur PDF und Bilder erlaubt)',
      };
    }
  }

  // Simulate 1–2 second processing delay
  await new Promise<void>((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

  const stub = OCR_STUB_VALUES[category];
  if (!stub) {
    // Return a generic result for categories without specific stub values
    return { value: 1000, unit: 'Einheit', confidence: 0.65 };
  }

  return { value: stub.value, unit: stub.unit, confidence: 0.89 };
}
