'use client';

/**
 * CsvImportButton — "CSV importieren" button for batch data import.
 * On file select: calls /api/csv, shows a column-mapping UI with the first 5 rows
 * as a preview, then pre-fills form fields via the onResult callback.
 * Shows a success toast after import.
 *
 * The column mapping lets users select which CSV column maps to each category,
 * making the import resilient to varied CSV exports (DATEV, utility providers).
 */
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface CsvImportButtonProps {
  /** Available target categories for column mapping */
  categories: { key: string; label: string }[];
  /** Callback fired with mapped values after user confirms import */
  onImport: (values: Record<string, number>) => void;
}

interface CsvApiResponse {
  headers: string[];
  rows: Record<string, string>[];
}

export default function CsvImportButton({ categories, onImport }: CsvImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<CsvApiResponse | null>(null);
  /** Maps category key → CSV column header */
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setIsLoading(true);
    setPreview(null);
    setError(null);
    setMapping({});

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/csv', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'CSV-Import fehlgeschlagen');
      }
      const data = (await res.json()) as CsvApiResponse;
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV-Import fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!preview) return;

    const values: Record<string, number> = {};
    for (const [catKey, colHeader] of Object.entries(mapping)) {
      if (!colHeader) continue;
      // Sum all rows for the mapped column
      const total = preview.rows.reduce((sum, row) => {
        const rawVal = row[colHeader];
        const num = rawVal ? parseFloat(rawVal.replace(',', '.')) : 0;
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
      if (total > 0) values[catKey] = total;
    }

    onImport(values);
    toast.success('Import erfolgreich (Demo) — Werte wurden übernommen');
    setPreview(null);
    setMapping({});
  };

  const previewRows = preview?.rows.slice(0, 5) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
        aria-label="CSV-Datei für Import auswählen"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-lg px-4 py-2 hover:bg-muted/30 disabled:opacity-50 min-h-[44px] transition-colors"
      >
        {isLoading ? (
          <>
            <span
              className="h-3 w-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin"
              aria-hidden="true"
            />
            Importiert…
          </>
        ) : (
          <>📊 CSV importieren</>
        )}
      </button>

      {error && (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      )}

      {/* Column mapping UI — shown after file is parsed */}
      {preview && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-4">
          <h4 className="text-sm font-medium">Spalten zuordnen</h4>

          {/* Preview table — first 5 rows */}
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr>
                  {preview.headers.map((h) => (
                    <th key={h} className="border border-border px-2 py-1 bg-muted text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {preview.headers.map((h) => (
                      <td key={h} className="border border-border px-2 py-1">
                        {row[h] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Category → column mapping selects */}
          <div className="space-y-2">
            {categories.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
                <select
                  value={mapping[key] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                  className="text-xs border border-border rounded-md px-2 py-1 flex-1 min-h-[36px]"
                >
                  <option value="">— nicht importieren —</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirmImport}
              className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg hover:bg-primary/90 min-h-[44px]"
            >
              Werte übernehmen
            </button>
            <button
              type="button"
              onClick={() => { setPreview(null); setMapping({}); }}
              className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted/30 min-h-[44px]"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
