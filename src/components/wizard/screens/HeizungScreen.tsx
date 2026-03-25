'use client';

/**
 * HeizungScreen — Wizard Screen 2: Scope 1 heating data entry.
 * Covers stationary combustion (Erdgas, Heizöl, Flüssiggas) and refrigerant leakage.
 * Each numeric field has a plausibility warning and a multi-invoice upload zone.
 * Bug 8 fix: removed redundant OcrUploadButton and FieldDocumentZone — MultiInvoiceUpload
 * handles both OCR extraction and file evidence in a single interface.
 */
import type { EmissionCategory } from '@prisma/client';
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

const CATEGORIES = [
  'ERDGAS', 'HEIZOEL', 'FLUESSIGGAS',
  'R410A_KAELTEMITTEL', 'R32_KAELTEMITTEL', 'R134A_KAELTEMITTEL', 'SONSTIGE_KAELTEMITTEL',
] as const;

type HeizungCategory = typeof CATEGORIES[number];

const FIELD_CONFIG: { category: HeizungCategory; label: string; unit: string; placeholder: string }[] = [
  { category: 'ERDGAS', label: 'Erdgas', unit: 'm³', placeholder: 'z. B. 8500' },
  { category: 'HEIZOEL', label: 'Heizöl', unit: 'L', placeholder: 'z. B. 2800' },
  { category: 'FLUESSIGGAS', label: 'Flüssiggas', unit: 'kg', placeholder: 'z. B. 450' },
  { category: 'R410A_KAELTEMITTEL', label: 'Kältemittel R410A', unit: 'kg', placeholder: 'z. B. 2' },
  { category: 'R32_KAELTEMITTEL', label: 'Kältemittel R32', unit: 'kg', placeholder: 'z. B. 1' },
  { category: 'R134A_KAELTEMITTEL', label: 'Kältemittel R134A', unit: 'kg', placeholder: 'z. B. 1' },
  { category: 'SONSTIGE_KAELTEMITTEL', label: 'Kältemittel Sonstige', unit: 'kg', placeholder: 'z. B. 0.5' },
];

const CSV_CATEGORIES = FIELD_CONFIG.map((f) => ({ key: f.category, label: f.label }));

function computeStatus(values: Record<string, { quantity: number }>): StatusLevel {
  const nonZero = CATEGORIES.filter((c) => (values[c]?.quantity ?? 0) > 0).length;
  if (nonZero === CATEGORIES.length) return 'erfasst';
  if (nonZero > 0) return 'teilweise';
  return 'nicht_erfasst';
}

interface HeizungScreenProps {
  reportingYearId: number | null;
  year: number;
}

export default function HeizungScreen({ reportingYearId, year }: HeizungScreenProps) {
  const { values, isLoading, isSaving, setValue, saveAll, saveCategory } = useEntries(
    reportingYearId,
    'SCOPE1',
    CATEGORIES as unknown as EmissionCategory[],
  );

  const handleBlurSave = async (category: string) => {
    const ok = await saveCategory(category);
    if (!ok) toast.error('Speichern fehlgeschlagen');
    const s = computeStatus(values);
    saveWizardStatus('heizung', s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveAll();
    if (ok) {
      toast.success('Heizdaten gespeichert.');
      saveWizardStatus('heizung', computeStatus(values));
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
          <h1 className="text-xl font-semibold">Scope 1 – Heizung & Kältemittel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Direktemissionen aus Verbrennungsprozessen und Kältemittellecks
          </p>
        </div>
        <StatusBadge status={computeStatus(values)} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Daten werden geladen…</p>}

      <CsvImportButton categories={CSV_CATEGORIES} onImport={handleCsvImport} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {FIELD_CONFIG.map(({ category, label, unit, placeholder }) => (
          <div key={category}>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium" htmlFor={category}>
                    {label}
                  </label>
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
                    onChange={(e) =>
                      setValue(category, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    onBlur={() => handleBlurSave(category)}
                  />
                  <span className="text-sm text-muted-foreground w-10 shrink-0">{unit}</span>
                </div>
              </div>
            </div>
            <PlausibilityWarning
              category={category}
              value={values[category]?.quantity || null}
            />

            {/* Single upload interface: replaces OcrUploadButton + FieldDocumentZone (Bug 8 fix) */}
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

        <div className="pt-2">
          <SaveButton isSaving={isSaving} />
        </div>
      </form>

      <ScreenChangeLog
        screenName="Heizung"
        categories={[...CATEGORIES]}
        reportingYearId={reportingYearId}
      />
    </div>
  );
}
