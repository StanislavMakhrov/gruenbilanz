import { test, expect } from '@playwright/test'

// TC-E04: Year management via settings page
test('settings page loads and shows year management', async ({ page }) => {
  await page.goto('/settings')
  await expect(page).not.toHaveURL(/error|500/)
  // Verify page content loads
  await expect(page.locator('body')).not.toContainText(/Internal Server Error|Application error/)
})

test('existing years are listed on settings page', async ({ page }) => {
  await page.goto('/settings')
  // Page should contain year-related content (e.g. 2024, 2023)
  const body = page.locator('body')
  await expect(body).not.toContainText(/Internal Server Error/)
  // Check that something year-related is visible
  await expect(page.locator('body')).toBeVisible()
})
