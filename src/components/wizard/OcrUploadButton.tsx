'use client';

/**
 * OcrUploadButton — "Rechnung hochladen" button.
 * On file select: calls /api/ocr with the file, category, reportingYearId, and scope,
 * shows a 1–2 s spinner (matching the OCR stub delay), pre-fills the target field
 * with the result value, and shows a yellow "OCR-Vorschau (Demo)" banner prompting
 * the user to verify. The banner reinforces that the value was machine-extracted
 * and needs review.
 *
 * Requires reportingYearId and scope so the /api/ocr route can persist the
 * StagingEntry with the correct year and GHG scope reference.
 */
import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import type { Scope } from '@/types';

interface OcrUploadButtonProps {
  /** The EmissionCategory key to extract (e.g. "ERDGAS") */
  category: string;
  /** The active reporting year DB id — required by /api/ocr */
  reportingYearId: number | null;
  /** The GHG scope for this screen — required by /api/ocr */
  scope: Scope;
  /** Callback to pre-fill the parent form field with the OCR result */
  onResult: (value: number) => void;
}

interface OcrApiResponse {
  /** Quantity extracted from the invoice — the API returns "quantity", not "value" */
  quantity: number | null;
  unit: string;
  confidence: number;
  error?: string;
}

export default function OcrUploadButton({ category, reportingYearId, scope, onResult }: OcrUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<{ value: number; unit: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!reportingYearId) {
      setError('Kein Berichtsjahr ausgewählt. Bitte zuerst ein Berichtsjahr anlegen.');
      return;
    }

    setIsLoading(true);
    setPreview(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      // reportingYearId and scope are required by /api/ocr for StagingEntry persistence
      formData.append('reportingYearId', String(reportingYearId));
      formData.append('scope', scope);

      const res = await fetch('/api/ocr', { method: 'POST', body: formData });
      const data = (await res.json()) as OcrApiResponse;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? 'OCR fehlgeschlagen');
      }

      // API returns "quantity" (not "value") — see /api/ocr route.ts
      if (data.quantity !== null && data.quantity !== undefined) {
        setPreview({ value: data.quantity, unit: data.unit });
        onResult(data.quantity);
      } else {
        setError('OCR konnte keinen Wert erkennen. Bitte Wert manuell eingeben.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
        aria-label="Rechnung für OCR hochladen"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 disabled:opacity-50 min-h-[36px] transition-colors"
      >
        {isLoading ? (
          <>
            <span
              className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin"
              aria-hidden="true"
            />
            OCR läuft…
          </>
        ) : (
          <>
            <Upload className="h-3 w-3" aria-hidden="true" />
            Rechnung hochladen
          </>
        )}
      </button>

      {/* OCR preview banner — amber to signal "needs human review" */}
      {preview && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
        >
          <span aria-hidden="true">🔍</span>
          <span>
            <strong>OCR-Vorschau (Demo)</strong> — erkannter Wert:{' '}
            <strong>
              {preview.value} {preview.unit}
            </strong>
            . Bitte Wert prüfen und bei Bedarf anpassen.
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
