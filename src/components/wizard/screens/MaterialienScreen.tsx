'use client';

/**
 * MaterialienScreen — Wizard Screen 6: Scope 3 Category 1 purchased materials.
 * Dynamic table: each row represents one material entry with category, quantity, supplier.
 * Rows are saved individually via saveMaterialEntry; adds/removes go directly to DB.
 * Multiple rows of the same category are allowed (different suppliers or deliveries).
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { saveMaterialEntry, deleteMaterialEntry } from '@/lib/actions';
import { MaterialCategory } from '@/types';
import SaveButton from '@/components/wizard/SaveButton';
import StatusBadge from '@/components/wizard/StatusBadge';
import ScreenChangeLog from '@/components/wizard/ScreenChangeLog';
import CsvImportButton from '@/components/wizard/CsvImportButton';
import PlausibilityWarning from '@/components/wizard/PlausibilityWarning';
import { saveWizardStatus } from '@/app/wizard/WizardLayoutInner';
import type { StatusLevel } from '@/components/wizard/StatusBadge';

const MATERIAL_OPTIONS: { value: MaterialCategory; label: string }[] = [
  { value: 'KUPFER', label: 'Kupfer' },
  { value: 'STAHL', label: 'Stahl' },
  { value: 'ALUMINIUM', label: 'Aluminium' },
  { value: 'HOLZ', label: 'Holz' },
  { value: 'KUNSTSTOFF_PVC', label: 'Kunststoff / PVC' },
  { value: 'BETON', label: 'Beton' },
  { value: 'FARBEN_LACKE', label: 'Farben & Lacke' },
  { value: 'SONSTIGE', label: 'Sonstige Materialien' },
];

const CSV_CATEGORIES = MATERIAL_OPTIONS.map((o) => ({ key: o.value, label: o.label }));

interface MaterialRow {
  localId: string;
  dbId?: number;
  material: MaterialCategory;
  quantityKg: number;
  supplierName: string;
}

function newRow(): MaterialRow {
  return {
    localId: crypto.randomUUID(),
    material: 'KUPFER',
    quantityKg: 0,
    supplierName: '',
  };
}

interface MaterialExisting {
  id: number;
  material: string;
  quantityKg: number;
  supplierName: string | null;
}

function computeStatus(rows: MaterialRow[]): StatusLevel {
  const filled = rows.filter((r) => r.quantityKg > 0);
  if (filled.length === rows.length && rows.length > 0) return 'erfasst';
  if (filled.length > 0) return 'teilweise';
  return 'nicht_erfasst';
}

interface MaterialienScreenProps {
  reportingYearId: number | null;
}

export default function MaterialienScreen({ reportingYearId }: MaterialienScreenProps) {
  const [rows, setRows] = useState<MaterialRow[]>([newRow()]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing material entries
  useEffect(() => {
    if (!reportingYearId) return;
    setIsLoading(true);
    fetch(`/api/materials?reportingYearId=${reportingYearId}`)
      .then((r) => r.json())
      .then((data: MaterialExisting[]) => {
        if (data.length > 0) {
          setRows(
            data.map((d) => ({
              localId: String(d.id),
              dbId: d.id,
              material: d.material as MaterialCategory,
              quantityKg: d.quantityKg,
              supplierName: d.supplierName ?? '',
            })),
          );
        }
      })
      .catch(() => {/* fallback to empty row */})
      .finally(() => setIsLoading(false));
  }, [reportingYearId]);

  const updateRow = (localId: string, field: keyof MaterialRow, value: string | number) => {
    setRows((r) => r.map((row) => (row.localId === localId ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows((r) => [...r, newRow()]);

  const removeRow = async (localId: string) => {
    const row = rows.find((r) => r.localId === localId);
    if (row?.dbId) {
      const result = await deleteMaterialEntry(row.dbId);
      if (!result.success) { toast.error('Löschen fehlgeschlagen'); return; }
    }
    setRows((r) => r.filter((row) => row.localId !== localId));
    saveWizardStatus('materialien', computeStatus(rows.filter((r) => r.localId !== localId)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingYearId) { toast.error('Kein Berichtsjahr ausgewählt'); return; }
    setIsSaving(true);
    try {
      const results = await Promise.all(
        rows
          .filter((r) => r.quantityKg > 0)
          .map((r) =>
            saveMaterialEntry({
              id: r.dbId,
              reportingYearId,
              material: r.material,
              quantityKg: r.quantityKg,
              supplierName: r.supplierName || null,
              inputMethod: 'MANUAL',
            }),
          ),
      );
      if (results.every((r) => r.success)) {
        toast.success('Materialdaten gespeichert.');
        saveWizardStatus('materialien', computeStatus(rows));
      } else {
        toast.error('Einige Einträge konnten nicht gespeichert werden.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCsvImport = (imported: Record<string, number>) => {
    const newRows: MaterialRow[] = Object.entries(imported)
      .filter(([, v]) => v > 0)
      .map(([key, val]) => ({
        localId: crypto.randomUUID(),
        material: key as MaterialCategory,
        quantityKg: val,
        supplierName: '',
      }));
    if (newRows.length > 0) setRows((prev) => [...prev, ...newRows]);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Scope 3 – Materialien</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Emissionen aus eingekauften Materialien und Werkstoffen
          </p>
        </div>
        <StatusBadge status={computeStatus(rows)} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Laden…</p>}

      <CsvImportButton categories={CSV_CATEGORIES} onImport={handleCsvImport} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Table header */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_6rem_1fr_2.5rem] gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
          <span>Kategorie</span>
          <span>Menge</span>
          <span>Lieferant</span>
          <span />
        </div>

        {rows.map((row) => (
          <div key={row.localId} className="grid grid-cols-1 sm:grid-cols-[1fr_6rem_1fr_2.5rem] gap-2 sm:gap-3 items-start">
            <select
              value={row.material}
              onChange={(e) => updateRow(row.localId, 'material', e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
            >
              {MATERIAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
                  value={row.quantityKg || ''}
                  placeholder="kg"
                  onChange={(e) => updateRow(row.localId, 'quantityKg', parseFloat(e.target.value) || 0)}
                />
              </div>
              <PlausibilityWarning category={row.material} value={row.quantityKg || null} />
            </div>
            <input
              type="text"
              className="rounded-md border border-input bg-background px-2 py-2 text-sm min-h-[44px]"
              value={row.supplierName}
              placeholder="Lieferantenname"
              onChange={(e) => updateRow(row.localId, 'supplierName', e.target.value)}
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(row.localId)}
                className="text-destructive text-sm min-h-[44px] flex items-center justify-center"
                aria-label="Zeile entfernen"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="text-sm text-primary hover:underline min-h-[44px] flex items-center gap-1"
        >
          + Material hinzufügen
        </button>

        <div className="pt-2">
          <SaveButton isSaving={isSaving} />
        </div>
      </form>

      <ScreenChangeLog
        screenName="Materialien"
        categories={MATERIAL_OPTIONS.map((o) => o.value)}
        reportingYearId={reportingYearId}
      />
    </div>
  );
}
