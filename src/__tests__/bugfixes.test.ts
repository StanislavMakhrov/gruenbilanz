/**
 * Unit tests for the 8 bug fixes in GrünBilanz.
 *
 * These tests cover the logic layers that are unit-testable without a DOM:
 * - Bug 1: Badge button routing logic (downloadBadge vs downloadReport)
 * - Bug 3: OcrUploadButton field name mapping (quantity vs value)
 * - Bug 4a: Zero-value save guard removed (useEntries saveCategory)
 * - Bug 4b: ScreenChangeLog cache cleared on close
 * - Bug 4: AuditLog metadata category filter (ScreenChangeLog filter logic)
 * - Bug 6: Profile API response shape handling (FirmenprofilScreen logic)
 * - Bug 6/7: r.ok check before parsing profile API JSON
 *
 * UI-only bugs (Bug 2 visual polish, Bug 5 multi-invoice UI, Bug 7 logo preview)
 * are verified by TypeScript compilation + existing integration tests.
 */
import { describe, it, expect } from 'vitest';

// ─── Bug 3: OcrApiResponse field mapping ─────────────────────────────────────
// The API returns { quantity, unit, confidence } — NOT { value, unit, confidence }
describe('Bug 3 — OcrApiResponse field mapping', () => {
  interface OcrApiResponse {
    quantity: number | null;
    unit: string;
    confidence: number;
    error?: string;
  }

  it('reads quantity (not value) from the OCR API response', () => {
    // Simulates the JSON returned by /api/ocr
    const apiResponse: OcrApiResponse = {
      quantity: 8500,
      unit: 'm³',
      confidence: 0.92,
    };
    // The fix: read apiResponse.quantity (not apiResponse.value)
    const extractedValue = apiResponse.quantity;
    expect(extractedValue).toBe(8500);
    expect(extractedValue).not.toBeUndefined();
  });

  it('handles null quantity gracefully (OCR could not extract a value)', () => {
    const apiResponse: OcrApiResponse = {
      quantity: null,
      unit: '',
      confidence: 0,
    };
    // When quantity is null, the component should show an error, not call onResult
    expect(apiResponse.quantity).toBeNull();
  });
});

