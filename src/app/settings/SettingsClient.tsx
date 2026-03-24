'use client';

/**
 * Settings page client component for year management.
 *
 * Handles the interactive parts of the settings page:
 *   - Confirming year deletion (German confirm dialog)
 *   - Adding the next reporting year
 *   - Showing loading/error feedback via toast
 *
 * Receives pre-fetched year data from the parent Server Component.
 */
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createReportingYear, deleteReportingYear } from '@/lib/actions/years';

export interface YearSummary {
  id: number;
  year: number;
  entryCount: number;
}

interface SettingsClientProps {
  years: YearSummary[];
  nextYear: number;
}

export default function SettingsClient({ years, nextYear }: SettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  // Track which year is currently being deleted for per-row loading state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [localYears, setLocalYears] = useState<YearSummary[]>(years);

  /** Deletes a reporting year after German-language confirmation dialog */
  function handleDelete(summary: YearSummary) {
    const confirmed = window.confirm(
      `Möchten Sie das Jahr ${summary.year} und alle zugehörigen Daten wirklich löschen?`,
    );
    if (!confirmed) return;

    setDeletingId(summary.id);
    startTransition(async () => {
      const result = await deleteReportingYear(summary.id);
      if (result.success) {
        setLocalYears((prev) => prev.filter((y) => y.id !== summary.id));
        toast.success(`Berichtsjahr ${summary.year} wurde gelöscht.`);
      } else {
        toast.error(result.error ?? 'Löschen fehlgeschlagen.');
      }
      setDeletingId(null);
    });
  }

  /** Adds the next reporting year */
  function handleAddNextYear() {
    startTransition(async () => {
      const result = await createReportingYear(nextYear);
      if (result.success && result.id) {
        setLocalYears((prev) => [...prev, { id: result.id!, year: nextYear, entryCount: 0 }]);
        toast.success(`Berichtsjahr ${nextYear} wurde angelegt.`);
      } else {
        toast.error(result.error ?? 'Berichtsjahr konnte nicht angelegt werden.');
      }
    });
  }

  const isNextYearAdded = localYears.some((y) => y.year === nextYear);

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4">Berichtsjahre verwalten</h2>

      {localYears.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-6">
          Noch keine Berichtsjahre vorhanden.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden mb-6">
          {localYears.map((summary) => (
            <li
              key={summary.id}
              className="flex items-center justify-between px-4 py-3 bg-white hover:bg-muted/30 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                {/* Year */}
                <span className="text-base font-semibold text-foreground w-12">
                  {summary.year}
                </span>
                {/* Entry count */}
                <span className="text-sm text-muted-foreground">
                  {summary.entryCount === 0
                    ? 'Keine Einträge'
                    : `${summary.entryCount} ${summary.entryCount === 1 ? 'Eintrag' : 'Einträge'}`}
                </span>
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(summary)}
                disabled={isPending && deletingId === summary.id}
                aria-label={`Jahr ${summary.year} löschen`}
                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending && deletingId === summary.id ? 'Löschen…' : 'Löschen'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add next year button */}
      {!isNextYearAdded && (
        <button
          type="button"
          onClick={handleAddNextYear}
          disabled={isPending}
          className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Wird angelegt…' : `Nächstes Jahr hinzufügen (${nextYear})`}
        </button>
      )}
    </section>
  );
}
