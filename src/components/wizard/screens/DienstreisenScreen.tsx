'use client';

/**
 * DienstreisenScreen — Wizard Screen 5: Scope 3 business travel.
 * Covers air travel, rail travel, and commuter mileage (Pendlerverkehr).
 * Pendler-km is the product of employee count × average km/year;
 * a helper hint is shown to explain the calculation.
 * Bug 5 fix: OcrUploadButton and FieldDocumentZone removed — MultiInvoiceUpload is the
 * single upload interface for travel categories.
 */
import { toast } from 'sonner';
import SaveButton from '@/components/wizard/SaveButton';
import StatusBadge from '@/components/wizard/StatusBadge';
import PlausibilityWarning from '@/components/wizard/PlausibilityWarning';
import CsvImportButton from '@/components/wizard/CsvImportButton';
import MultiInvoiceUpload from '@/components/wizard/MultiInvoiceUpload';
import ScreenChangeLog from '@/components/wizard/ScreenChangeLog';
import { useEntries } from '@/components/wizard/useEntries';
import { saveWizardStatus } from '@/app/wizard/WizardLayoutInner';
import type { StatusLevel } from '@/components/wizard/StatusBadge';
import type { EmissionCategory } from '@prisma/client';

const CATEGORIES = ['GESCHAEFTSREISEN_FLUG', 'GESCHAEFTSREISEN_BAHN', 'PENDLERVERKEHR'] as const;

const FIELD_CONFIG = [
  {
    category: 'GESCHAEFTSREISEN_FLUG' as const,
    label: 'Flug-km',
    unit: 'km',
    placeholder: 'z. B. 8500',
    hint: 'Gesamte Flugkilometer aller Mitarbeiter im Berichtsjahr',
  },
  {
    category: 'GESCHAEFTSREISEN_BAHN' as const,
    label: 'Bahn-km',
    unit: 'km',
    placeholder: 'z. B. 3200',
    hint: 'Gesamte Bahnkilometer aller Mitarbeiter im Berichtsjahr',
  },
  {
    category: 'PENDLERVERKEHR' as const,
    label: 'Pendler-km gesamt',
    unit: 'km',
    placeholder: 'z. B. 150000',
    hint: 'Mitarbeiteranzahl × durchschnittliche Pendlerstrecke pro Jahr (Hin- und Rückfahrt)',
  },
];

const CSV_CATEGORIES = FIELD_CONFIG.map((f) => ({ key: f.category, label: f.label }));

function computeStatus(values: Record<string, { quantity: number }>): StatusLevel {
  const nonZero = CATEGORIES.filter((c) => (values[c]?.quantity ?? 0) > 0).length;
  if (nonZero === CATEGORIES.length) return 'erfasst';
  if (nonZero > 0) return 'teilweise';
  return 'nicht_erfasst';
}

interface DienstreisenScreenProps {
  reportingYearId: number | null;
  year: number;
}

export default function DienstreisenScreen({ reportingYearId, year }: DienstreisenScreenProps) {
  const { values, isLoading, isSaving, setValue, saveAll, saveCategory } = useEntries(
    reportingYearId,
    'SCOPE3',
    CATEGORIES as unknown as EmissionCategory[],
  );

  const handleBlurSave = async (category: string) => {
    const ok = await saveCategory(category);
    if (!ok) toast.error('Speichern fehlgeschlagen');
    saveWizardStatus('dienstreisen', computeStatus(values));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveAll();
    if (ok) {
      toast.success('Dienstreisendaten gespeichert.');
      saveWizardStatus('dienstreisen', computeStatus(values));
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
          <h1 className="text-xl font-semibold">Scope 3 – Dienstreisen & Pendler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Emissionen aus Geschäftsreisen und Mitarbeiterpendeln
          </p>
        </div>
        <StatusBadge status={computeStatus(values)} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Laden…</p>}

      <CsvImportButton categories={CSV_CATEGORIES} onImport={handleCsvImport} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {FIELD_CONFIG.map(({ category, label, unit, placeholder, hint }) => (
          <div key={category}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium" htmlFor={category}>{label}</label>
            </div>
            {hint && <p className="text-xs text-muted-foreground mb-1.5">{hint}</p>}
            <div className="flex items-center gap-2">
              <input
                id={category}
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={values[category]?.quantity || ''}
                placeholder={placeholder}
                onChange={(e) =>
                  setValue(category, { quantity: parseFloat(e.target.value) || 0 })
                }
                onBlur={() => handleBlurSave(category)}
              />
              <span className="text-sm text-muted-foreground w-10 shrink-0">{unit}</span>
            </div>
            <PlausibilityWarning
              category={category}
              value={values[category]?.quantity || null}
            />
            {/* Single upload interface: replaces OcrUploadButton + FieldDocumentZone (Bug 5 fix) */}
            <MultiInvoiceUpload
              category={category}
              reportingYearId={reportingYearId}
              scope="SCOPE3"
              onTotalChange={(total) => {
                if (total > 0) setValue(category, { quantity: total });
              }}
            />
          </div>
        ))}

        <div className="pt-2">
          <SaveButton isSaving={isSaving} />
        </div>
      </form>

      <ScreenChangeLog
        screenName="Dienstreisen"
        categories={[...CATEGORIES]}
        reportingYearId={reportingYearId}
      />
    </div>
  );
}
