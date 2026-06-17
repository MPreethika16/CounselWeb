import { test, expect } from '@playwright/test';

test.describe('Recommendations Flow', () => {
  test('Engine generates confident recommendations', async ({ page }) => {
    // Requires authenticated session in real E2E
    await page.goto('/recommendations');
    
    // Wait for the recommendation engine API
    await page.waitForResponse(response => response.url().includes('/recommendations/generate') && response.status() === 200);
    
    // Verify match badges render
    await expect(page.locator('text=% Match').first()).toBeVisible();
    
    // Verify UI highlights
    const highlightCount = await page.locator('li:has-text("✓")').count();
    expect(highlightCount).toBeGreaterThan(0);
  });
});
