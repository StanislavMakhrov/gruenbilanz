'use client';

/**
 * YearOverYearChart — grouped bar chart comparing two consecutive reporting years.
 * Shows total CO₂e per scope side-by-side to highlight improvement or regression.
 * When only one year of data exists, renders a single-year view with a note.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '@/lib/utils';
import { SCOPE_COLORS } from '@/lib/scopeColors';

export interface YearScopeData {
  year: number;
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
}

interface YearOverYearChartProps {
  /** Up to 2 years of scope-level totals, sorted ascending by year */
  yearData: YearScopeData[];
}

/** Bar chart payload type used by the recharts tooltip */
interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name}: {formatNumber(p.value / 1000, 2)} t
        </p>
      ))}
    </div>
  );
}

/**
 * Transforms the YearScopeData array into the recharts-friendly format
 * where each scope is a named series and year is the X-axis key.
 */
function buildChartData(yearData: YearScopeData[]) {
  return yearData.map((yd) => ({
    year: String(yd.year),
    'Scope 1': yd.scope1Kg,
    'Scope 2': yd.scope2Kg,
    'Scope 3': yd.scope3Kg,
  }));
}

export default function YearOverYearChart({ yearData }: YearOverYearChartProps) {
  if (yearData.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex items-center justify-center h-56">
        <p className="text-muted-foreground text-sm">Noch keine Jahresvergleichsdaten verfügbar</p>
      </div>
    );
  }

  const chartData = buildChartData(yearData);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <h3 className="text-sm font-semibold text-foreground mb-2">
        Jahresvergleich{yearData.length === 1 ? ` ${yearData[0].year}` : ''}
      </h3>
      {yearData.length === 1 && (
        <p className="text-xs text-muted-foreground mb-3">
          Nur ein Berichtsjahr vorhanden — legen Sie ein zweites Jahr an, um den Vergleich zu sehen.
        </p>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v: number) => formatNumber(v / 1000, 0)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            unit=" t"
          />
          {/* Recharts types for custom tooltip content are now accurate — no suppression needed */}
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {/* Bar colours sourced from shared SCOPE_COLORS for visual consistency across all charts */}
          <Bar dataKey="Scope 1" fill={SCOPE_COLORS.SCOPE1} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Scope 2" fill={SCOPE_COLORS.SCOPE2} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Scope 3" fill={SCOPE_COLORS.SCOPE3} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
