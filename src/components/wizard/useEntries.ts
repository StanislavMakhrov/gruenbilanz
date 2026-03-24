'use client';

/**
 * Shared hook for loading and saving EmissionEntry values for a wizard screen.
 * Abstracts the fetch/save pattern so each screen component focuses on its form.
 *
 * @param reportingYearId - The active reporting year DB id
 * @param scope - The GHG Scope for these entries
 * @param categories - The EmissionCategory keys for this screen
 */
import { useState, useEffect, useCallback } from 'react';
import { saveEntry } from '@/lib/actions';
import type { Scope, EmissionCategory } from '@prisma/client';

export interface EntryValue {
  quantity: number;
  isOekostrom?: boolean;
  billingMonth?: number | null;
  providerName?: string | null;
}

/** Map of category key → entry value */
export type EntryMap = Record<string, EntryValue>;

interface ExistingEntry {
  category: string;
  quantity: number;
  isOekostrom: boolean;
  billingMonth: number | null;
  providerName: string | null;
}

interface UseEntriesReturn {
  values: EntryMap;
  isLoading: boolean;
  isSaving: boolean;
  setValue: (category: string, value: Partial<EntryValue>) => void;
  saveAll: () => Promise<boolean>;
  saveCategory: (category: string) => Promise<boolean>;
}

export function useEntries(
  reportingYearId: number | null,
  scope: Scope,
  categories: EmissionCategory[],
): UseEntriesReturn {
  const [values, setValues] = useState<EntryMap>(() =>
    Object.fromEntries(categories.map((c) => [c, { quantity: 0 }])),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing entries from the API on mount
  useEffect(() => {
    if (!reportingYearId) return;
    setIsLoading(true);
    const params = new URLSearchParams({
      reportingYearId: String(reportingYearId),
      scope,
    });
    fetch(`/api/entries?${params}`)
      .then((r) => r.json())
      .then((data: ExistingEntry[]) => {
        // Use functional update to avoid stale-closure capture of `values`
        setValues((prev) => {
          const next: EntryMap = { ...prev };
          for (const entry of data) {
            if (categories.includes(entry.category as EmissionCategory)) {
              next[entry.category] = {
                quantity: entry.quantity,
                isOekostrom: entry.isOekostrom,
                billingMonth: entry.billingMonth,
                providerName: entry.providerName,
              };
            }
          }
          return next;
        });
      })
      .catch(() => {/* DB unavailable during dev — keep defaults */})
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportingYearId]);

  const setValue = useCallback((category: string, partial: Partial<EntryValue>) => {
    setValues((prev) => ({
      ...prev,
      [category]: { ...prev[category], ...partial },
    }));
  }, []);

  const saveCategory = useCallback(async (category: string): Promise<boolean> => {
    if (!reportingYearId) return false;
    const entry = values[category];
    if (!entry || entry.quantity === 0) return true; // Nothing to save

    setIsSaving(true);
    try {
      const result = await saveEntry({
        reportingYearId,
        scope,
        category: category as EmissionCategory,
        quantity: entry.quantity,
        isOekostrom: entry.isOekostrom,
        billingMonth: entry.billingMonth ?? null,
        providerName: entry.providerName ?? null,
        inputMethod: 'MANUAL',
      });
      return result.success;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [reportingYearId, scope, values]);

  const saveAll = useCallback(async (): Promise<boolean> => {
    if (!reportingYearId) return false;
    setIsSaving(true);
    try {
      const results = await Promise.all(
        categories
          .filter((c) => (values[c]?.quantity ?? 0) > 0)
          .map((c) =>
            saveEntry({
              reportingYearId,
              scope,
              category: c,
              quantity: values[c].quantity,
              isOekostrom: values[c].isOekostrom,
              billingMonth: values[c].billingMonth ?? null,
              providerName: values[c].providerName ?? null,
              inputMethod: 'MANUAL',
            }),
          ),
      );
      return results.every((r) => r.success);
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [reportingYearId, scope, categories, values]);

  return { values, isLoading, isSaving, setValue, saveAll, saveCategory };
}
