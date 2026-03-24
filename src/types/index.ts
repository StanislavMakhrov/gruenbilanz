/**
 * Shared TypeScript types and constants for GrünBilanz.
 * All screen-to-category mappings, German labels, and plausibility ranges
 * are defined here to ensure a single source of truth.
 */

// Re-export Prisma-generated types
export type {
  CompanyProfile,
  EmissionEntry,
  MaterialEntry,
  EmissionFactor,
  ReportingYear,
  AuditLog,
  UploadedDocument,
} from '@prisma/client';

export { EmissionCategory, MaterialCategory, Scope, InputMethod, Branche } from '@prisma/client';

/**
 * Maps wizard screen numbers (2–7) to their associated EmissionCategory values.
 * Screen 1 handles CompanyProfile (no EmissionCategory).
 * Screen 6 handles MaterialEntry (no EmissionCategory).
 */
export const SCREEN_CATEGORIES: Record<number, import('@prisma/client').EmissionCategory[]> = {
  2: [
    'ERDGAS',
    'HEIZOEL',
    'FLUESSIGGAS',
    'R410A_KAELTEMITTEL',
    'R32_KAELTEMITTEL',
    'R134A_KAELTEMITTEL',
    'SONSTIGE_KAELTEMITTEL',
  ],
  3: ['DIESEL_FUHRPARK', 'BENZIN_FUHRPARK', 'PKW_BENZIN_KM', 'PKW_DIESEL_KM', 'TRANSPORTER_KM', 'LKW_KM'],
  4: ['STROM', 'FERNWAERME'],
  5: ['GESCHAEFTSREISEN_FLUG', 'GESCHAEFTSREISEN_BAHN', 'PENDLERVERKEHR'],
  6: [], // MaterialEntry — no EmissionCategory
  7: ['ABFALL_RESTMUELL', 'ABFALL_BAUSCHUTT', 'ABFALL_ALTMETALL', 'ABFALL_SONSTIGES'],
};

/**
 * German-language labels for all EmissionCategory enum values.
 * Used in charts, status lists, and wizard field labels.
 */
export const CATEGORY_LABELS: Record<import('@prisma/client').EmissionCategory, string> = {
  ERDGAS: 'Erdgas',
  HEIZOEL: 'Heizöl',
  FLUESSIGGAS: 'Flüssiggas',
  DIESEL_FUHRPARK: 'Diesel Fuhrpark',
  BENZIN_FUHRPARK: 'Benzin Fuhrpark',
  PKW_BENZIN_KM: 'PKW Benzin (km)',
  PKW_DIESEL_KM: 'PKW Diesel (km)',
  TRANSPORTER_KM: 'Transporter (km)',
  LKW_KM: 'LKW (km)',
  R410A_KAELTEMITTEL: 'Kältemittel R410A',
  R32_KAELTEMITTEL: 'Kältemittel R32',
  R134A_KAELTEMITTEL: 'Kältemittel R134A',
  SONSTIGE_KAELTEMITTEL: 'Kältemittel Sonstige',
  STROM: 'Strom',
  FERNWAERME: 'Fernwärme',
  GESCHAEFTSREISEN_FLUG: 'Geschäftsreisen Flug',
  GESCHAEFTSREISEN_BAHN: 'Geschäftsreisen Bahn',
  PENDLERVERKEHR: 'Pendlerverkehr',
  ABFALL_RESTMUELL: 'Abfall Restmüll',
  ABFALL_BAUSCHUTT: 'Abfall Bauschutt',
  ABFALL_ALTMETALL: 'Altmetall',
  ABFALL_SONSTIGES: 'Abfall Sonstiges',
};

/**
 * German-language labels for MaterialCategory enum values.
 */
export const MATERIAL_LABELS: Record<import('@prisma/client').MaterialCategory, string> = {
  KUPFER: 'Kupfer',
  STAHL: 'Stahl',
  ALUMINIUM: 'Aluminium',
  HOLZ: 'Holz',
  KUNSTSTOFF_PVC: 'Kunststoff / PVC',
  BETON: 'Beton',
  FARBEN_LACKE: 'Farben & Lacke',
  SONSTIGE: 'Sonstige Materialien',
};

/**
 * Plausibility ranges for wizard numeric inputs.
 * Values outside these ranges trigger a PlausibilityWarning.
 * Ranges are calibrated for Handwerksbetriebe with 1–100 employees.
 */
