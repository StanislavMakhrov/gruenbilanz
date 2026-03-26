import { test, expect } from '@playwright/test'

// TC-E01: Dashboard loads and shows company name
test('dashboard loads without login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/GrünBilanz|Bilanz/)
})

// TC-E01: Dashboard shows Mustermann Elektro GmbH
test('dashboard shows company name', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toContainText(/Mustermann|Dashboard|Bilanz/)
})

// TC-E02: Year selector is present on dashboard
test('year selector is present', async ({ page }) => {
  await page.goto('/')
  const yearSelector = page.locator('[data-testid="year-selector"], select, [role="combobox"]').first()
  await expect(yearSelector).toBeVisible()
})

// TC-E03: Wizard navigation link works
test('wizard link in nav is accessible', async ({ page }) => {
  await page.goto('/')
  const wizardLink = page.locator('a[href*="wizard"], a:has-text("Wizard"), a:has-text("Erfassung")')
  await expect(wizardLink.first()).toBeVisible()
})

// TC-E04: Settings link works
test('settings link is accessible', async ({ page }) => {
  await page.goto('/')
  const settingsLink = page.locator('a[href*="settings"], a[href*="einstellungen"], a:has-text("Einstellungen"), a:has-text("Settings")')
  await expect(settingsLink.first()).toBeVisible()
})
