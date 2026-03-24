'use client';

/**
 * CategoryBarChart — horizontal bar chart grouping emission categories by scope.
 * Allows users to see which specific activities drive their CO₂ footprint.
 * Uses recharts BarChart with a custom layout for readability on mobile.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatNumber } from '@/lib/utils';
import type { Scope } from '@prisma/client';

export interface CategoryDataPoint {
  category: string;
  label: string;
  scope: Scope;
  co2eKg: number;
}

interface CategoryBarChartProps {
  data: CategoryDataPoint[];
}

const SCOPE_COLORS: Record<string, string> = {
  SCOPE1: '#15803d',
  SCOPE2: '#22c55e',
  SCOPE3: '#86efac',
};

/** Tooltip showing category name and exact value in t CO₂e */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CategoryDataPoint; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  const { label, scope, co2eKg } = payload[0].payload;
  const scopeLabel = scope === 'SCOPE1' ? 'Scope 1' : scope === 'SCOPE2' ? 'Scope 2' : 'Scope 3';
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground text-xs">{scopeLabel}</p>
      <p className="text-foreground mt-1">{formatNumber(co2eKg / 1000, 2)} t CO₂e</p>
    </div>
  );
}

export default function CategoryBarChart({ data }: CategoryBarChartProps) {
  // Filter to non-zero values only; sort descending for better readability
  const chartData = data
    .filter((d) => d.co2eKg !== 0)
    .sort((a, b) => Math.abs(b.co2eKg) - Math.abs(a.co2eKg))
    .slice(0, 15); // cap at 15 bars to avoid crowding

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-6 shadow-sm flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Noch keine Daten erfasst</p>
      </div>
    );
  }

  const chartHeight = Math.max(240, chartData.length * 36);

  return (
    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Emissionen nach Kategorie</h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
          <XAxis
            type="number"
            tickFormatter={(v: number) => formatNumber(v / 1000, 1)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            unit=" t"
          />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fontSize: 11, fill: '#374151' }}
          />
          {/* @ts-expect-error recharts tooltip props are typed loosely */}
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="co2eKg" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.category}
                fill={SCOPE_COLORS[entry.scope] ?? '#6b7280'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
