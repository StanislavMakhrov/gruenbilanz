'use client';

/**
 * Dynamic wizard screen page — handles all 7 wizard screens via the [screen] param.
 * Renders the appropriate screen component based on the URL segment.
 * All screens are client components; data loading happens via hooks/API calls.
 *
 * Screen routing:
 *   /wizard/firmenprofil  → FirmenprofilScreen
 *   /wizard/heizung       → HeizungScreen
 *   /wizard/fuhrpark      → FuhrparkScreen
 *   /wizard/strom         → StromScreen
 *   /wizard/dienstreisen  → DienstreisenScreen
 *   /wizard/materialien   → MaterialienScreen
 *   /wizard/abfall        → AbfallScreen
 *
 * The reportingYearId is resolved from the URL param ?yearId=N; if missing,
 * the most recent year is loaded from /api/entries?type=years.
 */
import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import FirmenprofilScreen from '@/components/wizard/screens/FirmenprofilScreen';
import HeizungScreen from '@/components/wizard/screens/HeizungScreen';
import FuhrparkScreen from '@/components/wizard/screens/FuhrparkScreen';
import StromScreen from '@/components/wizard/screens/StromScreen';
import DienstreisenScreen from '@/components/wizard/screens/DienstreisenScreen';
import MaterialienScreen from '@/components/wizard/screens/MaterialienScreen';
import AbfallScreen from '@/components/wizard/screens/AbfallScreen';

interface ReportingYearApi {
  id: number;
  year: number;
}

const SCREEN_TITLES: Record<string, string> = {
  firmenprofil: 'Firmenprofil',
  heizung: 'Heizung & Kältemittel',
  fuhrpark: 'Fuhrpark',
  strom: 'Strom & Fernwärme',
  dienstreisen: 'Dienstreisen & Pendler',
  materialien: 'Materialien',
  abfall: 'Abfall',
};

export default function WizardScreenPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const screen = (params.screen as string) ?? '';

  const [reportingYearId, setReportingYearId] = useState<number | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [isLoadingYear, setIsLoadingYear] = useState(true);

  useEffect(() => {
    const yearIdParam = searchParams.get('yearId');

    if (yearIdParam) {
      setReportingYearId(parseInt(yearIdParam));
      setIsLoadingYear(false);
      return;
    }

    // Fetch the most recent reporting year from the dedicated years endpoint
    fetch('/api/years')
      .then((r) => r.json())
      .then((years: ReportingYearApi[]) => {
        if (years.length > 0) {
          const mostRecent = years[0]; // API returns desc order
          setReportingYearId(mostRecent.id);
          setYear(mostRecent.year);
        }
      })
      .catch(() => {/* No years yet — proceed with null */})
      .finally(() => setIsLoadingYear(false));
  }, [searchParams]);

  if (isLoadingYear) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground animate-pulse">Berichtsjahr wird geladen…</p>
      </div>
    );
  }

  if (!SCREEN_TITLES[screen]) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold">Seite nicht gefunden</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Der Wizard-Schritt &ldquo;{screen}&rdquo; existiert nicht.
        </p>
      </div>
    );
  }

  // Render the appropriate screen component
  switch (screen) {
    case 'firmenprofil':
      return <FirmenprofilScreen reportingYearId={reportingYearId} />;

    case 'heizung':
      return <HeizungScreen reportingYearId={reportingYearId} year={year} />;

    case 'fuhrpark':
      return <FuhrparkScreen reportingYearId={reportingYearId} year={year} />;

    case 'strom':
      return <StromScreen reportingYearId={reportingYearId} year={year} />;

    case 'dienstreisen':
      return <DienstreisenScreen reportingYearId={reportingYearId} year={year} />;

    case 'materialien':
      return <MaterialienScreen reportingYearId={reportingYearId} />;

    case 'abfall':
      return <AbfallScreen reportingYearId={reportingYearId} year={year} />;

    default:
      return null;
  }
}
