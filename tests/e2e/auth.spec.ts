import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Hellio HR');
    await expect(page.locator('h2')).toContainText('Sign In');
  });

  test('viewer can login and see candidates list', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[type="email"]', 'viewer@hellio.hr');
    await page.fill('input[type="password"]', 'viewer123');
    await page.click('button[type="submit"]');

    // Should redirect to candidates page
    await expect(page).toHaveURL('/');

    // Should show user info in header
    await expect(page.locator('.user-email')).toContainText('viewer@hellio.hr');
    await expect(page.locator('.user-role')).toContainText('viewer');

    // Should show candidates
    await expect(page.locator('text=Alice Johnson')).toBeVisible();
  });

  test('editor can login and see candidates list', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[type="email"]', 'editor@hellio.hr');
    await page.fill('input[type="password"]', 'editor123');
    await page.click('button[type="submit"]');

    // Should redirect to candidates page
    await expect(page).toHaveURL('/');

    // Should show editor role
    await expect(page.locator('.user-role')).toContainText('editor');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'viewer@hellio.hr');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.login-error')).toBeVisible();

    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('can logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'viewer@hellio.hr');
    await page.fill('input[type="password"]', 'viewer123');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await expect(page).toHaveURL('/');

    // Click logout
    await page.click('.logout-button');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('persists auth across page refresh', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'viewer@hellio.hr');
    await page.fill('input[type="password"]', 'viewer123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');

    // Refresh page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL('/');
    await expect(page.locator('.user-email')).toContainText('viewer@hellio.hr');
  });
});
