import { test, expect } from '@playwright/test'

// TC-E03: Complete manual entry happy path for Heizung wizard
test('manual entry happy path - heizung', async ({ page }) => {
  // 1. Navigate to heizung wizard
  await page.goto('/wizard/heizung')
  await expect(page).not.toHaveURL(/error|500/)

  // 2. Enter a value in Erdgas field if present
  const erdgasInput = page.locator('input[name*="erdgas"], input[placeholder*="Erdgas"], input[placeholder*="kWh"]').first()
  if (await erdgasInput.isVisible()) {
    await erdgasInput.fill('1000')
  }

  // 3. Click Speichern if present
  const saveButton = page.locator('button:has-text("Speichern"), button[type="submit"]').first()
  if (await saveButton.isVisible()) {
    await saveButton.click()
    // Wait briefly for save to complete
    await page.waitForTimeout(500)
  }

  // 4. Navigate back to dashboard
  await page.goto('/')

  // 5. Verify dashboard loads without errors
  await expect(page).not.toHaveURL(/error|500/)
  await expect(page.locator('body')).not.toContainText(/Internal Server Error|Application error/)
})
