'use client';

/**
 * WizardLayout — wraps all wizard screens with a sidebar navigation.
 * The sidebar shows all 7 screens with status badges (from sessionStorage/URL).
 * A progress bar at the top reflects overall completion.
 * On mobile, the sidebar collapses into a hamburger menu.
 *
 * Status is computed client-side from localStorage to avoid server round-trips.
 * The actual status badge data is refreshed when screens save new data.
 * Uses lucide-react icons for visual consistency (Bug 2 fix).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, ArrowLeft } from 'lucide-react';
import StatusBadge from '@/components/wizard/StatusBadge';
import type { StatusLevel } from '@/components/wizard/StatusBadge';

interface WizardScreen {
  slug: string;
  title: string;
  description: string;
}

const WIZARD_SCREENS: WizardScreen[] = [
  { slug: 'firmenprofil', title: 'Firmenprofil', description: 'Name, Branche, Mitarbeiter' },
  { slug: 'heizung', title: 'Scope 1 – Heizung', description: 'Erdgas, Heizöl, Kältemittel' },
  { slug: 'fuhrpark', title: 'Scope 1 – Fuhrpark', description: 'Diesel, Benzin, Fahrzeugkm' },
  { slug: 'strom', title: 'Scope 2 – Strom', description: 'Strom, Fernwärme' },
  { slug: 'dienstreisen', title: 'Scope 3 – Dienstreisen', description: 'Flug, Bahn, Pendler' },
  { slug: 'materialien', title: 'Scope 3 – Materialien', description: 'Kupfer, Stahl, Holz …' },
  { slug: 'abfall', title: 'Scope 3 – Abfall', description: 'Restmüll, Bauschutt, Altmetall' },
];

const STORAGE_KEY = 'gruenbilanz_wizard_status';

function loadStatuses(): Record<string, StatusLevel> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, StatusLevel>;
  } catch {
    return {};
  }
}

export function saveWizardStatus(slug: string, status: StatusLevel): void {
  if (typeof window === 'undefined') return;
  const current = loadStatuses();
  current[slug] = status;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export default function WizardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [statuses, setStatuses] = useState<Record<string, StatusLevel>>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load persisted statuses on mount
  useEffect(() => {
    setStatuses(loadStatuses());
    // Listen for storage updates from screens
    const handler = () => setStatuses(loadStatuses());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const erfasstCount = Object.values(statuses).filter((s) => s === 'erfasst').length;
  const progressPct = Math.round((erfasstCount / WIZARD_SCREENS.length) * 100);

  const activeSlug = pathname.split('/').pop() ?? '';

  const nav = (
    <nav aria-label="Wizard Navigation" className="space-y-1">
      {WIZARD_SCREENS.map((screen, idx) => {
        const isActive = screen.slug === activeSlug;
        const status = statuses[screen.slug] ?? 'nicht_erfasst';
        return (
          <Link
            key={screen.slug}
            href={`/wizard/${screen.slug}`}
            onClick={() => setIsMobileOpen(false)}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-muted/40 text-foreground'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground font-mono w-4 shrink-0">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm truncate">{screen.title}</p>
                <p className="text-xs text-muted-foreground truncate">{screen.description}</p>
              </div>
            </div>
            <StatusBadge status={status} className="shrink-0" />
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-72 shrink-0 border-r border-border bg-white px-4 py-6 space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Datenerfassung
          </h2>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{progressPct} %</span>
          </div>
          {nav}
        </div>

        <div className="pt-4 border-t border-border">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Zum Dashboard
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-white border-b border-border px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-medium">
          {WIZARD_SCREENS.find((s) => s.slug === activeSlug)?.title ?? 'Erfassung'}
        </span>
        <button
          type="button"
          onClick={() => setIsMobileOpen((v) => !v)}
          className="p-2 rounded-md hover:bg-muted min-h-[44px]"
          aria-label="Menü öffnen"
        >
          {isMobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile nav overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 top-28 z-30 bg-white border-t border-border p-4 overflow-y-auto">
          {nav}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 md:pt-0 pt-16">
        {children}
      </div>
    </div>
  );
}
