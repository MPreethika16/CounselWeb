import { test, expect } from '@playwright/test';

test.describe('Comparison Flow', () => {
  test('Renders dynamic horizontal matrices for multiple institutions', async ({ page }) => {
    await page.goto('/compare');
    
    // Wait for comparison service
    await page.waitForResponse(response => response.url().includes('/search/compare'));
    
    // Verify matrix headers
    await expect(page.locator('th:has-text("Metric")')).toBeVisible();
    
    // Verify key comparative rows
    await expect(page.locator('td:has-text("Avg Package")')).toBeVisible();
    await expect(page.locator('td:has-text("Tuition Fee")')).toBeVisible();
    await expect(page.locator('td:has-text("NIRF Rank")')).toBeVisible();
  });
});
