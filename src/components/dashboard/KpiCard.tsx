'use client';

/**
 * KpiCard — prominent dashboard card showing total CO₂e and CO₂e per employee.
 * Displays large numbers to give immediate visibility into the company's
 * carbon footprint for the selected reporting year.
 * Includes hover transition and icon for modern visual polish (Bug 2 fix).
 */
import { Leaf, Users } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface KpiCardProps {
  /** Total CO₂e for the year in kg */
  totalCO2eKg: number;
  /** Number of employees for per-capita calculation */
  employees: number;
  /** The reporting year displayed */
  year: number;
}

export default function KpiCard({ totalCO2eKg, employees, year }: KpiCardProps) {
  const totalTonnes = totalCO2eKg / 1000;
  const perEmployee = employees > 0 ? totalCO2eKg / employees / 1000 : 0;

  return (
    /* Deep emerald gradient card — the hero metric block of the dashboard */
    <div className="bg-gradient-to-br from-[#064e3b] to-[#047857] rounded-2xl border-0 p-6 shadow-lg shadow-emerald-900/20">
      <h2 className="text-sm font-semibold text-emerald-200 mb-5 flex items-center gap-1.5">
        <Leaf className="h-4 w-4 text-emerald-300" aria-hidden="true" />
        CO₂-Bilanz {year}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Total CO₂e */}
        <div>
          <p className="text-xs text-emerald-300 mb-1 flex items-center gap-1">
            <Leaf className="h-3 w-3" aria-hidden="true" />
            Gesamt CO₂e
          </p>
          <p className="text-5xl font-bold text-white tabular-nums">
            {formatNumber(totalTonnes, totalTonnes < 1 ? 3 : 2)}
          </p>
          <p className="text-sm text-emerald-200 mt-1">t CO₂e</p>
        </div>
        {/* CO₂e per employee */}
        <div>
          <p className="text-xs text-emerald-300 mb-1 flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden="true" />
            CO₂e pro Mitarbeiter
          </p>
          <p className="text-5xl font-bold text-white tabular-nums">
            {formatNumber(perEmployee, perEmployee < 1 ? 3 : 2)}
          </p>
          <p className="text-sm text-emerald-200 mt-1">
            t CO₂e / MA{' '}
            <span className="text-xs text-white/50">({employees} Mitarbeiter)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
