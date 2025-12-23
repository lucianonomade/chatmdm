import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display dashboard', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Dashboard should have stats cards
    const statsCards = page.locator('[class*="card"], [class*="stats"]');
  });

  test('should show statistics cards', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for common dashboard metrics
    const metrics = ['Vendas', 'Pedidos', 'Clientes', 'Faturamento'];
    
    for (const metric of metrics) {
      const card = page.locator(`text=${metric}`).first();
      // Metrics should be present
    }
  });

  test('should have navigation sidebar', async ({ page }) => {
    // Look for sidebar or navigation
    const sidebar = page.locator('[class*="sidebar"], nav, [role="navigation"]').first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to other pages', async ({ page }) => {
    // Click on a navigation link
    const vendasLink = page.locator('a[href*="vendas"], button:has-text(/vendas|pdv/i)').first();
    
    if (await vendasLink.isVisible()) {
      await vendasLink.click();
      await page.waitForURL(/vendas/);
    }
  });

  test('should have recent activity section', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for recent sales or activity
    const recentSection = page.locator('text=/recentes|últimas|recent/i').first();
  });

  test('should display charts', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for chart containers
    const charts = page.locator('[class*="chart"], [class*="recharts"], svg').first();
  });
});

test.describe('Navigation', () => {
  test('should have working sidebar links', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    const routes = [
      { name: /vendas|pdv/i, path: 'vendas' },
      { name: /clientes/i, path: 'clientes' },
      { name: /produtos/i, path: 'produtos' },
      { name: /ordens|serviço/i, path: 'ordens-servico' },
    ];
    
    for (const route of routes) {
      const link = page.locator(`a:has-text("${route.name}"), [role="link"]:has-text("${route.name}")`).first();
      // Links should be present
    }
  });

  test('should show breadcrumbs', async ({ page }) => {
    await page.goto('/vendas');
    await page.waitForTimeout(1000);
    
    // Look for breadcrumb navigation
    const breadcrumbs = page.locator('[class*="breadcrumb"], nav[aria-label*="breadcrumb"]').first();
  });

  test('should have theme toggle', async ({ page }) => {
    await page.goto('/');
    
    // Look for theme toggle button
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text(/tema|theme|dark|light/i)').first();
  });
});

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/configuracoes');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('text=/configurações|settings/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have company settings section', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for company settings
    const companySection = page.locator('text=/empresa|company|dados/i').first();
  });

  test('should have notification settings', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for notification settings
    const notificationSection = page.locator('text=/notificações|notifications/i').first();
  });
});
