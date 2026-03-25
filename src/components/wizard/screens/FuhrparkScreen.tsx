'use client';

/**
 * FuhrparkScreen — Wizard Screen 3: Scope 1 company vehicles.
 * Covers fuel consumption (Diesel, Benzin) plus a dynamic km table for
 * vehicle-type-specific mileage tracking.
 * The km table lets users add rows for each vehicle or vehicle type.
 * Bug 5 fix: MultiInvoiceUpload added to fuel consumption fields for multiple invoices.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import SaveButton from '@/components/wizard/SaveButton';
import StatusBadge from '@/components/wizard/StatusBadge';
import PlausibilityWarning from '@/components/wizard/PlausibilityWarning';
import FieldDocumentZone from '@/components/wizard/FieldDocumentZone';
import OcrUploadButton from '@/components/wizard/OcrUploadButton';
import CsvImportButton from '@/components/wizard/CsvImportButton';
import MultiInvoiceUpload from '@/components/wizard/MultiInvoiceUpload';
import ScreenChangeLog from '@/components/wizard/ScreenChangeLog';
import { useEntries } from '@/components/wizard/useEntries';
import { saveWizardStatus } from '@/app/wizard/WizardLayoutInner';
import type { StatusLevel } from '@/components/wizard/StatusBadge';
import type { EmissionCategory } from '@prisma/client';

const FUEL_CATEGORIES = ['DIESEL_FUHRPARK', 'BENZIN_FUHRPARK'] as const;
const KM_CATEGORIES = ['PKW_DIESEL_KM', 'PKW_BENZIN_KM', 'TRANSPORTER_KM', 'LKW_KM'] as const;
const ALL_CATEGORIES = [...FUEL_CATEGORIES, ...KM_CATEGORIES] as const;

type FuhrparkCategory = typeof ALL_CATEGORIES[number];

const FUEL_FIELDS = [
  { category: 'DIESEL_FUHRPARK' as const, label: 'Diesel', unit: 'L', placeholder: 'z. B. 3200' },
  { category: 'BENZIN_FUHRPARK' as const, label: 'Benzin', unit: 'L', placeholder: 'z. B. 800' },
];

const KM_TYPE_OPTIONS: { value: FuhrparkCategory; label: string }[] = [
  { value: 'PKW_DIESEL_KM', label: 'PKW Diesel' },
  { value: 'PKW_BENZIN_KM', label: 'PKW Benzin' },
  { value: 'TRANSPORTER_KM', label: 'Transporter' },
  { value: 'LKW_KM', label: 'LKW' },
];

interface KmRow {
  id: string;
  vehicleType: FuhrparkCategory;
  km: number;
}

const CSV_CATEGORIES = [
  ...FUEL_FIELDS.map((f) => ({ key: f.category, label: f.label })),
  ...KM_TYPE_OPTIONS.map((o) => ({ key: o.value, label: `${o.label} km` })),
];

function computeStatus(values: Record<string, { quantity: number }>, kmRows: KmRow[]): StatusLevel {
  const hasFuel = FUEL_CATEGORIES.some((c) => (values[c]?.quantity ?? 0) > 0);
  const hasKm = kmRows.some((r) => r.km > 0);
  if (hasFuel && hasKm) return 'erfasst';
  if (hasFuel || hasKm) return 'teilweise';
  return 'nicht_erfasst';
}

interface FuhrparkScreenProps {
  reportingYearId: number | null;
  year: number;
}

export default function FuhrparkScreen({ reportingYearId, year }: FuhrparkScreenProps) {
  const { values, isLoading, isSaving, setValue, saveAll, saveCategory } = useEntries(
    reportingYearId,
    'SCOPE1',
    ALL_CATEGORIES as unknown as EmissionCategory[],
  );

  const [kmRows, setKmRows] = useState<KmRow[]>([
    { id: crypto.randomUUID(), vehicleType: 'PKW_DIESEL_KM', km: 0 },
  ]);

  const addKmRow = () => {
    setKmRows((r) => [...r, { id: crypto.randomUUID(), vehicleType: 'PKW_DIESEL_KM', km: 0 }]);
  };

  const removeKmRow = (id: string) => {
    setKmRows((r) => r.filter((row) => row.id !== id));
  };

  const updateKmRow = (id: string, field: keyof KmRow, value: string | number) => {
    setKmRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    // Aggregate km by type into the entry values
    const updatedRows = kmRows.map((row) => (row.id === id ? { ...row, [field]: value } : row));
    for (const type of KM_CATEGORIES) {
      const total = updatedRows
        .filter((r) => r.vehicleType === type)
        .reduce((s, r) => s + (r.km || 0), 0);
      setValue(type, { quantity: total });
    }
  };

  const handleBlurSave = async (category: string) => {
    const ok = await saveCategory(category);
    if (!ok) toast.error('Speichern fehlgeschlagen');
    saveWizardStatus('fuhrpark', computeStatus(values, kmRows));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Aggregate km rows before saving
    for (const type of KM_CATEGORIES) {
      const total = kmRows
        .filter((r) => r.vehicleType === type)
        .reduce((s, r) => s + r.km, 0);
      setValue(type, { quantity: total });
    }
    const ok = await saveAll();
    if (ok) {
      toast.success('Fuhrparkdaten gespeichert.');
      saveWizardStatus('fuhrpark', computeStatus(values, kmRows));
    } else {
      toast.error('Speichern fehlgeschlagen');
    }
  };

  const handleCsvImport = (imported: Record<string, number>) => {
    for (const [cat, val] of Object.entries(imported)) {
      setValue(cat, { quantity: val });
    }
  };

  const inputClass =
    'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Scope 1 – Fuhrpark</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kraftstoffverbrauch und Kilometerleistung Ihres Fuhrparks
          </p>
        </div>
        <StatusBadge status={computeStatus(values, kmRows)} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Laden…</p>}

      <CsvImportButton categories={CSV_CATEGORIES} onImport={handleCsvImport} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Fuel consumption inputs */}
        <section>
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
            Kraftstoffverbrauch
          </h2>
          {FUEL_FIELDS.map(({ category, label, unit, placeholder }) => (
            <div key={category} className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" htmlFor={category}>{label}</label>
                <OcrUploadButton category={category} reportingYearId={reportingYearId} scope="SCOPE1" onResult={(v) => setValue(category, { quantity: v })} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={category}
                  type="number"
                  min="0"
                  step="any"
                  className={inputClass}
                  value={values[category]?.quantity || ''}
                  placeholder={placeholder}
                  onChange={(e) => setValue(category, { quantity: parseFloat(e.target.value) || 0 })}
                  onBlur={() => handleBlurSave(category)}
                />
                <span className="text-sm text-muted-foreground w-8 shrink-0">{unit}</span>
              </div>
              <PlausibilityWarning category={category} value={values[category]?.quantity || null} />
              <FieldDocumentZone fieldKey={`${category}_${year}`} year={year} />
              {/* Multi-invoice upload for fuel invoices (Bug 5 fix) */}
              <MultiInvoiceUpload
                category={category}
                reportingYearId={reportingYearId}
                scope="SCOPE1"
                onTotalChange={(total) => {
                  if (total > 0) setValue(category, { quantity: total });
                }}
              />
            </div>
          ))}
        </section>

        {/* Vehicle km table */}
        <section>
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
            Fahrzeug-km
          </h2>
          <div className="space-y-3">
            {kmRows.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <select
                  value={row.vehicleType}
                  onChange={(e) => updateKmRow(row.id, 'vehicleType', e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-2 text-sm min-h-[44px] flex-1"
                >
                  {KM_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px] w-28"
                  value={row.km || ''}
                  placeholder="km"
                  onChange={(e) => updateKmRow(row.id, 'km', parseFloat(e.target.value) || 0)}
                />
                <span className="text-sm text-muted-foreground">km</span>
                {kmRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeKmRow(row.id)}
                    className="text-destructive text-sm px-2 min-h-[44px]"
                    aria-label="Zeile entfernen"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addKmRow}
              className="text-sm text-primary hover:underline min-h-[44px] flex items-center gap-1"
            >
              + Fahrzeug hinzufügen
            </button>
          </div>
        </section>

        <div className="pt-2">
          <SaveButton isSaving={isSaving} />
        </div>
      </form>

      <ScreenChangeLog
        screenName="Fuhrpark"
        categories={[...ALL_CATEGORIES]}
        reportingYearId={reportingYearId}
      />
    </div>
  );
}
