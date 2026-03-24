'use client';

/**
 * ScreenChangeLog — collapsible section at the bottom of each wizard screen.
 * Shows the last 5 AuditLog entries for the categories associated with
 * the current screen, giving users immediate visibility into recent changes.
 */
import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';

interface ChangeLogEntry {
  id: number;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  inputMethod: string;
  createdAt: string;
  action: string;
}

interface ScreenChangeLogProps {
  /** The screen identifier (e.g. "heizung") — used in the section title */
  screenName: string;
  /** Emission categories belonging to this screen */
  categories: string[];
  /** The active reporting year ID */
  reportingYearId: number | null;
}

const INPUT_LABELS: Record<string, string> = {
  MANUAL: 'Manuell',
  OCR: 'OCR',
  CSV: 'CSV',
};

export default function ScreenChangeLog({
  screenName,
  categories,
  reportingYearId,
}: ScreenChangeLogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<ChangeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch logs lazily when the panel is first opened
  useEffect(() => {
    if (!isOpen || !reportingYearId || logs.length > 0) return;

    setIsLoading(true);
    const params = new URLSearchParams({
      reportingYearId: String(reportingYearId),
      take: '10',
    });

    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((data: ChangeLogEntry[]) => {
        // Filter to categories relevant to this screen
        const catSet = new Set(categories);
        const filtered = data.filter((l) => {
          if (!l.fieldName) return false;
          try {
            // metadata contains the category — fall back to fieldName scan
            return catSet.has(l.fieldName) || catSet.size === 0;
          } catch {
            return false;
          }
        });
        setLogs(filtered.slice(0, 5));
      })
      .catch(() => setLogs([]))
      .finally(() => setIsLoading(false));
  }, [isOpen, reportingYearId, categories, logs.length]);

  return (
    <div className="mt-8 rounded-xl border border-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-muted/20 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Änderungsprotokoll – {screenName}
        </span>
        <span className="text-xs text-muted-foreground">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="border-t border-border px-5 py-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Laden…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Änderungen erfasst.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="shrink-0">{formatDateTime(log.createdAt)}</span>
                  <span>·</span>
                  <span>
                    {INPUT_LABELS[log.inputMethod] ?? log.inputMethod}:{' '}
                    {log.oldValue ? (
                      <>
                        <span className="line-through">{log.oldValue}</span> → {log.newValue}
                      </>
                    ) : (
                      log.newValue
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
