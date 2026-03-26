'use client';

/**
 * CategoryStatusList — shows all emission categories grouped by scope.
 * Each category shows a colored indicator (Erfasst / Nicht erfasst) based on
 * whether the current year has at least one non-zero entry for that category.
 * Helps users quickly see what data is still missing.
 * Uses lucide-react icons for visual consistency (Bug 2 fix).
 */
import { CheckCircle2, Circle } from 'lucide-react';
import { CATEGORY_LABELS, SCOPE_LABELS } from '@/types';
import type { EmissionCategory, Scope } from '@/types';

const SCOPE_CATEGORIES: Record<Scope, EmissionCategory[]> = {
  SCOPE1: [
    'ERDGAS', 'HEIZOEL', 'FLUESSIGGAS',
    'DIESEL_FUHRPARK', 'BENZIN_FUHRPARK',
    'PKW_BENZIN_KM', 'PKW_DIESEL_KM', 'TRANSPORTER_KM', 'LKW_KM',
    'R410A_KAELTEMITTEL', 'R32_KAELTEMITTEL', 'R134A_KAELTEMITTEL', 'SONSTIGE_KAELTEMITTEL',
  ],
  SCOPE2: ['STROM', 'FERNWAERME'],
  SCOPE3: [
    'GESCHAEFTSREISEN_FLUG', 'GESCHAEFTSREISEN_BAHN', 'PENDLERVERKEHR',
    'ABFALL_RESTMUELL', 'ABFALL_BAUSCHUTT', 'ABFALL_ALTMETALL', 'ABFALL_SONSTIGES',
  ],
};

interface CategoryStatusListProps {
  /** Set of EmissionCategory values that have at least one entry > 0 */
  erfassteKategorien: Set<EmissionCategory>;
}

export default function CategoryStatusList({ erfassteKategorien }: CategoryStatusListProps) {
  const scopes: Scope[] = ['SCOPE1', 'SCOPE2', 'SCOPE3'];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Erfassungsstatus</h3>
      <div className="space-y-6">
        {scopes.map((scope) => {
          const categories = SCOPE_CATEGORIES[scope];
          const erfasst = categories.filter((c) => erfassteKategorien.has(c)).length;
          return (
            <div key={scope}>
              {/* Scope header with count badge — clear visual separation between sections */}
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-border/40">
                <h4 className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
                  {SCOPE_LABELS[scope]}
                </h4>
                <span className="text-xs font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                  {erfasst}/{categories.length}
                </span>
              </div>
              <ul className="space-y-1.5">
                {categories.map((cat) => {
                  const isErfasst = erfassteKategorien.has(cat);
                  return (
                    <li
                      key={cat}
                      className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1 transition-colors ${
                        isErfasst ? 'bg-emerald-50/70' : ''
                      }`}
                    >
                      {isErfasst ? (
                        <CheckCircle2
                          className="h-4 w-4 text-emerald-600 shrink-0"
                          aria-label="Erfasst"
                        />
                      ) : (
                        <Circle
                          className="h-4 w-4 text-muted-foreground shrink-0"
                          aria-label="Nicht erfasst"
                        />
                      )}
                      <span className={isErfasst ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                        {CATEGORY_LABELS[cat]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