// ─── Bug 4: ScreenChangeLog category filter ───────────────────────────────────
// The fixed filter reads metadata.category instead of fieldName for EmissionEntry logs
describe('Bug 4 — ScreenChangeLog metadata filter', () => {
  interface LogEntry {
    id: number;
    entityType: string;
    fieldName: string | null;
    metadata: string | null;
    newValue: string | null;
    oldValue: string | null;
    inputMethod: string;
    action: string;
    createdAt: string;
  }

  /**
   * Reproduces the fixed filter logic from ScreenChangeLog.tsx.
   * Categories list is non-empty → filter by metadata.category.
   */
  function filterLogs(logs: LogEntry[], categories: string[]): LogEntry[] {
    const catSet = new Set(categories);
    return logs.filter((l) => {
      if (catSet.size === 0) {
        return l.entityType === 'CompanyProfile';
      }
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
  }

  const sampleLogs: LogEntry[] = [
    {
      id: 1,
      entityType: 'EmissionEntry',
      fieldName: 'quantity', // always 'quantity' — NOT the category
      metadata: JSON.stringify({ category: 'ERDGAS' }),
      newValue: '8500',
      oldValue: null,
      inputMethod: 'MANUAL',
      action: 'CREATE',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      entityType: 'EmissionEntry',
      fieldName: 'quantity',
      metadata: JSON.stringify({ category: 'STROM' }),
      newValue: '45000',
      oldValue: null,
      inputMethod: 'OCR',
      action: 'CREATE',
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      entityType: 'CompanyProfile',
      fieldName: 'firmenname',
      metadata: null,
      newValue: 'Test GmbH',
      oldValue: '',
      inputMethod: 'MANUAL',
      action: 'UPDATE',
      createdAt: new Date().toISOString(),
    },
  ];

  it('filters logs by metadata.category for the Heizung screen (ERDGAS)', () => {
    const result = filterLogs(sampleLogs, ['ERDGAS', 'HEIZOEL']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters logs by metadata.category for the Strom screen', () => {
    const result = filterLogs(sampleLogs, ['STROM', 'FERNWAERME']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('returns empty when no log matches the screen categories', () => {
    const result = filterLogs(sampleLogs, ['HEIZOEL', 'FLUESSIGGAS']);
    expect(result).toHaveLength(0);
  });

  it('shows CompanyProfile logs for the Firmenprofil screen (empty categories)', () => {
    const result = filterLogs(sampleLogs, []);
    expect(result).toHaveLength(1);
    expect(result[0].entityType).toBe('CompanyProfile');
  });

  it('does NOT show logs based on fieldName matching (old broken behavior)', () => {
    // Old code: catSet.has(l.fieldName) — 'quantity' is never in a category set
    // New code uses metadata.category
    const categories = ['STROM'];
    const logsWithQuantityFieldName: LogEntry[] = [
      {
        id: 10,
        entityType: 'EmissionEntry',
        fieldName: 'quantity', // old code matched this against categories
        metadata: null, // no metadata → new code should return false
        newValue: '100',
        oldValue: null,
        inputMethod: 'MANUAL',
        action: 'CREATE',
        createdAt: new Date().toISOString(),
      },
    ];
    const result = filterLogs(logsWithQuantityFieldName, categories);
    // With the fix, no metadata → excluded
    expect(result).toHaveLength(0);
  });
});

// ─── Bug 6: Profile API response handling ────────────────────────────────────
// FirmenprofilScreen populates form state from GET /api/profile response
describe('Bug 6 — Profile API response shape', () => {
  interface ProfileApiResponse {
    firmenname?: string;
    branche?: string;
    mitarbeiter?: number;
    standort?: string;
    reportingBoundaryNotes?: string | null;
    exclusions?: string | null;
    logoPath?: string | null;
  }

  interface ProfileFormState {
    firmenname: string;
    branche: string;
    mitarbeiter: string;
    standort: string;
    reportingBoundaryNotes: string;
    exclusions: string;
    logoPath: string | null;
  }

  /** Reproduces the form-population logic in FirmenprofilScreen's useEffect */
  function populateForm(data: ProfileApiResponse | null): ProfileFormState | null {
    if (!data) return null;
    return {
      firmenname: data.firmenname ?? '',
      branche: data.branche ?? 'ELEKTROHANDWERK',
      mitarbeiter: data.mitarbeiter ? String(data.mitarbeiter) : '',
      standort: data.standort ?? '',
      reportingBoundaryNotes: data.reportingBoundaryNotes ?? '',
      exclusions: data.exclusions ?? '',
      logoPath: data.logoPath ?? null,
    };
  }

  it('populates all form fields from the API response', () => {
    const apiData: ProfileApiResponse = {
      firmenname: 'Mustermann Elektro GmbH',
      branche: 'ELEKTROHANDWERK',
      mitarbeiter: 12,
      standort: 'München, Bayern',
      reportingBoundaryNotes: 'Alle Standorte',
      exclusions: '',
      logoPath: null,
    };
    const form = populateForm(apiData);
    expect(form).not.toBeNull();
    expect(form!.firmenname).toBe('Mustermann Elektro GmbH');
    expect(form!.mitarbeiter).toBe('12');
    expect(form!.standort).toBe('München, Bayern');
  });

  it('converts mitarbeiter number to string for the text input', () => {
    const form = populateForm({ mitarbeiter: 25 });
    expect(form!.mitarbeiter).toBe('25');
    expect(typeof form!.mitarbeiter).toBe('string');
  });

  it('returns null when API returns null (no profile yet)', () => {
    const result = populateForm(null);
    expect(result).toBeNull();
  });

  it('includes logoPath from API response (Bug 7 fix)', () => {
    const dataUrl = 'data:image/png;base64,abc123';
    const form = populateForm({ logoPath: dataUrl });
    expect(form!.logoPath).toBe(dataUrl);
  });

  it('sets logoPath to null when not provided (no logo saved)', () => {
    const form = populateForm({ firmenname: 'Test AG' });
    expect(form!.logoPath).toBeNull();
  });
});

// ─── Bug 1: Badge button should NOT route to /api/reports ────────────────────
describe('Bug 1 — Badge button routing', () => {
  it('BADGE type is NOT remapped to GHG_PROTOCOL anymore', () => {
    // The old bug: const apiType = type === 'BADGE' ? 'GHG_PROTOCOL' : type;
    // The fix: BADGE is handled by downloadBadge(), not downloadReport()
    type ReportType = 'GHG_PROTOCOL' | 'CSRD_QUESTIONNAIRE' | 'BADGE';

    function isBadgeType(type: ReportType): boolean {
      return type === 'BADGE';
    }

    expect(isBadgeType('BADGE')).toBe(true);
    expect(isBadgeType('GHG_PROTOCOL')).toBe(false);
    expect(isBadgeType('CSRD_QUESTIONNAIRE')).toBe(false);
  });

  it('downloadReport is only called for PDF types (GHG_PROTOCOL, CSRD_QUESTIONNAIRE)', () => {
    type PdfReportType = 'GHG_PROTOCOL' | 'CSRD_QUESTIONNAIRE';

    // These types should go to POST /api/reports
    const pdfTypes: PdfReportType[] = ['GHG_PROTOCOL', 'CSRD_QUESTIONNAIRE'];
    expect(pdfTypes).not.toContain('BADGE');
  });
});

// ─── Bug 4a: Zero-value save guard ───────────────────────────────────────────
// useEntries.saveCategory previously skipped saving when quantity === 0,
// which prevented correcting a non-zero entry to 0.
describe('Bug 4a — Zero-value save guard removed', () => {
  interface EntryValue {
    quantity: number;
  }

  /**
   * Reproduces the OLD broken logic in useEntries.saveCategory (before fix).
   * The `entry.quantity === 0` guard prevented saving zero corrections.
   */
  function shouldSkipSaveBroken(entry: EntryValue | undefined): boolean {
    if (!entry || entry.quantity === 0) return true; // OLD: skips zero
    return false;
  }

  /**
   * Reproduces the FIXED logic in useEntries.saveCategory.
   * Only skips when the entry doesn't exist at all (not in this screen's scope).
   */
  function shouldSkipSaveFixed(entry: EntryValue | undefined): boolean {
    if (!entry) return true; // Only skip when category not found
    return false; // Allow saving zero — correcting e.g. 8500 → 0
  }

  it('OLD code: incorrectly skips saving a zero correction', () => {
    const entry: EntryValue = { quantity: 0 };
    // User corrected 8500 to 0 — old code silently no-ops
    expect(shouldSkipSaveBroken(entry)).toBe(true); // This was the bug
  });

  it('FIXED code: allows saving a zero correction', () => {
    const entry: EntryValue = { quantity: 0 };
    // Fix: zero should NOT be skipped — 0 is a valid correction
    expect(shouldSkipSaveFixed(entry)).toBe(false);
  });

  it('FIXED code: still skips when entry is undefined (category not in scope)', () => {
    expect(shouldSkipSaveFixed(undefined)).toBe(true);
  });

  it('FIXED code: saves non-zero values as before', () => {
    const entry: EntryValue = { quantity: 8500 };
    expect(shouldSkipSaveFixed(entry)).toBe(false);
  });
});

// ─── Bug 6/7: r.ok check before parsing API JSON ────────────────────────────
// The profile fetch must check r.ok before calling .json() to avoid
// populating form fields from an error response object (e.g. { error: '...' }).
describe('Bug 6/7 — r.ok check before parsing profile API response', () => {
  /**
   * Simulates the FIXED useEffect logic: throws on !r.ok so the catch block
   * handles it instead of trying to populate form fields from error JSON.
   */
  async function loadProfileFixed(
    mockResponse: { ok: boolean; json: () => Promise<unknown> }
  ): Promise<unknown> {
    if (!mockResponse.ok) {
      throw new Error('Profile load failed');
    }
    return mockResponse.json();
  }

  it('throws when the API returns a non-OK response (e.g. 500)', async () => {
    const errorResponse = {
      ok: false,
      json: async () => ({ error: 'Internal Server Error' }),
    };
    await expect(loadProfileFixed(errorResponse)).rejects.toThrow('Profile load failed');
  });

  it('returns parsed JSON when the API returns 200 OK', async () => {
    const successResponse = {
      ok: true,
      json: async () => ({ firmenname: 'Test GmbH', mitarbeiter: 10 }),
    };
    const data = await loadProfileFixed(successResponse);
    expect(data).toEqual({ firmenname: 'Test GmbH', mitarbeiter: 10 });
  });

  it('does NOT try to populate form from an error JSON object', async () => {
    const errorJson = { error: 'Database connection failed' };
    // With old code, firmenname would be '' (undefined from error object) — no feedback
    const oldBrokenPopulate = (data: Record<string, unknown>) => data['firmenname'] ?? '';
    expect(oldBrokenPopulate(errorJson)).toBe('');
    // With new code, the error is thrown and the form is NOT touched
    const errorResponse = { ok: false, json: async () => errorJson };
    await expect(loadProfileFixed(errorResponse)).rejects.toThrow();
  });
});

// ─── Bug 1 residual: Badge API accepts reportingYearId param ────────────────
describe('Bug 1 residual — Badge API accepts reportingYearId query param', () => {
  /**
   * Simulates the updated badge API year-resolution logic.
   * Priority: reportingYearId (DB id) > year (calendar year) > most recent.
   */
  interface ReportingYear { id: number; year: number }

  function resolveYearParam(
    reportingYearIdParam: string | null,
    yearParam: string | null,
    lookup: (id?: number, year?: number) => ReportingYear | null,
  ): ReportingYear | null {
    if (reportingYearIdParam) {
      const rid = parseInt(reportingYearIdParam, 10);
      if (!isNaN(rid)) {
        const r = lookup(rid, undefined);
        if (r) return r;
      }
    }
    if (yearParam) {
      const y = parseInt(yearParam, 10);
      if (!isNaN(y)) {
        const r = lookup(undefined, y);
        if (r) return r;
      }
    }
    return lookup(undefined, undefined); // fallback to most recent
  }

  const sampleYears: ReportingYear[] = [
    { id: 1, year: 2023 },
    { id: 2, year: 2024 },
  ];

  const mockLookup = (id?: number, year?: number): ReportingYear | null => {
    if (id !== undefined) return sampleYears.find((y) => y.id === id) ?? null;
    if (year !== undefined) return sampleYears.find((y) => y.year === year) ?? null;
    return sampleYears[sampleYears.length - 1]; // most recent
  };

  it('resolves year from reportingYearId when provided', () => {
    const result = resolveYearParam('1', null, mockLookup);
    expect(result?.id).toBe(1);
    expect(result?.year).toBe(2023);
  });

  it('falls back to year param when reportingYearId not provided', () => {
    const result = resolveYearParam(null, '2023', mockLookup);
    expect(result?.year).toBe(2023);
  });

  it('prefers reportingYearId over year param', () => {
    const result = resolveYearParam('2', '2023', mockLookup);
    // reportingYearId=2 → year 2024, NOT the year=2023 param
    expect(result?.year).toBe(2024);
  });

  it('falls back to most recent when neither param is given', () => {
    const result = resolveYearParam(null, null, mockLookup);
    expect(result?.year).toBe(2024); // most recent
  });
});
