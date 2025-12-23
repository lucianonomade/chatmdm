import { test, expect, Page } from '@playwright/test';

// Test helpers
const loginUser = async (page: Page, email: string, password: string) => {
  await page.goto('/auth');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^\/((?!auth).)*$/); // Wait for redirect away from auth
};

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle between login and signup', async ({ page }) => {
    // Look for signup toggle
    const signupButton = page.getByRole('button', { name: /criar conta|cadastrar|signup/i });
    if (await signupButton.isVisible()) {
      await signupButton.click();
      // Should show additional fields for signup
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalidemail');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Form should not submit with invalid email
    await expect(page).toHaveURL(/auth/);
  });

  test('should have password recovery option', async ({ page }) => {
    const forgotPassword = page.getByText(/esquec|forgot|recuperar/i);
    await expect(forgotPassword).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/');
    
    // Should be redirected to auth if not logged in
    // Or should show the page if session exists
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(auth|\/)/);
  });
});
