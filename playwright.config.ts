import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e-tests',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'cd src && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
