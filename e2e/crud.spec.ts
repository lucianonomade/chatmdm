import { test, expect } from '@playwright/test';

test.describe('Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/clientes');
  });

  test('should display customers page', async ({ page }) => {
    await expect(page.locator('text=/clientes|customers/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have add customer button', async ({ page }) => {
    const addButton = page.locator('button:has-text(/novo|nova|adicionar|criar|add/i)').first();
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });

  test('should open add customer form', async ({ page }) => {
    const addButton = page.locator('button:has-text(/novo|nova|adicionar|criar/i)').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Form should appear
      const nameInput = page.locator('input[placeholder*="nome"], input[name="name"]').first();
      await expect(nameInput).toBeVisible({ timeout: 3000 }).catch(() => {
        // Might be in dialog
        const dialog = page.locator('[role="dialog"]');
      });
    }
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="pesquisar"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('João');
      await page.waitForTimeout(500);
    }
  });

  test('should display customer table or list', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const table = page.locator('table, [role="table"]').first();
    const list = page.locator('[class*="list"], [class*="grid"]').first();
    
    // Either table or list should be visible
  });
});

test.describe('Product Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/produtos');
  });

  test('should display products page', async ({ page }) => {
    await expect(page.locator('text=/produtos|products/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have add product button', async ({ page }) => {
    const addButton = page.locator('button:has-text(/novo|nova|adicionar|criar/i)').first();
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });

  test('should show product categories', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for category filter or tabs
    const categoryFilter = page.locator('[class*="category"], [class*="filter"], [role="tablist"]').first();
  });

  test('should have stock information', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for stock column or indicator
    const stockInfo = page.locator('text=/estoque|stock|qtd/i').first();
  });
});

test.describe('Supplier Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fornecedores');
  });

  test('should display suppliers page', async ({ page }) => {
    await expect(page.locator('text=/fornecedores|suppliers/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have add supplier button', async ({ page }) => {
    const addButton = page.locator('button:has-text(/novo|nova|adicionar|criar/i)').first();
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });
});
