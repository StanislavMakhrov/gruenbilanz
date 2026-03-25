'use client';

/**
 * MultiInvoiceUpload — allows uploading multiple invoices per emission category.
 *
 * Each entry includes an optional billing month (1–12) and a flag for
 * "Jahresabrechnung" (final annual invoice). Documents are stored server-side
 * as FieldDocument records; on upload success the extracted quantity is passed
 * back via the onEntryAdded callback so the parent form can update.
 *
 * The Prisma schema already supports billingMonth, isFinalAnnual, and
 * providerName on FieldDocument — this component provides the UI layer
 * that was missing (Bug 5 fix).
 */
import { useState, useRef } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import type { Scope } from '@prisma/client';

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export interface InvoiceEntry {
  id: string; // local UI id (not DB id)
  filename: string;
  billingMonth: number | null; // 1–12 or null for annual
  isFinalAnnual: boolean;
  quantity: number | null;
  unit: string;
  uploading: boolean;
  error: string | null;
}

interface MultiInvoiceUploadProps {
  /** Emission category for each invoice upload */
  category: string;
  /** Reporting year DB id — passed to /api/ocr */
  reportingYearId: number | null;
  /** GHG scope — passed to /api/ocr */
  scope: Scope;
  /** Label shown above the invoice list */
  label?: string;
  /** Called with the total quantity sum whenever entries change */
  onTotalChange?: (total: number) => void;
}

interface OcrApiResponse {
  quantity: number | null;
  unit: string;
  confidence: number;
  error?: string;
}

export default function MultiInvoiceUpload({
  category,
  reportingYearId,
  scope,
  label,
  onTotalChange,
}: MultiInvoiceUploadProps) {
  const [entries, setEntries] = useState<InvoiceEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Recalculate total and notify parent whenever entries change */
  const notifyTotal = (updatedEntries: InvoiceEntry[]) => {
    if (!onTotalChange) return;
    const total = updatedEntries.reduce((sum, e) => sum + (e.quantity ?? 0), 0);
    onTotalChange(total);
  };

  const updateEntry = (id: string, patch: Partial<InvoiceEntry>) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      notifyTotal(next);
      return next;
    });
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      notifyTotal(next);
      return next;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !reportingYearId) return;

    const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newEntry: InvoiceEntry = {
      id: localId,
      filename: file.name,
      billingMonth: null,
      isFinalAnnual: false,
      quantity: null,
      unit: '',
      uploading: true,
      error: null,
    };

    setEntries((prev) => [...prev, newEntry]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('reportingYearId', String(reportingYearId));
      formData.append('scope', scope);

      const res = await fetch('/api/ocr', { method: 'POST', body: formData });
      const data = (await res.json()) as OcrApiResponse;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? 'OCR fehlgeschlagen');
      }

      updateEntry(localId, {
        uploading: false,
        quantity: data.quantity,
        unit: data.unit,
      });
    } catch (err) {
      updateEntry(localId, {
        uploading: false,
        error: err instanceof Error ? err.message : 'Upload fehlgeschlagen',
      });
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
      )}

      {/* Invoice list */}
      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-muted/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  <span className="text-xs truncate text-foreground">{entry.filename}</span>
                  {entry.uploading && (
                    <span
                      className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="text-destructive hover:text-destructive/80 shrink-0"
                  aria-label={`Beleg ${entry.filename} entfernen`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {entry.error && (
                <p className="text-xs text-destructive">{entry.error}</p>
              )}

              {entry.quantity !== null && (
                <p className="text-xs text-green-700">
                  Erkannter Wert: <strong>{entry.quantity} {entry.unit}</strong>
                </p>
              )}

              {/* Month selector and annual flag */}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-0.5">
                    Monat (optional)
                  </label>
                  <select
                    className="rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    value={entry.billingMonth ?? ''}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        billingMonth: e.target.value ? parseInt(e.target.value) : null,
                        isFinalAnnual: false,
                      })
                    }
                  >
                    <option value="">— kein Monat —</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entry.isFinalAnnual}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        isFinalAnnual: e.target.checked,
                        billingMonth: e.target.checked ? null : entry.billingMonth,
                      })
                    }
                    className="rounded border-input h-4 w-4"
                  />
                  <span className="text-xs text-muted-foreground">Jahresabrechnung</span>
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add invoice button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Weiteren Beleg hochladen"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={!reportingYearId}
        className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 disabled:opacity-50 min-h-[36px] transition-colors"
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
        Beleg hinzufügen
      </button>
    </div>
  );
}
