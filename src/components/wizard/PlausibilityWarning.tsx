'use client';

/**
 * PlausibilityWarning — amber alert banner shown when a numeric field value
 * falls outside the expected plausibility range for the category.
 * Does NOT block saving — it only informs the user that the value looks unusual.
 * Ranges are defined in src/types/index.ts (PLAUSIBILITY_RANGES).
 */
import { PLAUSIBILITY_RANGES } from '@/types';
import { cn } from '@/lib/utils';

interface PlausibilityWarningProps {
  /** The EmissionCategory or MaterialCategory key (e.g. "ERDGAS") */
  category: string;
  /** The current input value to validate */
  value: number | null | undefined;
  className?: string;
}

export default function PlausibilityWarning({
  category,
  value,
  className,
}: PlausibilityWarningProps) {
  const range = PLAUSIBILITY_RANGES[category];

  // Nothing to show if: no range defined, no value, or value is within range
  if (!range || value === null || value === undefined || value === 0) return null;

  const isTooLow = value < range.min;
  const isTooHigh = value > range.max;

  if (!isTooLow && !isTooHigh) return null;

  const message = isTooLow
    ? `Der Wert ${value} ${range.unit} erscheint sehr niedrig (Erwartungsbereich: ${range.min}–${range.max} ${range.unit}).`
    : `Der Wert ${value} ${range.unit} erscheint sehr hoch (Erwartungsbereich: ${range.min}–${range.max} ${range.unit}).`;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 mt-1',
        className,
      )}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">⚠️</span>
      <span>{message} Bitte prüfen Sie Ihre Eingabe.</span>
    </div>
  );
}
