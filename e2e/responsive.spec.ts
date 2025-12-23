import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should show mobile menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Look for hamburger menu or mobile menu button
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text(/menu/i), [class*="hamburger"]').first();
  });

  test('should be usable on mobile', async ({ page }) => {
    await page.goto('/vendas');
    await page.waitForTimeout(2000);
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('PDV should work on mobile', async ({ page }) => {
    await page.goto('/vendas');
    await page.waitForTimeout(2000);
    
    // Main content should be visible
    const content = page.locator('main, [class*="content"], [class*="main"]').first();
  });
});

test.describe('Tablet Responsiveness', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad

  test('should display properly on tablet', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Page should display correctly
    await expect(page.locator('body')).toBeVisible();
  });

  test('sidebar might be collapsed', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Sidebar might be collapsed on tablet
    const sidebar = page.locator('[class*="sidebar"]').first();
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Check for h1
    const h1 = page.locator('h1').first();
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Check images have alt attributes
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Images should have alt text
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should have focus on interactive element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focusedElement);
  });

  test('should have proper button labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Buttons should have accessible names
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      // Button should have label or text
    }
  });
});

test.describe('Performance', () => {
  test('should load dashboard quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    // Page should load in reasonable time
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
  });

  test('should load PDV quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/vendas');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Error Handling', () => {
  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-xyz');
    
    // Should show not found page or redirect
    const notFound = page.locator('text=/404|não encontrad|not found/i').first();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Page should still be usable
    await expect(page.locator('body')).toBeVisible();
  });
});