export const PLAUSIBILITY_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  ERDGAS: { min: 100, max: 100000, unit: 'm³' },
  HEIZOEL: { min: 100, max: 50000, unit: 'L' },
  FLUESSIGGAS: { min: 10, max: 10000, unit: 'kg' },
  DIESEL_FUHRPARK: { min: 50, max: 50000, unit: 'L' },
  BENZIN_FUHRPARK: { min: 10, max: 20000, unit: 'L' },
  PKW_BENZIN_KM: { min: 100, max: 200000, unit: 'km' },
  PKW_DIESEL_KM: { min: 100, max: 200000, unit: 'km' },
  TRANSPORTER_KM: { min: 100, max: 300000, unit: 'km' },
  LKW_KM: { min: 100, max: 500000, unit: 'km' },
  R410A_KAELTEMITTEL: { min: 0.1, max: 100, unit: 'kg' },
  R32_KAELTEMITTEL: { min: 0.1, max: 100, unit: 'kg' },
  R134A_KAELTEMITTEL: { min: 0.1, max: 100, unit: 'kg' },
  SONSTIGE_KAELTEMITTEL: { min: 0.1, max: 100, unit: 'kg' },
  STROM: { min: 1000, max: 500000, unit: 'kWh' },
  FERNWAERME: { min: 100, max: 200000, unit: 'kWh' },
  GESCHAEFTSREISEN_FLUG: { min: 100, max: 200000, unit: 'km' },
  GESCHAEFTSREISEN_BAHN: { min: 50, max: 100000, unit: 'km' },
  PENDLERVERKEHR: { min: 500, max: 1000000, unit: 'km' },
  ABFALL_RESTMUELL: { min: 50, max: 50000, unit: 'kg' },
  ABFALL_BAUSCHUTT: { min: 0, max: 100000, unit: 'kg' },
  ABFALL_ALTMETALL: { min: 0, max: 50000, unit: 'kg' },
  ABFALL_SONSTIGES: { min: 0, max: 20000, unit: 'kg' },
  KUPFER: { min: 1, max: 10000, unit: 'kg' },
  STAHL: { min: 1, max: 50000, unit: 'kg' },
  ALUMINIUM: { min: 1, max: 10000, unit: 'kg' },
  HOLZ: { min: 10, max: 100000, unit: 'kg' },
  KUNSTSTOFF_PVC: { min: 1, max: 10000, unit: 'kg' },
  BETON: { min: 100, max: 500000, unit: 'kg' },
  FARBEN_LACKE: { min: 1, max: 5000, unit: 'kg' },
};

/** German scope labels for display */
export const SCOPE_LABELS: Record<import('@prisma/client').Scope, string> = {
  SCOPE1: 'Scope 1 (direkt)',
  SCOPE2: 'Scope 2 (Energie)',
  SCOPE3: 'Scope 3 (vorgelagert)',
};

/** Maps EmissionCategory to its Scope */
export const CATEGORY_SCOPE: Record<import('@prisma/client').EmissionCategory, import('@prisma/client').Scope> = {
  ERDGAS: 'SCOPE1',
  HEIZOEL: 'SCOPE1',
  FLUESSIGGAS: 'SCOPE1',
  DIESEL_FUHRPARK: 'SCOPE1',
  BENZIN_FUHRPARK: 'SCOPE1',
  PKW_BENZIN_KM: 'SCOPE1',
  PKW_DIESEL_KM: 'SCOPE1',
  TRANSPORTER_KM: 'SCOPE1',
  LKW_KM: 'SCOPE1',
  R410A_KAELTEMITTEL: 'SCOPE1',
  R32_KAELTEMITTEL: 'SCOPE1',
  R134A_KAELTEMITTEL: 'SCOPE1',
  SONSTIGE_KAELTEMITTEL: 'SCOPE1',
  STROM: 'SCOPE2',
  FERNWAERME: 'SCOPE2',
  GESCHAEFTSREISEN_FLUG: 'SCOPE3',
  GESCHAEFTSREISEN_BAHN: 'SCOPE3',
  PENDLERVERKEHR: 'SCOPE3',
  ABFALL_RESTMUELL: 'SCOPE3',
  ABFALL_BAUSCHUTT: 'SCOPE3',
  ABFALL_ALTMETALL: 'SCOPE3',
  ABFALL_SONSTIGES: 'SCOPE3',
};
