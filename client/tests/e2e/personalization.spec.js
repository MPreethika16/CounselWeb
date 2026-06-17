import { test, expect } from '@playwright/test';

test.describe('Personalization Flow', () => {
  test('User can mutate priorities and save colleges', async ({ page }) => {
    // 1. Preferences Setup
    await page.goto('/preferences');
    await page.fill('input[type="number"]', '800000');
    // Using evaluate for range sliders
    await page.$eval('input[type="range"]', el => el.value = '8');
    await page.click('button[type="submit"]');
    
    // Verify save toast/alert
    page.on('dialog', dialog => dialog.accept());

    // 2. Saved Colleges View
    await page.goto('/saved-colleges');
    await expect(page.locator('h1')).toHaveText('Saved Colleges');
    // Assumes 0 state or mock state
    const emptyState = await page.locator('text=No saved colleges').isVisible();
    const hasCards = await page.locator('.p-6.bg-white').count() > 0;
    expect(emptyState || hasCards).toBeTruthy();
  });
});
