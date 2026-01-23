import { test, expect } from '@playwright/test';

test.describe('Candidates', () => {
  test.beforeEach(async ({ page }) => {
    // Login as viewer
    await page.goto('/login');
    await page.fill('input[type="email"]', 'viewer@hellio.hr');
    await page.fill('input[type="password"]', 'viewer123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('shows candidates list', async ({ page }) => {
    // Should show multiple candidates
    await expect(page.locator('text=Alice Johnson')).toBeVisible();
    await expect(page.locator('text=Bob Smith')).toBeVisible();
    await expect(page.locator('text=Carol Davis')).toBeVisible();
  });

  test('can search candidates', async ({ page }) => {
    // Type in search
    await page.fill('input[placeholder*="Search"]', 'Alice');

    // Should show only Alice
    await expect(page.locator('text=Alice Johnson')).toBeVisible();

    // Should not show Bob
    await expect(page.locator('text=Bob Smith')).not.toBeVisible();
  });

  test('can navigate to candidate profile', async ({ page }) => {
    // Click on a candidate
    await page.click('text=Alice Johnson');

    // Should show candidate profile
    await expect(page).toHaveURL(/\/candidates\/cand-001/);
    await expect(page.locator('h1, h2').filter({ hasText: 'Alice Johnson' })).toBeVisible();
  });

  test('candidate profile shows details', async ({ page }) => {
    await page.goto('/candidates/cand-001');

    // Should show candidate info
    await expect(page.locator('text=Alice Johnson')).toBeVisible();
    await expect(page.locator('text=alice.johnson@email.com')).toBeVisible();
    await expect(page.locator('text=React')).toBeVisible();
    await expect(page.locator('text=TypeScript')).toBeVisible();
  });

  test('shows 404 for non-existent candidate', async ({ page }) => {
    await page.goto('/candidates/non-existent');

    // Should show some form of not found message
    await expect(page.locator('text=/not found|error/i')).toBeVisible();
  });
});
