'use client';

/**
 * FirmenprofilScreen — Wizard Screen 1: company profile data entry.
 * Single-row upsert at id=1 via saveCompanyProfile server action.
 * Auto-saves on blur for most fields; logo upload uses a file input.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { saveCompanyProfile } from '@/lib/actions';
import { Branche } from '@/types';
import SaveButton from '@/components/wizard/SaveButton';
import StatusBadge from '@/components/wizard/StatusBadge';
import ScreenChangeLog from '@/components/wizard/ScreenChangeLog';
import type { StatusLevel } from '@/components/wizard/StatusBadge';
import { saveWizardStatus } from '@/app/wizard/WizardLayoutInner';

const BRANCHE_OPTIONS: { value: Branche; label: string }[] = [
  { value: 'ELEKTROHANDWERK', label: 'Elektrohandwerk' },
  { value: 'SHK', label: 'Sanitär / Heizung / Klima' },
  { value: 'BAUGEWERBE', label: 'Baugewerbe' },
  { value: 'TISCHLER', label: 'Tischler' },
  { value: 'KFZ_WERKSTATT', label: 'Kfz-Werkstatt' },
  { value: 'MALER', label: 'Maler' },
  { value: 'SONSTIGES', label: 'Sonstiges' },
];

interface ProfileState {
  firmenname: string;
  branche: Branche;
  mitarbeiter: string;
  standort: string;
  reportingBoundaryNotes: string;
  exclusions: string;
  /** Currently saved logo as data-URL or file path; null when no logo exists */
  logoPath: string | null;
}

interface FirmenprofilScreenProps {
  reportingYearId: number | null;
}

