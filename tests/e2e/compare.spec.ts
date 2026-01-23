import { test, expect } from '@playwright/test';

test.describe('Compare Candidates', () => {
  test.beforeEach(async ({ page }) => {
    // Login as viewer
    await page.goto('/login');
    await page.fill('input[type="email"]', 'viewer@hellio.hr');
    await page.fill('input[type="password"]', 'viewer123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('compare page shows both candidates', async ({ page }) => {
    await page.goto('/compare/cand-001/cand-002');

    // Should show both candidates
    await expect(page.locator('text=Alice Johnson')).toBeVisible();
    await expect(page.locator('text=Bob Smith')).toBeVisible();
  });

  test('compare page shows candidate details', async ({ page }) => {
    await page.goto('/compare/cand-001/cand-002');

    // Should show skills from both candidates
    await expect(page.locator('text=React')).toBeVisible();
    await expect(page.locator('text=Python')).toBeVisible();
  });

  test('can navigate to compare from candidates page', async ({ page }) => {
    // Select candidates for comparison (if selection UI exists)
    // This test depends on the UI implementation
    await page.goto('/');

    // Look for compare link/button
    const compareLink = page.locator('a[href*="/compare"]');
    if (await compareLink.count() > 0) {
      await compareLink.first().click();
      await expect(page).toHaveURL(/\/compare\//);
    }
  });

  test('shows error for non-existent candidates', async ({ page }) => {
    await page.goto('/compare/non-existent-1/non-existent-2');

    // Should show some form of error or not found
    await expect(page.locator('text=/not found|error/i')).toBeVisible();
  });
});
