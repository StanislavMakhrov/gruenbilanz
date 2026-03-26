'use client';

/**
 * ScopeDonut — Pie chart visualising CO₂e split across Scope 1, 2, and 3.
 * Uses recharts PieChart. Green colour shades reinforce the GrünBilanz brand.
 * Percentages are computed from the passed totals so the server page controls
 * all calculation logic (per architecture constraints).
 */
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '@/lib/utils';
import { SCOPE_COLORS } from '@/lib/scopeColors';
import type { Scope } from '@/types';

export interface ScopeDataPoint {
  scope: Scope;
  label: string;
  co2eKg: number;
  percentage: number;
}

interface ScopeDonutProps {
  data: ScopeDataPoint[];
}

/** Custom tooltip showing tonnes and percentage */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScopeDataPoint }> }) {
  if (!active || !payload?.length) return null;
  const { label, co2eKg, percentage } = payload[0].payload;
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {formatNumber(co2eKg / 1000, 2)} t CO₂e ({percentage.toFixed(1)} %)
      </p>
    </div>
  );
}

export default function ScopeDonut({ data }: ScopeDonutProps) {
  const hasData = data.some((d) => d.co2eKg > 0);

  if (!hasData) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex items-center justify-center h-56">
        <p className="text-muted-foreground text-sm">Noch keine Daten erfasst</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Verteilung nach Scope</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="co2eKg"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
          >
            {data.map((entry) => (
              <Cell key={entry.scope} fill={SCOPE_COLORS[entry.scope as keyof typeof SCOPE_COLORS] ?? '#6b7280'} />
            ))}
          </Pie>
          {/* Recharts types for custom tooltip content are now accurate — no suppression needed */}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
