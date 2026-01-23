import { test, expect } from '@playwright/test';

test.describe('Positions', () => {
  test.describe('as viewer', () => {
    test.beforeEach(async ({ page }) => {
      // Login as viewer
      await page.goto('/login');
      await page.fill('input[type="email"]', 'viewer@hellio.hr');
      await page.fill('input[type="password"]', 'viewer123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/');
    });

    test('can navigate to positions page', async ({ page }) => {
      await page.click('text=Positions');
      await expect(page).toHaveURL('/positions');
    });

    test('shows positions list', async ({ page }) => {
      await page.goto('/positions');

      // Should show positions
      await expect(page.locator('text=Frontend Developer')).toBeVisible();
      await expect(page.locator('text=Backend Developer')).toBeVisible();
      await expect(page.locator('text=Engineering')).toBeVisible();
    });

    test('can expand position details', async ({ page }) => {
      await page.goto('/positions');

      // Click on a position to expand
      await page.click('text=Frontend Developer');

      // Should show description
      await expect(page.locator('text=Build and maintain user interfaces')).toBeVisible();
    });
  });

  test.describe('as editor', () => {
    test.beforeEach(async ({ page }) => {
      // Login as editor
      await page.goto('/login');
      await page.fill('input[type="email"]', 'editor@hellio.hr');
      await page.fill('input[type="password"]', 'editor123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/');
    });

    test('editor can see positions', async ({ page }) => {
      await page.goto('/positions');
      await expect(page.locator('text=Frontend Developer')).toBeVisible();
    });

    test('editor sees Edit button on position cards', async ({ page }) => {
      await page.goto('/positions');

      // Edit button should be visible for editors
      const editButtons = page.getByRole('button', { name: 'Edit' });
      await expect(editButtons.first()).toBeVisible();
    });

    test('can open and close edit modal', async ({ page }) => {
      await page.goto('/positions');

      // Click first Edit button
      await page.getByRole('button', { name: 'Edit' }).first().click();

      // Modal should be visible
      await expect(page.locator('text=Edit Position')).toBeVisible();
      await expect(page.locator('#title')).toBeVisible();

      // Close via X button
      await page.getByRole('button', { name: 'Close' }).click();

      // Modal should be gone
      await expect(page.locator('text=Edit Position')).not.toBeVisible();
    });

    test('can close modal by clicking overlay', async ({ page }) => {
      await page.goto('/positions');

      await page.getByRole('button', { name: 'Edit' }).first().click();
      await expect(page.locator('text=Edit Position')).toBeVisible();

      // Click overlay (modal background)
      await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });

      // Modal should close
      await expect(page.locator('text=Edit Position')).not.toBeVisible();
    });

    test('can successfully edit position title', async ({ page }) => {
      await page.goto('/positions');

      // Find and expand Frontend Developer position
      await page.locator('text=Frontend Developer').first().click();

      // Click Edit
      await page.getByRole('button', { name: 'Edit' }).first().click();

      // Change title
      const titleInput = page.locator('#title');
      await titleInput.fill('Senior Frontend Developer');

      // Submit
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Modal should close
      await expect(page.locator('text=Edit Position')).not.toBeVisible();

      // Updated title should appear in the list
      await expect(page.locator('text=Senior Frontend Developer')).toBeVisible();
    });

    test('can successfully edit position department', async ({ page }) => {
      await page.goto('/positions');

      await page.getByRole('button', { name: 'Edit' }).first().click();

      const deptInput = page.locator('#department');
      await deptInput.fill('Product Engineering');

      await page.getByRole('button', { name: 'Save Changes' }).click();

      await expect(page.locator('text=Product Engineering')).toBeVisible();
    });

    test('can successfully edit position description', async ({ page }) => {
      await page.goto('/positions');

      // Expand position first
      await page.locator('text=Frontend Developer').first().click();

      await page.getByRole('button', { name: 'Edit' }).first().click();

      const descInput = page.locator('#description');
      await descInput.fill('Build modern, scalable web applications with React and TypeScript');

      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should show updated description
      await expect(page.locator('text=Build modern, scalable web applications')).toBeVisible();
    });

    test('shows saving state during submission', async ({ page }) => {
      await page.goto('/positions');

      await page.getByRole('button', { name: 'Edit' }).first().click();

      await page.locator('#title').fill('Updated Title');

      // Intercept the API call to slow it down
      await page.route('**/api/positions/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      // Click save and check for loading state
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByRole('button', { name: 'Saving...' })).toBeVisible();

      // Should be disabled during save
      await expect(page.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    });

    test('closes modal without API call when no changes made', async ({ page }) => {
      await page.goto('/positions');

      await page.getByRole('button', { name: 'Edit' }).first().click();

      // Don't make any changes
      let apiCalled = false;
      await page.route('**/api/positions/*', (route) => {
        apiCalled = true;
        route.continue();
      });

      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Modal should close
      await expect(page.locator('text=Edit Position')).not.toBeVisible();

      // API should not have been called
      expect(apiCalled).toBe(false);
    });

    test('handles API error gracefully', async ({ page }) => {
      await page.goto('/positions');

      await page.getByRole('button', { name: 'Edit' }).first().click();

      // Mock API failure
      await page.route('**/api/positions/*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error', message: 'Database connection failed' }),
        });
      });

      await page.locator('#title').fill('New Title');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should show error message
      await expect(page.locator('.form-error')).toBeVisible();
      await expect(page.locator('.form-error')).toContainText('Database connection failed');

      // Modal should stay open
      await expect(page.locator('text=Edit Position')).toBeVisible();
    });

    test('handles permission denied (403) error', async ({ page }) => {
      await page.goto('/positions');

      await page.getByRole('button', { name: 'Edit' }).first().click();

      // Mock 403 Forbidden
      await page.route('**/api/positions/*', (route) => {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Forbidden', message: 'You do not have permission to perform this action' }),
        });
      });

      await page.locator('#title').fill('New Title');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should show permission error
      await expect(page.locator('.form-error')).toContainText('permission');
    });

    test('form resets when opening modal for different position', async ({ page }) => {
      await page.goto('/positions');

      const editButtons = page.getByRole('button', { name: 'Edit' });

      // Edit first position
      await editButtons.first().click();
      const firstTitle = await page.locator('#title').inputValue();
      await page.getByRole('button', { name: 'Close' }).click();

      // Edit second position
      await editButtons.nth(1).click();
      const secondTitle = await page.locator('#title').inputValue();

      // Titles should be different
      expect(firstTitle).not.toBe(secondTitle);
    });

    test('prevents submission with empty required fields', async ({ page }) => {
      await page.goto('/positions');

      await page.getByRole('button', { name: 'Edit' }).first().click();

      // Clear required field
      await page.locator('#title').fill('');

      // Try to submit - browser validation should prevent it
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Modal should still be open (form validation prevented submission)
      await expect(page.locator('text=Edit Position')).toBeVisible();
    });

    test('handles very long text input', async ({ page }) => {
      await page.goto('/positions');

      await page.getByRole('button', { name: 'Edit' }).first().click();

      // Very long title
      const longTitle = 'A'.repeat(500);
      await page.locator('#title').fill(longTitle);

      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should either succeed or show validation error
      // At minimum, should not crash
      await page.waitForTimeout(1000);
    });

    test('handles special characters in fields', async ({ page }) => {
      await page.goto('/positions');

      await page.getByRole('button', { name: 'Edit' }).first().click();

      // Special characters
      await page.locator('#title').fill('Senior Developer <script>alert("xss")</script>');
      await page.locator('#department').fill('R&D / Engineering');

      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Should not execute script, should display as text
      await expect(page.locator('text=<script>alert("xss")</script>')).toBeVisible();
    });
  });

  test.describe('viewer permissions', () => {
    test.beforeEach(async ({ page }) => {
      // Login as viewer
      await page.goto('/login');
      await page.fill('input[type="email"]', 'viewer@hellio.hr');
      await page.fill('input[type="password"]', 'viewer123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/');
    });

    test('viewer does NOT see Edit button', async ({ page }) => {
      await page.goto('/positions');

      // Expand position to ensure card is fully loaded
      await page.locator('text=Frontend Developer').first().click();

      // Edit button should not exist
      await expect(page.getByRole('button', { name: 'Edit' })).not.toBeVisible();
    });
  });
});
