'use client';

/**
 * ReportButtons — triggers PDF report generation and badge downloads.
 * Three buttons: GHG Protocol report, CSRD questionnaire, and sustainability badge.
 * - GHG_PROTOCOL and CSRD_QUESTIONNAIRE: POST /api/reports → PDF download
 * - BADGE: GET /api/badge → SVG badge download (dedicated badge API)
 * Shows a loading spinner during generation and handles errors gracefully.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Award, ClipboardList } from 'lucide-react';

interface ReportButtonsProps {
  reportingYearId: number;
}

type ReportType = 'GHG_PROTOCOL' | 'CSRD_QUESTIONNAIRE' | 'BADGE';

const REPORT_CONFIGS: { type: ReportType; label: string; description: string; Icon: React.ElementType }[] = [
  {
    type: 'GHG_PROTOCOL',
    label: 'GHG-Bericht erstellen',
    description: 'GHG Protocol konformer PDF-Bericht',
    Icon: FileText,
  },
  {
    type: 'CSRD_QUESTIONNAIRE',
    label: 'CSRD-Fragebogen',
    description: 'CSRD-Berichtsfragebogen (Demo)',
    Icon: ClipboardList,
  },
  {
    type: 'BADGE',
    label: 'Nachhaltigkeits-Badge',
    description: 'Digitales Badge für Ihre Website',
    Icon: Award,
  },
];

/** Downloads a PDF report via POST /api/reports for GHG_PROTOCOL or CSRD_QUESTIONNAIRE */
async function downloadReport(reportingYearId: number, type: 'GHG_PROTOCOL' | 'CSRD_QUESTIONNAIRE'): Promise<void> {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportingYearId, type }),
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

/**
 * Downloads the sustainability badge SVG via GET /api/badge.
 * Uses the dedicated badge API which computes live CO₂e data and returns SVG.
 */
async function downloadBadge(reportingYearId: number): Promise<void> {
  // Pass reportingYearId as year hint — the badge API resolves the year from reportingYear.year
  const response = await fetch(`/api/badge?format=svg&reportingYearId=${reportingYearId}`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'Badge konnte nicht erstellt werden');
  }

  const svgText = await response.text();
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'GruenBilanz_Badge.svg';
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
      if (type === 'BADGE') {
        // Badge uses the dedicated GET /api/badge route, not the PDF reports route
        await downloadBadge(reportingYearId);
        toast.success('Badge wurde erfolgreich heruntergeladen.');
      } else {
        await downloadReport(reportingYearId, type);
        toast.success('Bericht wurde erfolgreich erstellt.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bericht konnte nicht erstellt werden.';
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border/50 shadow-md shadow-black/5 p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Berichte &amp; Nachweise</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        {REPORT_CONFIGS.map(({ type, label, description, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => handleGenerate(type)}
            disabled={loading !== null}
            className={`flex-1 flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border transition-all min-h-[44px] text-center disabled:opacity-50 disabled:cursor-not-allowed ${
              type === 'GHG_PROTOCOL'
                ? /* Primary action — subtle green tint to distinguish the main report */
                  'bg-gradient-to-b from-emerald-50 to-white border-emerald-200 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/10'
                : 'bg-gradient-to-b from-white to-gray-50 border-border/70 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5'
            }`}
          >
            {loading === type ? (
              <span className="text-sm text-muted-foreground animate-pulse">Erstelle…</span>
            ) : (
              <>
                {/* Icon in a coloured circle for visual hierarchy */}
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-full ${
                    type === 'GHG_PROTOCOL' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-primary'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
