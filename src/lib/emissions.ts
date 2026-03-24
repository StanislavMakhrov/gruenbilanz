/**
 * CO₂e calculation engine for GrünBilanz.
 *
 * This is the central calculation function used by the dashboard, PDF generation,
 * and all aggregation queries. NO calculation logic lives in UI components or API routes.
 *
 * All emission factors are fetched from the database via lib/factors.ts.
 * Factor key mapping: most categories use their enum name as-is, with two exceptions:
 *   - STROM → "STROM_MIX" (or "STROM_OEKOSTROM" when isOekostrom=true)
 *   - MaterialCategory.SONSTIGE → "MATERIAL_SONSTIGE"
 */
import { EmissionCategory, MaterialCategory } from '@prisma/client';
import { FactorNotFoundError, lookupFactor } from './factors';

/**
 * Maps EmissionCategory and MaterialCategory values to their database factor keys.
 * Most keys are identical to the enum value; these are the exceptions.
 */
const FACTOR_KEY_OVERRIDES: Partial<Record<string, string>> = {
  STROM: 'STROM_MIX', // may be further remapped to STROM_OEKOSTROM by lookupFactor
  SONSTIGE: 'MATERIAL_SONSTIGE', // MaterialCategory.SONSTIGE
};

function getCategoryKey(category: EmissionCategory | MaterialCategory | string): string {
  return FACTOR_KEY_OVERRIDES[category] ?? category;
}

/**
 * Calculates CO₂e in kg for a given emission category and quantity.
 *
 * @param category - EmissionCategory or MaterialCategory enum value
 * @param quantity - Amount in the category's native unit (m³, L, kg, kWh, or km)
 * @param year - The reporting year (used for versioned factor lookup)
 * @param options.isOekostrom - When true, uses the green electricity factor for STROM
 * @returns CO₂e in kg (may be negative for ABFALL_ALTMETALL recycling credit)
 * @throws FactorNotFoundError if no factor exists for the category
 */
export async function calculateCO2e(
  category: EmissionCategory | MaterialCategory | string,
  quantity: number,
  year: number,
  options?: { isOekostrom?: boolean },
): Promise<number> {
  // Zero quantity short-circuits without a DB query
  if (quantity === 0) return 0;

  const key = getCategoryKey(category);
  const factor = await lookupFactor(key, year, options);

  // quantity × factorKg; negative factors (e.g. ABFALL_ALTMETALL) produce negative results
  return quantity * factor.factorKg;
}

/**
 * Calculates total CO₂e in kg for a collection of emission entries.
 * Entries with the same category are summed before multiplying by the factor.
 *
 * @param entries - Array of { category, quantity, isOekostrom? } objects
 * @param year - Reporting year for factor lookup
 * @returns Total CO₂e in kg across all entries
 */
export async function calculateTotalCO2e(
  entries: Array<{
    category: EmissionCategory | string;
    quantity: number;
    isOekostrom?: boolean;
  }>,
  year: number,
): Promise<number> {
  const results = await Promise.all(
    entries.map((e) =>
      calculateCO2e(e.category, e.quantity, year, { isOekostrom: e.isOekostrom }),
    ),
  );
  return results.reduce((sum, val) => sum + val, 0);
}

export { FactorNotFoundError };
