'use client';

/**
 * StromScreen — Wizard Screen 4: Scope 2 electricity and district heating.
 * Ökostrom checkbox remaps the emission factor to STROM_OEKOSTROM (near-zero).
 * Optional monthly breakdown: 12 inputs for Jan–Dez collapsible section.
 * Bug 8 fix: removed redundant OcrUploadButton and FieldDocumentZone — MultiInvoiceUpload
 * handles both OCR extraction and file evidence in a single interface.
 */
import { useState } from 'react';
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
import type { EmissionCategory } from '@/types';

const CATEGORIES = ['STROM', 'FERNWAERME'] as const;
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const CSV_CATEGORIES = [
  { key: 'STROM', label: 'Strom (kWh)' },
  { key: 'FERNWAERME', label: 'Fernwärme (kWh)' },
];

function computeStatus(values: Record<string, { quantity: number }>): StatusLevel {
  const hasStrom = (values['STROM']?.quantity ?? 0) > 0;
  const hasFernwaerme = (values['FERNWAERME']?.quantity ?? 0) > 0;
  if (hasStrom) return 'erfasst'; // Strom is the primary category
  if (hasFernwaerme) return 'teilweise';
  return 'nicht_erfasst';
}

interface StromScreenProps {
  reportingYearId: number | null;
  year: number;
}

export default function StromScreen({ reportingYearId, year }: StromScreenProps) {
  const { values, isLoading, isSaving, setValue, saveAll, saveCategory } = useEntries(
    reportingYearId,
    'SCOPE2',
    CATEGORIES as unknown as EmissionCategory[],
  );

  const [isOekostrom, setIsOekostrom] = useState(false);
  const [anbietername, setAnbietername] = useState('');
  const [showMonthly, setShowMonthly] = useState(false);
  const [monthlyKwh, setMonthlyKwh] = useState<number[]>(Array(12).fill(0));

  // When monthly values change, sum them into the annual STROM entry
  const updateMonthly = (idx: number, val: number) => {
    const next = [...monthlyKwh];
    next[idx] = val;
    setMonthlyKwh(next);
    const total = next.reduce((a, b) => a + b, 0);
    if (total > 0) setValue('STROM', { quantity: total });
  };

  const handleBlurSave = async (category: string) => {
    const ok = await saveCategory(category);
    if (!ok) toast.error('Speichern fehlgeschlagen');
    saveWizardStatus('strom', computeStatus(values));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Apply ökostrom flag and provider name to STROM entry
    setValue('STROM', { isOekostrom, providerName: anbietername || null });
    const ok = await saveAll();
    if (ok) {
      toast.success('Stromdaten gespeichert.');
      saveWizardStatus('strom', computeStatus(values));
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
          <h1 className="text-xl font-semibold">Scope 2 – Strom & Fernwärme</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Indirekte Emissionen aus eingekaufter Energie
          </p>
        </div>
        <StatusBadge status={computeStatus(values)} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Laden…</p>}

      <CsvImportButton categories={CSV_CATEGORIES} onImport={handleCsvImport} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Strom */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium" htmlFor="STROM">Strom</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="STROM"
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={values['STROM']?.quantity || ''}
              placeholder="z. B. 45000"
              onChange={(e) => setValue('STROM', { quantity: parseFloat(e.target.value) || 0 })}
              onBlur={() => handleBlurSave('STROM')}
            />
            <span className="text-sm text-muted-foreground w-14 shrink-0">kWh</span>
          </div>
          <PlausibilityWarning category="STROM" value={values['STROM']?.quantity || null} />

          {/* Single upload interface: replaces OcrUploadButton + FieldDocumentZone (Bug 8 fix) */}
          <MultiInvoiceUpload
            category="STROM"
            reportingYearId={reportingYearId}
            scope="SCOPE2"
            onTotalChange={(total) => {
              if (total > 0) setValue('STROM', { quantity: total });
            }}
          />

          {/* Ökostrom checkbox */}
          <label className="flex items-center gap-2 mt-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={isOekostrom}
              onChange={(e) => {
                setIsOekostrom(e.target.checked);
                setValue('STROM', { isOekostrom: e.target.checked });
              }}
              className="rounded border-input h-4 w-4"
            />
            <span className="text-sm">Ökostrom (zertifiziert) — reduziert den Emissionsfaktor</span>
          </label>

          {/* Provider name */}
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1.5" htmlFor="anbietername">
              Stromanbieter (optional)
            </label>
            <input
              id="anbietername"
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
              value={anbietername}
              placeholder="z. B. Stadtwerke München"
              onChange={(e) => setAnbietername(e.target.value)}
            />
          </div>
        </div>

        {/* Fernwärme */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium" htmlFor="FERNWAERME">Fernwärme</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="FERNWAERME"
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={values['FERNWAERME']?.quantity || ''}
              placeholder="z. B. 12000"
              onChange={(e) => setValue('FERNWAERME', { quantity: parseFloat(e.target.value) || 0 })}
              onBlur={() => handleBlurSave('FERNWAERME')}
            />
            <span className="text-sm text-muted-foreground w-14 shrink-0">kWh</span>
          </div>
          <PlausibilityWarning category="FERNWAERME" value={values['FERNWAERME']?.quantity || null} />

          {/* Single upload interface for Fernwärme (Bug 8 fix) */}
          <MultiInvoiceUpload
            category="FERNWAERME"
            reportingYearId={reportingYearId}
            scope="SCOPE2"
            onTotalChange={(total) => {
              if (total > 0) setValue('FERNWAERME', { quantity: total });
            }}
          />
        </div>

        {/* Optional monthly breakdown */}
        <div>
          <button
            type="button"
            onClick={() => setShowMonthly((v) => !v)}
            className="text-sm text-primary hover:underline min-h-[44px] flex items-center gap-1"
          >
            {showMonthly ? '▲' : '▼'} Monatliche Aufschlüsselung (optional)
          </button>
          {showMonthly && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MONTHS.map((month, idx) => (
                <div key={month}>
                  <label className="block text-xs text-muted-foreground mb-1">{month}</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={monthlyKwh[idx] || ''}
                    placeholder="kWh"
                    onChange={(e) => updateMonthly(idx, parseFloat(e.target.value) || 0)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          <SaveButton isSaving={isSaving} />
        </div>
      </form>

      <ScreenChangeLog
        screenName="Strom"
        categories={[...CATEGORIES]}
        reportingYearId={reportingYearId}
      />
    </div>
  );
}
