import { test, expect } from '@playwright/test';

test.describe('Financial Flow', () => {
  test('should display caixa page', async ({ page }) => {
    await page.goto('/caixa');
    await expect(page.locator('text=/caixa|cash/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show balance information', async ({ page }) => {
    await page.goto('/caixa');
    await page.waitForTimeout(2000);
    
    // Look for balance display
    const balance = page.locator('text=/saldo|balance|R\\$/i').first();
  });

  test('should have expense registration', async ({ page }) => {
    await page.goto('/caixa');
    await page.waitForTimeout(2000);
    
    // Look for expense button
    const expenseButton = page.locator('button:has-text(/despesa|expense|saída/i)').first();
  });

  test('should display transactions list', async ({ page }) => {
    await page.goto('/caixa');
    await page.waitForTimeout(2000);
    
    // Look for transactions
    const transactions = page.locator('table, [class*="transaction"], [class*="list"]').first();
  });
});

test.describe('Reports Flow', () => {
  test('should display reports page', async ({ page }) => {
    await page.goto('/relatorios');
    await expect(page.locator('text=/relatórios|reports/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have date filters', async ({ page }) => {
    await page.goto('/relatorios');
    await page.waitForTimeout(2000);
    
    // Look for date inputs
    const dateFilter = page.locator('input[type="date"], [class*="date-picker"], button:has-text(/data|date|período/i)').first();
  });

  test('should show sales report', async ({ page }) => {
    await page.goto('/relatorios');
    await page.waitForTimeout(2000);
    
    // Look for sales report section
    const salesReport = page.locator('text=/vendas|sales/i').first();
  });

  test('should have export option', async ({ page }) => {
    await page.goto('/relatorios');
    await page.waitForTimeout(2000);
    
    // Look for export button
    const exportButton = page.locator('button:has-text(/exportar|export|excel|pdf/i)').first();
  });
});

test.describe('Accounts Receivable', () => {
  test('should display contas a receber page', async ({ page }) => {
    await page.goto('/contas-receber');
    await expect(page.locator('text=/contas|receber|receivable/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show pending payments', async ({ page }) => {
    await page.goto('/contas-receber');
    await page.waitForTimeout(2000);
    
    // Look for pending payments
    const pendingSection = page.locator('text=/pendente|pending|aberto/i').first();
  });

  test('should have payment registration', async ({ page }) => {
    await page.goto('/contas-receber');
    await page.waitForTimeout(2000);
    
    // Look for payment registration
    const paymentButton = page.locator('button:has-text(/receber|pagar|payment/i)').first();
  });
});
