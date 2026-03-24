'use client';

/**
 * BranchenvergleichCard — compares the company's CO₂e per employee against
 * the industry benchmark (UBA sector average).
 * Percentage above/below benchmark shown with green (better) or red (worse) colouring.
 */
import { formatNumber } from '@/lib/utils';

export interface BenchmarkProps {
  /** Company's CO₂e per employee in kg/year */
  companyKgPerEmployee: number;
  /** Industry benchmark CO₂e per employee in kg/year */
  benchmarkKgPerEmployee: number;
  /** Human-readable branch name in German */
  brancheLabel: string;
}

export default function BranchenvergleichCard({
  companyKgPerEmployee,
  benchmarkKgPerEmployee,
  brancheLabel,
}: BenchmarkProps) {
  const diff =
    benchmarkKgPerEmployee > 0
      ? ((companyKgPerEmployee - benchmarkKgPerEmployee) / benchmarkKgPerEmployee) * 100
      : 0;

  const isBetter = diff <= 0;
  // Clamp progress bar width to 100% to handle extreme outliers
  const barWidth = Math.min(100, (companyKgPerEmployee / Math.max(benchmarkKgPerEmployee, 1)) * 100);

  return (
    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Branchenvergleich</h3>
      <p className="text-xs text-muted-foreground mb-5">Branche: {brancheLabel}</p>

      {/* Company value */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs text-muted-foreground">Ihr Unternehmen</span>
          <span className="text-sm font-semibold tabular-nums">
            {formatNumber(companyKgPerEmployee / 1000, 2)} t / MA
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isBetter ? 'bg-green-500' : 'bg-red-400'}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Benchmark value */}
      <div className="mb-5">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs text-muted-foreground">Branchendurchschnitt</span>
          <span className="text-sm font-semibold tabular-nums">
            {formatNumber(benchmarkKgPerEmployee / 1000, 2)} t / MA
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gray-400" style={{ width: '100%' }} />
        </div>
      </div>

      {/* Result badge */}
      <div
        className={`rounded-lg px-4 py-3 text-sm font-medium text-center ${
          isBetter
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}
      >
        {isBetter ? '✓ ' : '↑ '}
        {Math.abs(diff).toFixed(1)} % {isBetter ? 'unter' : 'über'} dem Branchendurchschnitt
      </div>
    </div>
  );
}
