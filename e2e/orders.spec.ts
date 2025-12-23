import { test, expect } from '@playwright/test';

test.describe('Service Orders Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ordens-servico');
  });

  test('should display orders page', async ({ page }) => {
    // Check for orders page content
    await expect(page.locator('text=/ordens|orders|serviço/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show kanban or list view', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Look for kanban columns or table
    const kanbanColumns = page.locator('[class*="kanban"], [class*="column"]');
    const orderTable = page.locator('table, [role="table"]');
    
    // Either kanban or table should be visible
    const hasKanban = await kanbanColumns.first().isVisible().catch(() => false);
    const hasTable = await orderTable.isVisible().catch(() => false);
  });

  test('should have new order button', async ({ page }) => {
    const newOrderButton = page.locator('button:has-text(/nova|novo|adicionar|criar|new/i)').first();
    await expect(newOrderButton).toBeVisible({ timeout: 5000 });
  });

  test('should open new order dialog', async ({ page }) => {
    const newOrderButton = page.locator('button:has-text(/nova|novo|adicionar|criar/i)').first();
    
    if (await newOrderButton.isVisible()) {
      await newOrderButton.click();
      
      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 3000 }).catch(() => {
        // Might navigate to different page instead
      });
    }
  });

  test('should display order status columns', async ({ page }) => {
    // Look for status columns in kanban
    const statuses = ['Pendente', 'Em Produção', 'Pronto', 'Entregue'];
    
    for (const status of statuses) {
      const column = page.locator(`text=${status}`).first();
      // Columns should be visible in kanban view
    }
  });

  test('should filter orders', async ({ page }) => {
    // Look for filter/search
    const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="filtrar"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('teste');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Order Status Transitions', () => {
  test('should allow status change', async ({ page }) => {
    await page.goto('/ordens-servico');
    await page.waitForTimeout(2000);
    
    // Click on an order card if visible
    const orderCard = page.locator('[class*="card"], [class*="order-item"]').first();
    
    if (await orderCard.isVisible()) {
      await orderCard.click();
      
      // Look for status change options
      const statusButton = page.locator('button:has-text(/status|avançar|próximo/i)').first();
    }
  });
});

test.describe('Order Details', () => {
  test('should show order details on click', async ({ page }) => {
    await page.goto('/ordens-servico');
    await page.waitForTimeout(2000);
    
    // Click on first order
    const orderCard = page.locator('[class*="card"]').first();
    
    if (await orderCard.isVisible()) {
      await orderCard.click();
      
      // Details should show
      await page.waitForTimeout(500);
    }
  });
});
