/**
 * Emission factor lookup module for GrünBilanz.
 *
 * Fetches emission factors from the database using a versioned lookup:
 * given a factor key and reporting year, returns the most recent factor
 * at or before that year (forward fallback for years before seed data).
 *
 * This is the only module allowed to query EmissionFactor — no other module
 * should access this table directly.
 */
import { prisma } from './prisma';

export class FactorNotFoundError extends Error {
  constructor(key: string, year: number) {
    super(`Kein Emissionsfaktor gefunden für Schlüssel "${key}" (Jahr: ${year})`);
    this.name = 'FactorNotFoundError';
  }
}

interface FactorResult {
  factorKg: number;
  unit: string;
  source: string;
}

/**
 * Looks up an emission factor from the database.
 *
 * Strategy:
 * 1. Primary: find the most recent factor where validYear <= year
 * 2. Forward fallback: if no prior factor exists, use the earliest available
 *    (handles 2023 queries when only 2024 factors are seeded)
 *
 * @param key - The factor key (e.g. "ERDGAS", "STROM_MIX")
 * @param year - The reporting year to look up
 * @param options.isOekostrom - When true, remaps "STROM" or "STROM_MIX" → "STROM_OEKOSTROM"
 */
export async function lookupFactor(
  key: string,
  year: number,
  options?: { isOekostrom?: boolean },
): Promise<FactorResult> {
  // Remap STROM keys based on Ökostrom flag
  let resolvedKey = key;
  if (options?.isOekostrom && (key === 'STROM' || key === 'STROM_MIX')) {
    resolvedKey = 'STROM_OEKOSTROM';
  }

  // Primary lookup: most recent factor at or before the given year
  const primary = await prisma.emissionFactor.findFirst({
    where: {
      key: resolvedKey,
      validYear: { lte: year },
    },
    orderBy: { validYear: 'desc' },
  });

  if (primary) {
    return { factorKg: primary.factorKg, unit: primary.unit, source: primary.source };
  }

  // Forward fallback: use the earliest available factor for this key
  const fallback = await prisma.emissionFactor.findFirst({
    where: { key: resolvedKey },
    orderBy: { validYear: 'asc' },
  });

  if (fallback) {
    return { factorKg: fallback.factorKg, unit: fallback.unit, source: fallback.source };
  }

  throw new FactorNotFoundError(resolvedKey, year);
}
