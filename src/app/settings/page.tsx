/**
 * Settings page — Berichtsjahre verwalten.
 *
 * Server Component: fetches all reporting years with entry counts and passes
 * them to the SettingsClient for interactive year management (add/delete).
 *
 * Entry counts are queried via Prisma; CO₂e totals are omitted here to avoid
 * expensive per-entry factor lookups — they are visible on the dashboard.
 *
 * force-dynamic prevents Next.js from pre-rendering this page at build time,
 * which would fail because no database is available in the Docker build stage.
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import SettingsClient, { type YearSummary } from './SettingsClient';

export default async function SettingsPage() {
  // Fetch all reporting years ordered ascending, with entry + material counts
  const years = await prisma.reportingYear.findMany({
    orderBy: { year: 'asc' },
    include: {
      _count: {
        select: {
          entries: true,
          materialEntries: true,
        },
      },
    },
  });

  // Prisma types not generated in this environment; use explicit inline type
  type YearRow = { id: number; year: number; _count: { entries: number; materialEntries: number } };
  const yearSummaries: YearSummary[] = (years as YearRow[]).map((y) => ({
    id: y.id,
    year: y.year,
    entryCount: y._count.entries + y._count.materialEntries,
  }));

  // Determine the next year to suggest (latest year + 1, or current year if no data)
  const latestYear = years.length > 0 ? Math.max(...(years as YearRow[]).map((y) => y.year)) : new Date().getFullYear();
  const nextYear = latestYear + 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Zurück zum Dashboard"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
          <p className="text-sm text-muted-foreground">Berichtsjahre und Konfiguration verwalten</p>
        </div>
      </div>

      {/* Year management section */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
        <SettingsClient years={yearSummaries} nextYear={nextYear} />
      </div>

      {/* Info card */}
      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Hinweis:</strong> Das Löschen eines Berichtsjahres entfernt alle zugehörigen
          Einträge, Materialien und Berichte unwiderruflich. Der Audit-Log bleibt erhalten.
        </p>
      </div>
    </div>
  );
}
