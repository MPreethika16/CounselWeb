import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('User can register, login, and access profile', async ({ page }) => {
    // 1. Registration
    await page.goto('/register');
    await page.fill('input[type="email"]', 'testuser@counselweb.com');
    await page.fill('input[type="password"]', 'SecurePass123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Registration Successful!')).toBeVisible();

    // 2. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'testuser@counselweb.com');
    await page.fill('input[type="password"]', 'SecurePass123');
    await page.click('button[type="submit"]');

    // 3. Profile Access
    await page.waitForURL('/profile');
    await expect(page.locator('h1')).toHaveText('Your Profile');
    await expect(page.locator('text=testuser@counselweb.com')).toBeVisible();
  });
});
