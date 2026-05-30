const { test, expect } = require('@playwright/test');
test('Hawk website loads and scans device', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await expect(page).toHaveTitle(/Hawk/);
  const scanButton = page.locator('button:has-text("Scan Your Device")');
  await expect(scanButton).toBeVisible();
  await scanButton.click();
  const results = page.locator('#results-display');
  await expect(results).toBeVisible();
  await expect(page.locator('text=OS')).toBeVisible();
  await expect(page.locator('text=Architecture')).toBeVisible();
});
