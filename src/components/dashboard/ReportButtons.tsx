'use client';

/**
 * ReportButtons — triggers PDF report generation via POST /api/reports.
 * Three buttons: GHG Protocol report, CSRD questionnaire, and sustainability badge.
 * Shows a loading spinner during generation and handles errors gracefully.
 * The CSRD questionnaire and badge are labelled as "Demo" since the API
 * currently generates a GHG PDF for all types.
 */
import { useState } from 'react';
import { toast } from 'sonner';

interface ReportButtonsProps {
  reportingYearId: number;
}

type ReportType = 'GHG_PROTOCOL' | 'CSRD_QUESTIONNAIRE' | 'BADGE';

const REPORT_CONFIGS: { type: ReportType; label: string; description: string }[] = [
  {
    type: 'GHG_PROTOCOL',
    label: 'GHG-Bericht erstellen',
    description: 'GHG Protocol konformer PDF-Bericht',
  },
  {
    type: 'CSRD_QUESTIONNAIRE',
    label: 'CSRD-Fragebogen',
    description: 'CSRD-Berichtsfragebogen (Demo)',
  },
  {
    type: 'BADGE',
    label: 'Nachhaltigkeits-Badge',
    description: 'Digitales Badge für Ihre Website (Demo)',
  },
];

async function downloadReport(reportingYearId: number, type: ReportType): Promise<void> {
  // BADGE is a demo — same endpoint, different label
  const apiType = type === 'BADGE' ? 'GHG_PROTOCOL' : type;

  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportingYearId, type: apiType }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'Unbekannter Fehler');
  }

  // Trigger browser download
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const contentDisposition = response.headers.get('Content-Disposition') ?? '';
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
  a.download = filenameMatch?.[1] ?? `GruenBilanz_${type}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportButtons({ reportingYearId }: ReportButtonsProps) {
  const [loading, setLoading] = useState<ReportType | null>(null);

  const handleGenerate = async (type: ReportType) => {
    setLoading(type);
    try {
      await downloadReport(reportingYearId, type);
      toast.success('Bericht wurde erfolgreich erstellt.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bericht konnte nicht erstellt werden.';
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Berichte & Nachweise</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        {REPORT_CONFIGS.map(({ type, label, description }) => (
          <button
            key={type}
            type="button"
            onClick={() => handleGenerate(type)}
            disabled={loading !== null}
            className="flex-1 flex flex-col items-center justify-center gap-1 px-4 py-4 rounded-lg border border-border hover:border-primary hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px] text-center"
          >
            {loading === type ? (
              <span className="text-sm text-muted-foreground animate-pulse">Erstelle Bericht…</span>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
