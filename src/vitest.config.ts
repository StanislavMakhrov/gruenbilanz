/**
 * Vitest configuration for GrünBilanz unit tests.
 *
 * Targets the Node.js environment (no DOM), covering lib/emissions.ts and
 * lib/factors.ts with ≥80% line/function/branch coverage thresholds.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      // Only measure coverage for the two core calculation modules
      include: ['lib/emissions.ts', 'lib/factors.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});
