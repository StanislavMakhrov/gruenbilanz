import { defineConfig } from '@playwright/test'

/**
 * Playwright configuration for the e2e-tests directory.
 *
 * Used by the CI pipeline, which runs `npm test` from this directory.
 * In CI the app is started via Docker on port 3000 before this runs;
 * the BASE_URL env var is set by the workflow. Locally the root-level
 * playwright.config.ts drives `npx playwright test` with the dev server.
 */
export default defineConfig({
  testDir: '.',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  },
  // In CI the Docker container is already running — no webServer needed.
  // Locally, use the root playwright.config.ts instead of this file.
  webServer: process.env.CI
    ? undefined
    : {
        command: 'cd ../src && npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
      },
})
