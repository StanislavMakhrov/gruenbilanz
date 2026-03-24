'use client';

/**
 * YearSelector — dropdown allowing users to switch between reporting years
 * or create a new one. Year changes update the `?year=YYYY` URL param so
 * the dashboard server component re-fetches data for the chosen year.
 * Creating a new year calls the createReportingYear server action directly.
 */
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createReportingYear } from '@/lib/actions';
import { toast } from 'sonner';

interface ReportingYearItem {
  id: number;
  year: number;
}

interface YearSelectorProps {
  years: ReportingYearItem[];
  /** Currently active year number (not id) */
  currentYear: number;
}

const NEW_YEAR_VALUE = '__new__';

export default function YearSelector({ years, currentYear }: YearSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === NEW_YEAR_VALUE) {
      handleCreateNewYear();
      return;
    }

    // Update the year URL param; server component re-renders with new data
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', value);
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  const handleCreateNewYear = async () => {
    // Suggest next calendar year after the most recent year
    const nextYear = years.length > 0 ? Math.max(...years.map((y) => y.year)) + 1 : new Date().getFullYear();
    setIsCreating(true);
    try {
      const result = await createReportingYear(nextYear);
      if (result.success) {
        toast.success(`Berichtsjahr ${nextYear} wurde angelegt.`);
        // Navigate to the new year
        const params = new URLSearchParams(searchParams.toString());
        params.set('year', String(nextYear));
        startTransition(() => {
          router.push(`/?${params.toString()}`);
        });
      } else {
        toast.error(result.error ?? 'Berichtsjahr konnte nicht angelegt werden.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="year-selector" className="text-sm text-muted-foreground">
        Berichtsjahr:
      </label>
      <select
        id="year-selector"
        value={String(currentYear)}
        onChange={handleChange}
        disabled={isPending || isCreating}
        className="text-sm border border-border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
      >
        {years.map((y) => (
          <option key={y.id} value={String(y.year)}>
            {y.year}
          </option>
        ))}
        <option value={NEW_YEAR_VALUE}>+ Neues Jahr anlegen</option>
      </select>
      {(isPending || isCreating) && (
        <span className="text-xs text-muted-foreground animate-pulse">Laden…</span>
      )}
    </div>
  );
}
