/**
 * Dashboard — main landing page for GrünBilanz.
 * Server Component: fetches all data in parallel, calculates CO₂e totals,
 * and passes serialised data to client chart components.
 *
 * Year selection is controlled by the `?year=YYYY` search param.
 * Defaults to the most recent reporting year in the database.
 *
 * force-dynamic prevents Next.js from pre-rendering this page at build time,
 * which would fail because no database is available in the Docker build stage.
 */
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { calculateCO2e } from '@/lib/emissions';
import { CATEGORY_LABELS, CATEGORY_SCOPE, SCOPE_LABELS } from '@/types';
import type { EmissionCategory, EmissionEntry, MaterialEntry, Scope } from '@prisma/client';

import KpiCard from '@/components/dashboard/KpiCard';
import ScopeDonut from '@/components/dashboard/ScopeDonut';
import CategoryBarChart from '@/components/dashboard/CategoryBarChart';
import YearOverYearChart from '@/components/dashboard/YearOverYearChart';
import BranchenvergleichCard from '@/components/dashboard/BranchenvergleichCard';
import CategoryStatusList from '@/components/dashboard/CategoryStatusList';
import YearSelector from '@/components/dashboard/YearSelector';
import AuditLogPanel from '@/components/dashboard/AuditLogPanel';
import ReportButtons from '@/components/dashboard/ReportButtons';
import type { ScopeDataPoint } from '@/components/dashboard/ScopeDonut';
import type { CategoryDataPoint } from '@/components/dashboard/CategoryBarChart';
import type { YearScopeData } from '@/components/dashboard/YearOverYearChart';
import type { SerializedAuditLog } from '@/components/dashboard/AuditLogPanel';
import Link from 'next/link';

interface DashboardPageProps {
  // Next.js 15: searchParams is now a Promise — must be awaited before use
  searchParams: Promise<{ year?: string }>;
}

/** CO₂e per category, accumulated across all entries for a given year */
async function computeCategoryTotals(
  entries: EmissionEntry[],
  materialEntries: MaterialEntry[],
  year: number,
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    try {
      const co2e = await calculateCO2e(entry.category, entry.quantity, year, {
        isOekostrom: entry.isOekostrom,
      });
      totals.set(entry.category, (totals.get(entry.category) ?? 0) + co2e);
    } catch {
      // Factor not seeded for this category — treat as 0
    }
  }

  for (const m of materialEntries) {
    try {
      const co2e = await calculateCO2e(m.material, m.quantityKg, year);
      const key = `MATERIAL_${m.material}`;
      totals.set(key, (totals.get(key) ?? 0) + co2e);
    } catch {
      // Factor not found — treat as 0
    }
  }

  return totals;
}

/** Maps category key → scope, with a fallback for material keys */
function resolveScope(key: string): Scope {
  if (key.startsWith('MATERIAL_')) return 'SCOPE3';
  return CATEGORY_SCOPE[key as EmissionCategory] ?? 'SCOPE3';
}

