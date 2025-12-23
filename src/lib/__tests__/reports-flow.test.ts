import { describe, it, expect } from 'vitest';

// Reports Flow Integration Tests
describe('Reports Flow Integration', () => {
  interface Sale {
    id: string;
    date: Date;
    total: number;
    paymentMethod: string;
    items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>;
    discount: number;
    sellerId?: string;
    sellerName?: string;
  }

  interface Expense {
    id: string;
    date: Date;
    amount: number;
    category: string;
    description: string;
  }

  // Sample data
  const sales: Sale[] = [
    {
      id: '1',
      date: new Date('2024-01-15'),
      total: 150,
      paymentMethod: 'Dinheiro',
      items: [{ productId: 'p1', productName: 'Produto A', quantity: 3, unitPrice: 50 }],
      discount: 0,
      sellerId: 's1',
      sellerName: 'Vendedor 1',
    },
    {
      id: '2',
      date: new Date('2024-01-15'),
      total: 200,
      paymentMethod: 'Cartão Crédito',
      items: [{ productId: 'p2', productName: 'Produto B', quantity: 2, unitPrice: 100 }],
      discount: 0,
      sellerId: 's1',
      sellerName: 'Vendedor 1',
    },
    {
      id: '3',
      date: new Date('2024-01-16'),
      total: 90,
      paymentMethod: 'Pix',
      items: [{ productId: 'p1', productName: 'Produto A', quantity: 2, unitPrice: 50 }],
      discount: 10,
      sellerId: 's2',
      sellerName: 'Vendedor 2',
    },
    {
      id: '4',
      date: new Date('2024-02-01'),
      total: 500,
      paymentMethod: 'Cartão Débito',
      items: [
        { productId: 'p3', productName: 'Produto C', quantity: 1, unitPrice: 300 },
        { productId: 'p1', productName: 'Produto A', quantity: 4, unitPrice: 50 },
      ],
      discount: 0,
      sellerId: 's1',
      sellerName: 'Vendedor 1',
    },
  ];

  const expenses: Expense[] = [
    { id: 'e1', date: new Date('2024-01-10'), amount: 500, category: 'Aluguel', description: 'Aluguel janeiro' },
    { id: 'e2', date: new Date('2024-01-15'), amount: 200, category: 'Material', description: 'Compra tecido' },
    { id: 'e3', date: new Date('2024-01-20'), amount: 100, category: 'Energia', description: 'Conta de luz' },
    { id: 'e4', date: new Date('2024-02-01'), amount: 500, category: 'Aluguel', description: 'Aluguel fevereiro' },
  ];

  describe('Sales Reports', () => {
    const filterSalesByPeriod = (startDate: Date, endDate: Date): Sale[] => {
      return sales.filter(s => s.date >= startDate && s.date <= endDate);
    };

    const calculateTotalSales = (filteredSales: Sale[]): number => {
      return filteredSales.reduce((sum, s) => sum + s.total, 0);
    };

    const groupSalesByPaymentMethod = (filteredSales: Sale[]): Record<string, number> => {
      return filteredSales.reduce((acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
        return acc;
      }, {} as Record<string, number>);
    };

    const groupSalesBySeller = (filteredSales: Sale[]): Record<string, { count: number; total: number }> => {
      return filteredSales.reduce((acc, sale) => {
        const seller = sale.sellerName || 'Sem vendedor';
        if (!acc[seller]) {
          acc[seller] = { count: 0, total: 0 };
        }
        acc[seller].count++;
        acc[seller].total += sale.total;
        return acc;
      }, {} as Record<string, { count: number; total: number }>);
    };

    const getDailySales = (date: Date): { count: number; total: number } => {
      const daySales = sales.filter(s => 
        s.date.toDateString() === date.toDateString()
      );
      return {
        count: daySales.length,
        total: daySales.reduce((sum, s) => sum + s.total, 0),
      };
    };

    it('should filter sales by period', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const filtered = filterSalesByPeriod(startDate, endDate);
      
      expect(filtered).toHaveLength(3);
    });

    it('should calculate total sales', () => {
      const total = calculateTotalSales(sales);
      expect(total).toBe(940);
    });

    it('should group sales by payment method', () => {
      const grouped = groupSalesByPaymentMethod(sales);
      
      expect(grouped['Dinheiro']).toBe(150);
      expect(grouped['Cartão Crédito']).toBe(200);
      expect(grouped['Pix']).toBe(90);
      expect(grouped['Cartão Débito']).toBe(500);
    });

    it('should group sales by seller', () => {
      const grouped = groupSalesBySeller(sales);
      
      expect(grouped['Vendedor 1'].count).toBe(3);
      expect(grouped['Vendedor 1'].total).toBe(850);
      expect(grouped['Vendedor 2'].count).toBe(1);
      expect(grouped['Vendedor 2'].total).toBe(90);
    });

    it('should get daily sales summary', () => {
      const summary = getDailySales(new Date('2024-01-15'));
      
      expect(summary.count).toBe(2);
      expect(summary.total).toBe(350);
    });
  });

  describe('Product Sales Reports', () => {
    const getTopProducts = (limit: number = 5): Array<{ productName: string; quantity: number; revenue: number }> => {
      const productStats: Record<string, { quantity: number; revenue: number }> = {};

      sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!productStats[item.productName]) {
            productStats[item.productName] = { quantity: 0, revenue: 0 };
          }
          productStats[item.productName].quantity += item.quantity;
          productStats[item.productName].revenue += item.quantity * item.unitPrice;
        });
      });

      return Object.entries(productStats)
        .map(([productName, stats]) => ({ productName, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    };

    it('should get top selling products', () => {
      const topProducts = getTopProducts();

      expect(topProducts[0].productName).toBe('Produto A');
      expect(topProducts[0].quantity).toBe(9); // 3 + 2 + 4
      expect(topProducts[0].revenue).toBe(450);
    });

    it('should limit results', () => {
      const topProducts = getTopProducts(2);
      expect(topProducts).toHaveLength(2);
    });
  });

  describe('Financial Reports', () => {
    const calculateProfit = (
      salesData: Sale[],
      expensesData: Expense[],
      startDate: Date,
      endDate: Date
    ): { revenue: number; expenses: number; profit: number; margin: number } => {
      const periodSales = salesData.filter(s => s.date >= startDate && s.date <= endDate);
      const periodExpenses = expensesData.filter(e => e.date >= startDate && e.date <= endDate);

      const revenue = periodSales.reduce((sum, s) => sum + s.total, 0);
      const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
      const profit = revenue - totalExpenses;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return { revenue, expenses: totalExpenses, profit, margin };
    };

    const getExpensesByCategory = (
      expensesData: Expense[],
      startDate: Date,
      endDate: Date
    ): Record<string, number> => {
      const periodExpenses = expensesData.filter(e => e.date >= startDate && e.date <= endDate);
      
      return periodExpenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {} as Record<string, number>);
    };

    it('should calculate monthly profit', () => {
      const result = calculateProfit(
        sales,
        expenses,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result.revenue).toBe(440); // Sales in January
      expect(result.expenses).toBe(800); // Expenses in January
      expect(result.profit).toBe(-360);
    });

    it('should calculate profit margin', () => {
      const result = calculateProfit(
        sales,
        expenses,
        new Date('2024-02-01'),
        new Date('2024-02-28')
      );

      expect(result.revenue).toBe(500);
      expect(result.expenses).toBe(500);
      expect(result.profit).toBe(0);
      expect(result.margin).toBe(0);
    });

    it('should group expenses by category', () => {
      const grouped = getExpensesByCategory(
        expenses,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(grouped['Aluguel']).toBe(500);
      expect(grouped['Material']).toBe(200);
      expect(grouped['Energia']).toBe(100);
    });
  });

  describe('Cash Flow Report', () => {
    interface CashFlowEntry {
      date: Date;
      type: 'in' | 'out';
      amount: number;
      description: string;
    }

    const generateCashFlow = (
      salesData: Sale[],
      expensesData: Expense[],
      startDate: Date,
      endDate: Date
    ): CashFlowEntry[] => {
      const entries: CashFlowEntry[] = [];

      // Add sales as income
      salesData
        .filter(s => s.date >= startDate && s.date <= endDate)
        .forEach(sale => {
          entries.push({
            date: sale.date,
            type: 'in',
            amount: sale.total,
            description: `Venda #${sale.id}`,
          });
        });

      // Add expenses as outflow
      expensesData
        .filter(e => e.date >= startDate && e.date <= endDate)
        .forEach(expense => {
          entries.push({
            date: expense.date,
            type: 'out',
            amount: expense.amount,
            description: expense.description,
          });
        });

      // Sort by date
      return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    const calculateRunningBalance = (entries: CashFlowEntry[], initialBalance: number = 0): number[] => {
      let balance = initialBalance;
      return entries.map(entry => {
        balance += entry.type === 'in' ? entry.amount : -entry.amount;
        return balance;
      });
    };

    it('should generate cash flow entries', () => {
      const cashFlow = generateCashFlow(
        sales,
        expenses,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(cashFlow.length).toBe(6); // 3 sales + 3 expenses in January
      expect(cashFlow[0].date.getTime()).toBeLessThanOrEqual(cashFlow[cashFlow.length - 1].date.getTime());
    });

    it('should calculate running balance', () => {
      const entries: CashFlowEntry[] = [
        { date: new Date('2024-01-01'), type: 'in', amount: 1000, description: 'Entrada inicial' },
        { date: new Date('2024-01-05'), type: 'out', amount: 500, description: 'Aluguel' },
        { date: new Date('2024-01-10'), type: 'in', amount: 300, description: 'Venda' },
        { date: new Date('2024-01-15'), type: 'out', amount: 100, description: 'Material' },
      ];

      const balances = calculateRunningBalance(entries, 500);

      expect(balances[0]).toBe(1500); // 500 + 1000
      expect(balances[1]).toBe(1000); // 1500 - 500
      expect(balances[2]).toBe(1300); // 1000 + 300
      expect(balances[3]).toBe(1200); // 1300 - 100
    });
  });

  describe('Period Comparison', () => {
    const comparePeriods = (
      salesData: Sale[],
      period1Start: Date,
      period1End: Date,
      period2Start: Date,
      period2End: Date
    ): { period1Total: number; period2Total: number; change: number; changePercent: number } => {
      const period1Sales = salesData.filter(s => s.date >= period1Start && s.date <= period1End);
      const period2Sales = salesData.filter(s => s.date >= period2Start && s.date <= period2End);

      const period1Total = period1Sales.reduce((sum, s) => sum + s.total, 0);
      const period2Total = period2Sales.reduce((sum, s) => sum + s.total, 0);
      const change = period2Total - period1Total;
      const changePercent = period1Total > 0 ? (change / period1Total) * 100 : 0;

      return { period1Total, period2Total, change, changePercent };
    };

    it('should compare two periods', () => {
      const comparison = comparePeriods(
        sales,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        new Date('2024-02-01'),
        new Date('2024-02-28')
      );

      expect(comparison.period1Total).toBe(440);
      expect(comparison.period2Total).toBe(500);
      expect(comparison.change).toBe(60);
      expect(comparison.changePercent).toBeCloseTo(13.64, 1);
    });
  });
});
