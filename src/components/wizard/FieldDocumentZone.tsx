'use client';

/**
 * FieldDocumentZone — dashed-border dropzone under each numeric input.
 * When a document has been attached the border turns green to signal evidence.
 * On upload the file is POSTed to /api/field-documents with the fieldKey + year.
 * Calls the OCR stub (lib/ocr/index.ts) in the browser-compatible path,
 * forwarded through /api/ocr for server-side processing.
 */
import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface FieldDocumentZoneProps {
  /** Unique key identifying this field (e.g. "ERDGAS_2024") */
  fieldKey: string;
  year: number;
  /** True when a document is already stored for this field+year */
  hasDocument?: boolean;
  /** Callback fired after a successful upload with the new document id */
  onUploaded?: (documentId: number) => void;
}

export default function FieldDocumentZone({
  fieldKey,
  year,
  hasDocument: initialHasDoc = false,
  onUploaded,
}: FieldDocumentZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasDocument, setHasDocument] = useState(initialHasDoc);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing document from DB on mount (Bug 3 fix).
  // Without this, the green "Beleg vorhanden" indicator disappears on page reload
  // even though the document was successfully persisted on the previous visit.
  useEffect(() => {
    if (initialHasDoc) return; // Already known to have a doc — no fetch needed
    fetch(`/api/field-documents?fieldKey=${encodeURIComponent(fieldKey)}&year=${year}`)
      .then((r) => r.json())
      .then((doc: { id?: number } | null) => {
        if (doc?.id) setHasDocument(true);
      })
      .catch(() => null); // Silently ignore — DB may be unavailable during dev
  }, [fieldKey, year, initialHasDoc]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fieldKey', fieldKey);
      formData.append('year', String(year));

      const res = await fetch('/api/field-documents', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Upload fehlgeschlagen');
      }
      const data = await res.json() as { id: number };
      setHasDocument(true);
      onUploaded?.(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUpload(file);
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = '';
  };

  return (
    <div
      className={cn(
        'mt-1 rounded-md border-2 border-dashed px-3 py-2 flex items-center gap-3 transition-colors',
        hasDocument
          ? 'border-green-400 bg-green-50'
          : 'border-border bg-muted/20 hover:border-primary/50',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
        className="sr-only"
        onChange={handleFileChange}
        aria-label={`Beleg hochladen für ${fieldKey}`}
      />

      {hasDocument ? (
        <span className="text-green-700 text-xs flex items-center gap-1.5">
          <span aria-hidden="true">📎</span> Beleg vorhanden
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">Noch kein Beleg hochgeladen</span>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="ml-auto text-xs text-primary hover:underline disabled:opacity-50 min-h-[44px] px-2"
      >
        {isUploading ? 'Wird hochgeladen…' : hasDocument ? 'Ersetzen' : 'Hochladen'}
      </button>

      {error && <p className="text-xs text-destructive ml-2">{error}</p>}
    </div>
  );
}
