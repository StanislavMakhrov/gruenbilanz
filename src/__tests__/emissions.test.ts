/**
 * Unit tests for lib/emissions.ts
 *
 * All DB calls are isolated by mocking lib/factors via vi.hoisted + vi.mock.
 * Tests cover: zero quantity, each major emission category, aggregation,
 * unknown category error propagation, and Ökostrom factor key routing.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

// ─── Mock lib/factors BEFORE any imports that pull in prisma ─────────────────
// vi.hoisted ensures the mock factory runs before module imports are resolved.
const { mockLookupFactor, MockFactorNotFoundError } = vi.hoisted(() => {
  class FactorNotFoundError extends Error {
    constructor(key: string, year: number) {
      super(`Kein Emissionsfaktor gefunden für Schlüssel "${key}" (Jahr: ${year})`);
      this.name = 'FactorNotFoundError';
    }
  }
  return { mockLookupFactor: vi.fn(), MockFactorNotFoundError: FactorNotFoundError };
});

vi.mock('../lib/factors', () => ({
  lookupFactor: mockLookupFactor,
  FactorNotFoundError: MockFactorNotFoundError,
}));

// ─── Imports after mock setup ─────────────────────────────────────────────────
import { calculateCO2e, calculateTotalCO2e } from '../lib/emissions';

// Convenience helper: resolve a factor result
function makeFactorResult(factorKg: number, unit = 'kg', source = 'UBA 2024') {
  return Promise.resolve({ factorKg, unit, source });
}

// ─── Test suite ───────────────────────────────────────────────────────────────
describe('calculateCO2e', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 immediately without calling lookupFactor when quantity is 0', async () => {
    const result = await calculateCO2e('ERDGAS', 0, 2024);
    expect(result).toBe(0);
    expect(mockLookupFactor).not.toHaveBeenCalled();
  });

  it('calculates ERDGAS (Heizung): 100 m³ × 2.0 = 200 kg CO₂e', async () => {
    mockLookupFactor.mockReturnValueOnce(makeFactorResult(2.0, 'm³'));
    const result = await calculateCO2e('ERDGAS', 100, 2024);
    expect(result).toBe(200);
    // Verify lookupFactor was called with the ERDGAS key (no override)
    expect(mockLookupFactor).toHaveBeenCalledWith('ERDGAS', 2024, undefined);
  });

  it('maps STROM category to STROM_MIX factor key', async () => {
    mockLookupFactor.mockReturnValueOnce(makeFactorResult(0.4, 'kWh'));
    await calculateCO2e('STROM', 100, 2024);
    // STROM is remapped to STROM_MIX by getCategoryKey
    expect(mockLookupFactor).toHaveBeenCalledWith('STROM_MIX', 2024, undefined);
  });

  it('passes isOekostrom option through to lookupFactor for STROM', async () => {
    mockLookupFactor.mockReturnValueOnce(makeFactorResult(0.0, 'kWh'));
    await calculateCO2e('STROM', 500, 2024, { isOekostrom: true });
    // lookupFactor receives STROM_MIX + isOekostrom; it remaps internally to STROM_OEKOSTROM
    expect(mockLookupFactor).toHaveBeenCalledWith('STROM_MIX', 2024, { isOekostrom: true });
  });

  it('calculates R410A_KAELTEMITTEL: 1 kg × 2088.0 = 2088 kg CO₂e', async () => {
    // GWP of R410A is 2088; seeded as factorKg in the DB
    mockLookupFactor.mockReturnValueOnce(makeFactorResult(2088.0, 'kg'));
    const result = await calculateCO2e('R410A_KAELTEMITTEL', 1, 2024);
    expect(result).toBe(2088);
    expect(mockLookupFactor).toHaveBeenCalledWith('R410A_KAELTEMITTEL', 2024, undefined);
  });

  it('calculates R32_KAELTEMITTEL: 1 kg × 675.0 = 675 kg CO₂e', async () => {
    mockLookupFactor.mockReturnValueOnce(makeFactorResult(675.0, 'kg'));
    const result = await calculateCO2e('R32_KAELTEMITTEL', 1, 2024);
    expect(result).toBe(675);
  });

  it('calculates R134A_KAELTEMITTEL: 1 kg × 1430.0 = 1430 kg CO₂e', async () => {
    mockLookupFactor.mockReturnValueOnce(makeFactorResult(1430.0, 'kg'));
    const result = await calculateCO2e('R134A_KAELTEMITTEL', 1, 2024);
    expect(result).toBe(1430);
  });

  it('calculates ABFALL_ALTMETALL: 100 kg × -0.04 = -4 kg CO₂e (negative recycling credit)', async () => {
    // Negative factor = recycling credit reduces total footprint
    mockLookupFactor.mockReturnValueOnce(makeFactorResult(-0.04, 'kg'));
    const result = await calculateCO2e('ABFALL_ALTMETALL', 100, 2024);
    expect(result).toBeCloseTo(-4.0);
    expect(result).toBeLessThan(0);
  });

  it('propagates FactorNotFoundError for an unknown category', async () => {
    // Each await call consumes one mockRejectedValueOnce — provide one per assertion
    mockLookupFactor.mockRejectedValueOnce(new MockFactorNotFoundError('UNKNOWN_CAT', 2024));
    await expect(calculateCO2e('UNKNOWN_CAT', 100, 2024)).rejects.toThrow(MockFactorNotFoundError);

    mockLookupFactor.mockRejectedValueOnce(new MockFactorNotFoundError('UNKNOWN_CAT', 2024));
    await expect(calculateCO2e('UNKNOWN_CAT', 100, 2024)).rejects.toThrow(
      'Kein Emissionsfaktor gefunden',
    );
  });

  it('maps MaterialCategory.SONSTIGE to MATERIAL_SONSTIGE factor key', async () => {
    mockLookupFactor.mockReturnValueOnce(makeFactorResult(1.5, 'kg'));
    await calculateCO2e('SONSTIGE', 10, 2024);
    expect(mockLookupFactor).toHaveBeenCalledWith('MATERIAL_SONSTIGE', 2024, undefined);
  });
});

describe('calculateTotalCO2e', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 for an empty entry array without DB calls', async () => {
    const result = await calculateTotalCO2e([], 2024);
    expect(result).toBe(0);
    expect(mockLookupFactor).not.toHaveBeenCalled();
  });

  it('sums CO₂e across multiple emission entries', async () => {
    // ERDGAS: 100 m³ × 2.0 = 200, STROM_MIX: 500 kWh × 0.4 = 200 → total 400
    mockLookupFactor
      .mockReturnValueOnce(makeFactorResult(2.0, 'm³'))  // ERDGAS
      .mockReturnValueOnce(makeFactorResult(0.4, 'kWh')); // STROM → STROM_MIX

    const result = await calculateTotalCO2e(
      [
        { category: 'ERDGAS', quantity: 100 },
        { category: 'STROM', quantity: 500 },
      ],
      2024,
    );
    expect(result).toBeCloseTo(400);
  });

  it('returns 0 for entries that all have zero quantity', async () => {
    const result = await calculateTotalCO2e(
      [
        { category: 'ERDGAS', quantity: 0 },
        { category: 'STROM', quantity: 0 },
      ],
      2024,
    );
    expect(result).toBe(0);
    expect(mockLookupFactor).not.toHaveBeenCalled();
  });

  it('handles negative entries (recycling credits) in the sum', async () => {
    mockLookupFactor
      .mockReturnValueOnce(makeFactorResult(2.0, 'm³'))   // ERDGAS: 100 × 2.0 = 200
      .mockReturnValueOnce(makeFactorResult(-0.04, 'kg')); // ALTMETALL: 100 × -0.04 = -4

    const result = await calculateTotalCO2e(
      [
        { category: 'ERDGAS', quantity: 100 },
        { category: 'ABFALL_ALTMETALL', quantity: 100 },
      ],
      2024,
    );
    expect(result).toBeCloseTo(196);
  });

  it('passes isOekostrom through for each entry individually', async () => {
    mockLookupFactor.mockReturnValueOnce(makeFactorResult(0.0, 'kWh'));
    await calculateTotalCO2e([{ category: 'STROM', quantity: 1000, isOekostrom: true }], 2024);
    expect(mockLookupFactor).toHaveBeenCalledWith('STROM_MIX', 2024, { isOekostrom: true });
  });
});