export default function FirmenprofilScreen({ reportingYearId }: FirmenprofilScreenProps) {
  const [form, setForm] = useState<ProfileState>({
    firmenname: '',
    branche: 'ELEKTROHANDWERK',
    mitarbeiter: '',
    standort: '',
    reportingBoundaryNotes: '',
    exclusions: '',
    logoPath: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [status, setStatus] = useState<StatusLevel>('nicht_erfasst');

  // Load existing profile on mount from GET /api/profile
  useEffect(() => {
    setIsLoadingProfile(true);
    fetch('/api/profile')
      .then(async (r) => {
        // Check HTTP status before parsing JSON — an error response (e.g. 500)
        // would otherwise populate form fields with { error: '...' } strings (Bug 6 fix).
        if (!r.ok) throw new Error(`Profil konnte nicht geladen werden (${r.status})`);
        return r.json() as Promise<{
          firmenname?: string;
          branche?: Branche;
          mitarbeiter?: number;
          standort?: string;
          reportingBoundaryNotes?: string | null;
          exclusions?: string | null;
          logoPath?: string | null;
        } | null>;
      })
      .then((data) => {
        if (!data) return; // No profile yet — keep empty form defaults
        setForm({
          firmenname: data.firmenname ?? '',
          branche: (data.branche as Branche) ?? 'ELEKTROHANDWERK',
          mitarbeiter: data.mitarbeiter ? String(data.mitarbeiter) : '',
          standort: data.standort ?? '',
          reportingBoundaryNotes: data.reportingBoundaryNotes ?? '',
          exclusions: data.exclusions ?? '',
          logoPath: data.logoPath ?? null,
        });
      })
      .catch((err) => {
        // Log the error so it's visible in DevTools without breaking the form
        console.error('Firmenprofil load error:', err);
      })
      .finally(() => setIsLoadingProfile(false));
  }, []);

  const computeStatus = (f: ProfileState): StatusLevel => {
    if (f.firmenname && f.mitarbeiter && parseInt(f.mitarbeiter) > 0) return 'erfasst';
    if (f.firmenname || f.mitarbeiter) return 'teilweise';
    return 'nicht_erfasst';
  };

  const handleBlurSave = async (field: keyof ProfileState) => {
    if (!form[field]) return;
    const result = await saveCompanyProfile({
      [field]: field === 'mitarbeiter' ? parseInt(form[field]) || undefined : form[field] || undefined,
    });
    if (!result.success) {
      toast.error(result.error ?? 'Speichern fehlgeschlagen');
    }
  };

  const handleChange = (field: keyof ProfileState, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    const nextStatus = computeStatus(next);
    setStatus(nextStatus);
    saveWizardStatus('firmenprofil', nextStatus);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation to avoid a round-trip for obvious errors
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Logo muss im JPEG- oder PNG-Format vorliegen.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Logo darf nicht größer als 10 MB sein.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      const result = await saveCompanyProfile({ logoBase64: base64, logoMimeType: file.type });
      if (result.success) {
        // Update logoPath in form state so the preview renders immediately
        setForm((prev) => ({ ...prev, logoPath: dataUrl }));
        toast.success('Logo gespeichert.');
      } else {
        toast.error(result.error ?? 'Logo konnte nicht gespeichert werden.');
      }
    };
    // Handle FileReader errors (e.g. corrupted file, permission issue) — Bug 7 fix
    reader.onerror = () => {
      toast.error('Logo konnte nicht gelesen werden. Bitte prüfen Sie die Datei.');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await saveCompanyProfile({
      firmenname: form.firmenname || undefined,
      branche: form.branche,
      mitarbeiter: parseInt(form.mitarbeiter) || undefined,
      standort: form.standort || undefined,
      reportingBoundaryNotes: form.reportingBoundaryNotes || undefined,
      exclusions: form.exclusions || undefined,
    });
    setIsSaving(false);
    if (result.success) {
      toast.success('Firmenprofil gespeichert.');
      const nextStatus = computeStatus(form);
      setStatus(nextStatus);
      saveWizardStatus('firmenprofil', nextStatus);
    } else {
      toast.error(result.error ?? 'Speichern fehlgeschlagen');
    }
  };

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Firmenprofil</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Grundlegende Informationen zu Ihrem Unternehmen
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Skeleton loading state while profile is being fetched (Bug 6 fix) */}
      {isLoadingProfile ? (
        <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Profil wird geladen…">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-3 w-32 rounded bg-muted mb-2" />
              <div className="h-10 w-full rounded-md bg-muted" />
            </div>
          ))}
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="firmenname">
            Firmenname <span className="text-destructive">*</span>
          </label>
          <input
            id="firmenname"
            type="text"
            className={inputClass}
            value={form.firmenname}
            placeholder="z. B. Meister Elektro GmbH"
            onChange={(e) => handleChange('firmenname', e.target.value)}
            onBlur={() => handleBlurSave('firmenname')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="branche">
            Branche <span className="text-destructive">*</span>
          </label>
          <select
            id="branche"
            className={inputClass}
            value={form.branche}
            onChange={(e) => handleChange('branche', e.target.value as Branche)}
          >
            {BRANCHE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="mitarbeiter">
            Mitarbeiteranzahl (VZÄ) <span className="text-destructive">*</span>
          </label>
          <input
            id="mitarbeiter"
            type="number"
            min="1"
            className={inputClass}
            value={form.mitarbeiter}
            placeholder="z. B. 12"
            onChange={(e) => handleChange('mitarbeiter', e.target.value)}
            onBlur={() => handleBlurSave('mitarbeiter')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="standort">
            Standort
          </label>
          <input
            id="standort"
            type="text"
            className={inputClass}
            value={form.standort}
            placeholder="z. B. München, Bayern"
            onChange={(e) => handleChange('standort', e.target.value)}
            onBlur={() => handleBlurSave('standort')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="logo">
            Unternehmenslogo (optional)
          </label>
          {/* Logo preview — shown when a logo has been saved */}
          {form.logoPath && (
            <div className="mb-2">
              <img
                src={form.logoPath}
                alt="Gespeichertes Firmenlogo"
                className="h-16 w-auto rounded border border-border object-contain"
              />
            </div>
          )}
          <input
            id="logo"
            type="file"
            accept="image/jpeg,image/png"
            className="text-sm"
            onChange={handleLogoUpload}
          />
          <p className="text-xs text-muted-foreground mt-1">JPEG oder PNG, max. 10 MB</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="berichtsgrenzen">
            Berichtsgrenzen-Notizen
          </label>
          <textarea
            id="berichtsgrenzen"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            value={form.reportingBoundaryNotes}
            placeholder="Welche Standorte, Tochtergesellschaften und Tätigkeiten sind eingeschlossen?"
            onChange={(e) => handleChange('reportingBoundaryNotes', e.target.value)}
            onBlur={() => handleBlurSave('reportingBoundaryNotes')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="ausschluesse">
            Ausschlüsse & Annahmen
          </label>
          <textarea
            id="ausschluesse"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            value={form.exclusions}
            placeholder="Welche Emissionsquellen werden nicht erfasst und warum?"
            onChange={(e) => handleChange('exclusions', e.target.value)}
            onBlur={() => handleBlurSave('exclusions')}
          />
        </div>

        <div className="pt-2">
          <SaveButton isSaving={isSaving} />
        </div>
      </form>
      )}

      <ScreenChangeLog screenName="Firmenprofil" categories={[]} reportingYearId={reportingYearId} />
    </div>
  );
}
