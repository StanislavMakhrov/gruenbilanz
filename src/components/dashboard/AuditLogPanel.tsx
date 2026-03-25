'use client';

/**
 * AuditLogPanel — collapsible panel showing the 50 most recent audit log entries.
 * Collapsed by default to keep the dashboard clean.
 * Provides evidence of data provenance and input method (Manual / OCR / CSV).
 * Source documents can be downloaded via /api/documents/[id].
 */
import { useState } from 'react';
import { formatDateTime } from '@/lib/utils';

export interface SerializedAuditLog {
  id: number;
  entityType: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  inputMethod: string;
  createdAt: string; // ISO string — Date is serialized server-side
  documentId: number | null;
  metadata: string | null;
}

interface AuditLogPanelProps {
  logs: SerializedAuditLog[];
}

/** Human-readable German labels for AuditAction values */
const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Erstellt',
  UPDATE: 'Geändert',
  DELETE: 'Gelöscht',
};

const INPUT_LABELS: Record<string, string> = {
  MANUAL: 'Manuell',
  OCR: 'OCR',
  CSV: 'CSV',
};

const ENTITY_LABELS: Record<string, string> = {
  EmissionEntry: 'Eintrag',
  MaterialEntry: 'Material',
  CompanyProfile: 'Firmenprofil',
};

export default function AuditLogPanel({ logs }: AuditLogPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header / toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Aktivitäten</h3>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {logs.length} Einträge
          </span>
        </div>
        <span className="text-muted-foreground text-xs">{isOpen ? '▲ Einklappen' : '▼ Aufklappen'}</span>
      </button>

      {isOpen && (
        <div className="overflow-x-auto">
          {logs.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">Keine Einträge vorhanden.</p>
          ) : (
            <table className="w-full text-xs border-t border-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Datum</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Typ</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Aktion</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Änderung</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Eingabe</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Beleg</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {ENTITY_LABELS[log.entityType] ?? log.entityType}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          log.action === 'DELETE'
                            ? 'bg-red-50 text-red-700'
                            : log.action === 'CREATE'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {log.fieldName && (
                        <span className="text-muted-foreground">
                          {log.oldValue ? (
                            <>
                              <span className="line-through">{log.oldValue}</span>
                              {' → '}
                              <span className="font-medium text-foreground">{log.newValue}</span>
                            </>
                          ) : (
                            <span className="font-medium text-foreground">{log.newValue}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {INPUT_LABELS[log.inputMethod] ?? log.inputMethod}
                    </td>
                    <td className="px-4 py-2">
                      {log.documentId && (
                        <a
                          href={`/api/documents/${log.documentId}`}
                          className="text-primary underline hover:text-primary/80"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Beleg ↗
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
