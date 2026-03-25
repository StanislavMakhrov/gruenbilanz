'use client';

/**
 * AbfallScreen — Wizard Screen 7: Scope 3 waste disposal.
 * Covers Restmüll, Bauschutt, Altmetall (negative factor = recycling credit),
 * and a generic "Sonstiger Abfall" bucket.
 * The Altmetall field includes an explanatory note about the negative factor.
 */
import { toast } from 'sonner';
import SaveButton from '@/components/wizard/SaveButton';
import StatusBadge from '@/components/wizard/StatusBadge';
import PlausibilityWarning from '@/components/wizard/PlausibilityWarning';
import FieldDocumentZone from '@/components/wizard/FieldDocumentZone';
import OcrUploadButton from '@/components/wizard/OcrUploadButton';
import CsvImportButton from '@/components/wizard/CsvImportButton';
import ScreenChangeLog from '@/components/wizard/ScreenChangeLog';
import { useEntries } from '@/components/wizard/useEntries';
import { saveWizardStatus } from '@/app/wizard/WizardLayoutInner';
import type { StatusLevel } from '@/components/wizard/StatusBadge';
import type { EmissionCategory } from '@prisma/client';

const CATEGORIES = ['ABFALL_RESTMUELL', 'ABFALL_BAUSCHUTT', 'ABFALL_ALTMETALL', 'ABFALL_SONSTIGES'] as const;

const FIELD_CONFIG = [
  { category: 'ABFALL_RESTMUELL' as const, label: 'Restmüll', unit: 'kg', placeholder: 'z. B. 800', note: null },
  { category: 'ABFALL_BAUSCHUTT' as const, label: 'Bauschutt', unit: 'kg', placeholder: 'z. B. 5000', note: null },
  {
    category: 'ABFALL_ALTMETALL' as const,
    label: 'Altmetall (Recycling)',
    unit: 'kg',
    placeholder: 'z. B. 1200',
    note: 'Altmetall hat einen negativen Emissionsfaktor — Recycling vermeidet Primärproduktion.',
  },
  { category: 'ABFALL_SONSTIGES' as const, label: 'Sonstiger Abfall', unit: 'kg', placeholder: 'z. B. 200', note: null },
];

const CSV_CATEGORIES = FIELD_CONFIG.map((f) => ({ key: f.category, label: f.label }));

function computeStatus(values: Record<string, { quantity: number }>): StatusLevel {
  const nonZero = CATEGORIES.filter((c) => (values[c]?.quantity ?? 0) > 0).length;
  if (nonZero === CATEGORIES.length) return 'erfasst';
  if (nonZero > 0) return 'teilweise';
  return 'nicht_erfasst';
}

interface AbfallScreenProps {
  reportingYearId: number | null;
  year: number;
}

export default function AbfallScreen({ reportingYearId, year }: AbfallScreenProps) {
  const { values, isLoading, isSaving, setValue, saveAll, saveCategory } = useEntries(
    reportingYearId,
    'SCOPE3',
    CATEGORIES as unknown as EmissionCategory[],
  );

  const handleBlurSave = async (category: string) => {
    const ok = await saveCategory(category);
    if (!ok) toast.error('Speichern fehlgeschlagen');
    saveWizardStatus('abfall', computeStatus(values));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveAll();
    if (ok) {
      toast.success('Abfalldaten gespeichert.');
      saveWizardStatus('abfall', computeStatus(values));
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
          <h1 className="text-xl font-semibold">Scope 3 – Abfall</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Emissionen aus der Entsorgung von Betriebs- und Bauabfällen
          </p>
        </div>
        <StatusBadge status={computeStatus(values)} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Laden…</p>}

      <CsvImportButton categories={CSV_CATEGORIES} onImport={handleCsvImport} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {FIELD_CONFIG.map(({ category, label, unit, placeholder, note }) => (
          <div key={category}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium" htmlFor={category}>{label}</label>
              <OcrUploadButton
                category={category}
                reportingYearId={reportingYearId}
                scope="SCOPE3"
                onResult={(v) => setValue(category, { quantity: v })}
              />
            </div>
            {note && (
              <p className="text-xs text-muted-foreground mb-1.5 flex items-start gap-1">
                <span>ℹ️</span> {note}
              </p>
            )}
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
              <span className="text-sm text-muted-foreground w-8 shrink-0">{unit}</span>
            </div>
            <PlausibilityWarning
              category={category}
              value={values[category]?.quantity || null}
            />
            <FieldDocumentZone fieldKey={`${category}_${year}`} year={year} />
          </div>
        ))}

        <div className="pt-2">
          <SaveButton isSaving={isSaving} />
        </div>
      </form>

      <ScreenChangeLog
        screenName="Abfall"
        categories={[...CATEGORIES]}
        reportingYearId={reportingYearId}
      />
    </div>
  );
}
