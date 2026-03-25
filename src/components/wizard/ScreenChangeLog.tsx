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
  entityType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  inputMethod: string;
  createdAt: string;
  action: string;
  /** JSON string: {"category":"ERDGAS",...} — set by saveEntry for EmissionEntry logs */
  metadata: string | null;
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

  // Fetch logs lazily when the panel is opened.
  // Logs are cleared on close so a re-open always fetches fresh data (Bug 4b fix).
  useEffect(() => {
    if (!isOpen || !reportingYearId) return;

    setIsLoading(true);
    const params = new URLSearchParams({
      reportingYearId: String(reportingYearId),
      take: '10',
    });

    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((data: ChangeLogEntry[]) => {
        // Filter to categories relevant to this screen.
        // AuditLog entries store the EmissionCategory in metadata.category
        // (set by saveEntry in lib/actions/entries.ts). CompanyProfile entries
        // have no metadata but are shown when categories list is empty (profile screen).
        const catSet = new Set(categories);
        const filtered = data.filter((l) => {
          if (catSet.size === 0) {
            // For screens without specific categories (e.g. Firmenprofil),
            // show CompanyProfile entries
            return l.entityType === 'CompanyProfile';
          }
          // Parse metadata JSON to find the category stored at save time
          if (l.metadata) {
            try {
              const meta = JSON.parse(l.metadata) as { category?: string };
              return meta.category ? catSet.has(meta.category) : false;
            } catch {
              return false;
            }
          }
          return false;
        });
        setLogs(filtered.slice(0, 5));
      })
      .catch(() => setLogs([]))
      .finally(() => setIsLoading(false));
  }, [isOpen, reportingYearId, categories]);

  return (
    <div className="mt-8 rounded-xl border border-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => {
          // Clear cached logs on close so the next open fetches fresh data (Bug 4b fix)
          if (isOpen) setLogs([]);
          setIsOpen((v) => !v);
        }}
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
            <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Lädt…">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-3 flex-1 rounded bg-muted" />
                </div>
              ))}
            </div>
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