const BRANCHE_LABELS: Record<string, string> = {
  ELEKTROHANDWERK: 'Elektrohandwerk',
  SHK: 'Sanitär / Heizung / Klima',
  BAUGEWERBE: 'Baugewerbe',
  TISCHLER: 'Tischler',
  KFZ_WERKSTATT: 'Kfz-Werkstatt',
  MALER: 'Maler',
  SONSTIGES: 'Sonstiges',
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // Next.js 15 requires awaiting searchParams before accessing its properties
  const { year: yearParam } = await searchParams;
  /* ── Fetch all data in parallel ─────────────────────────────────────── */
  let company = null;
  let reportingYears: { id: number; year: number }[] = [];
  let auditLogs: SerializedAuditLog[] = [];
  let benchmark: { co2ePerEmployeePerYear: number } | null = null;
  let currentYearRecord: { id: number; year: number } | null = null;
  let entries: EmissionEntry[] = [];
  let materialEntries: MaterialEntry[] = [];
  let prevYearEntries: EmissionEntry[] = [];
  let prevYearMaterials: MaterialEntry[] = [];

  try {
    [company, reportingYears] = await Promise.all([
      prisma.companyProfile.findUnique({ where: { id: 1 } }),
      prisma.reportingYear.findMany({ orderBy: { year: 'desc' } }),
    ]);

    // Determine active year from URL param or default to most recent
    const requestedYear = yearParam ? parseInt(yearParam) : null;
    currentYearRecord =
      (requestedYear
        ? reportingYears.find((y) => y.year === requestedYear)
        : reportingYears[0]) ?? null;

    if (currentYearRecord) {
      const prevYearRecord =
        reportingYears.find((y) => y.year === currentYearRecord!.year - 1) ?? null;

      const fetchResults = await Promise.all([
        prisma.emissionEntry.findMany({ where: { reportingYearId: currentYearRecord.id } }),
        prisma.materialEntry.findMany({ where: { reportingYearId: currentYearRecord.id } }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { document: { select: { id: true } } },
        }),
        company
          ? prisma.industryBenchmark.findUnique({ where: { branche: company.branche } })
          : Promise.resolve(null),
        prevYearRecord
          ? prisma.emissionEntry.findMany({ where: { reportingYearId: prevYearRecord.id } })
          : Promise.resolve([]),
        prevYearRecord
          ? prisma.materialEntry.findMany({ where: { reportingYearId: prevYearRecord.id } })
          : Promise.resolve([]),
      ]);

      entries = fetchResults[0];
      materialEntries = fetchResults[1];
      const rawLogs = fetchResults[2] as Array<{
        id: number;
        entityType: string;
        action: string;
        fieldName: string | null;
        oldValue: string | null;
        newValue: string | null;
        inputMethod: string;
        createdAt: Date;
        document: { id: number } | null;
        metadata: string | null;
      }>;
      benchmark = fetchResults[3];
      prevYearEntries = fetchResults[4] as EmissionEntry[];
      prevYearMaterials = fetchResults[5] as MaterialEntry[];

      // Serialize Dates → strings for client components
      auditLogs = rawLogs.map((l) => ({
        id: l.id,
        entityType: l.entityType,
        action: l.action,
        fieldName: l.fieldName,
        oldValue: l.oldValue,
        newValue: l.newValue,
        inputMethod: l.inputMethod,
        createdAt: l.createdAt.toISOString(),
        documentId: l.document?.id ?? null,
        metadata: l.metadata,
      }));
    }
  } catch (err) {
    // DB unavailable (e.g. during build/static generation) — render empty state gracefully
    console.error('Dashboard data fetch error:', err);
  }

  const year = currentYearRecord?.year ?? new Date().getFullYear();

  /* ── Calculate CO₂e totals ───────────────────────────────────────────── */
  const categoryTotals = currentYearRecord
    ? await computeCategoryTotals(entries, materialEntries, year)
    : new Map<string, number>();

  // Scope totals
  const scopeKg: Record<Scope, number> = { SCOPE1: 0, SCOPE2: 0, SCOPE3: 0 };
  for (const [key, kg] of categoryTotals) {
    const scope = resolveScope(key);
    scopeKg[scope] = (scopeKg[scope] ?? 0) + kg;
  }

  const totalKg = scopeKg.SCOPE1 + scopeKg.SCOPE2 + scopeKg.SCOPE3;

  // Build ScopeDonut data
  const scopeData: ScopeDataPoint[] = (['SCOPE1', 'SCOPE2', 'SCOPE3'] as Scope[]).map((s) => ({
    scope: s,
    label: SCOPE_LABELS[s],
    co2eKg: scopeKg[s],
    percentage: totalKg > 0 ? (scopeKg[s] / totalKg) * 100 : 0,
  }));

  // Build CategoryBarChart data (emission entries only, materials grouped as SCOPE3)
  const categoryData: CategoryDataPoint[] = [];
  for (const entry of entries) {
    const kg = categoryTotals.get(entry.category) ?? 0;
    if (!categoryData.find((d) => d.category === entry.category)) {
      categoryData.push({
        category: entry.category,
        label: CATEGORY_LABELS[entry.category] ?? entry.category,
        scope: entry.scope,
        co2eKg: kg,
      });
    }
  }

  // Build year-over-year data
  const yearOverYearData: YearScopeData[] = [];

  if (currentYearRecord) {
    yearOverYearData.push({ year, scope1Kg: scopeKg.SCOPE1, scope2Kg: scopeKg.SCOPE2, scope3Kg: scopeKg.SCOPE3 });

    if (prevYearEntries.length > 0 || prevYearMaterials.length > 0) {
      const prevYear = year - 1;
      const prevTotals = await computeCategoryTotals(prevYearEntries, prevYearMaterials, prevYear);
      const prevScope: Record<Scope, number> = { SCOPE1: 0, SCOPE2: 0, SCOPE3: 0 };
      for (const [key, kg] of prevTotals) {
        const scope = resolveScope(key);
        prevScope[scope] = (prevScope[scope] ?? 0) + kg;
      }
      // Insert previous year at the front so chart renders in ascending order
      yearOverYearData.unshift({
        year: prevYear,
        scope1Kg: prevScope.SCOPE1,
        scope2Kg: prevScope.SCOPE2,
        scope3Kg: prevScope.SCOPE3,
      });
    }
  }

  // Build benchmark data
  const employees = company?.mitarbeiter ?? 1;
  const companyKgPerEmployee = employees > 0 ? totalKg / employees : 0;
  const benchmarkKgPerEmployee = benchmark?.co2ePerEmployeePerYear ?? 5000;

  // Categories with at least one entry for status list
  const erfassteKategorien = new Set<EmissionCategory>(
    entries.filter((e) => e.quantity > 0).map((e) => e.category),
  );

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header row: company name + year selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {company?.firmenname ?? 'GrünBilanz Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            CO₂-Bilanz Berichtsjahr {year}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {reportingYears.length > 0 ? (
            <YearSelector
              years={reportingYears.map((y) => ({ id: y.id, year: y.year }))}
              currentYear={year}
            />
          ) : null}
          <Link
            href="/wizard"
            className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            Daten erfassen
          </Link>
        </div>
      </div>

      {/* No data state */}
      {!currentYearRecord && (
        <div className="bg-muted/30 rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Noch kein Berichtsjahr angelegt. Starten Sie mit der Datenerfassung.
          </p>
          <Link
            href="/wizard"
            className="inline-flex items-center bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90"
          >
            Jetzt starten →
          </Link>
        </div>
      )}

      {currentYearRecord && (
        <>
          {/* KPI cards */}
          <KpiCard totalCO2eKg={totalKg} employees={employees} year={year} />

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScopeDonut data={scopeData} />
            <CategoryBarChart data={categoryData} />
          </div>

          {/* Year comparison + benchmark */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <YearOverYearChart yearData={yearOverYearData} />
            <BranchenvergleichCard
              companyKgPerEmployee={companyKgPerEmployee}
              benchmarkKgPerEmployee={benchmarkKgPerEmployee}
              brancheLabel={BRANCHE_LABELS[company?.branche ?? ''] ?? 'Unbekannt'}
            />
          </div>

          {/* Status list */}
          <CategoryStatusList erfassteKategorien={erfassteKategorien} />

          {/* Report buttons */}
          <ReportButtons reportingYearId={currentYearRecord.id} />

          {/* Audit log panel */}
          <AuditLogPanel logs={auditLogs} />
        </>
      )}
    </div>
  );
}
