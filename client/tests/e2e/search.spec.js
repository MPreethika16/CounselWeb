import { test, expect } from '@playwright/test';

test.describe('Search & Discovery Flow', () => {
  test('User can search and navigate to college details', async ({ page }) => {
    await page.goto('/search');
    
    // Type in search bar
    await page.fill('input[placeholder*="Search by name"]', 'IIT');
    
    // Wait for debounce and API response
    await page.waitForResponse(response => response.url().includes('/api/search') && response.status() === 200);
    
    // Verify results render
    await expect(page.locator('text=IITB')).toBeVisible();
    
    // Click through to details
    await page.click('text=View Details');
    await page.waitForURL(/\/college\/.+/);
    
    // Verify details page
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Placements & Outcomes')).toBeVisible();
  });
});
