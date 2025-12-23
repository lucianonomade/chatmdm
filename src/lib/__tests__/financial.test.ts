import { describe, it, expect } from 'vitest';

describe('Financial Calculations', () => {
  describe('Sales Totals', () => {
    const calculateDailySales = (orders: { total: number; createdAt: string }[], date: Date) => {
      const dateStr = date.toDateString();
      return orders
        .filter(o => new Date(o.createdAt).toDateString() === dateStr)
        .reduce((sum, o) => sum + o.total, 0);
    };

    it('calculates daily sales correctly', () => {
      const today = new Date();
      const orders = [
        { total: 100, createdAt: today.toISOString() },
        { total: 200, createdAt: today.toISOString() },
        { total: 50, createdAt: new Date('2020-01-01').toISOString() },
      ];

      expect(calculateDailySales(orders, today)).toBe(300);
    });

    it('returns zero for no sales', () => {
      const orders: { total: number; createdAt: string }[] = [];
      expect(calculateDailySales(orders, new Date())).toBe(0);
    });
  });

  describe('Expense Calculations', () => {
    const calculateTotalExpenses = (expenses: { amount: number }[]) => {
      return expenses.reduce((sum, e) => sum + e.amount, 0);
    };

    const calculateNetProfit = (revenue: number, expenses: number) => {
      return revenue - expenses;
    };

    it('calculates total expenses', () => {
      const expenses = [{ amount: 100 }, { amount: 200 }, { amount: 50 }];
      expect(calculateTotalExpenses(expenses)).toBe(350);
    });

    it('calculates net profit', () => {
      expect(calculateNetProfit(1000, 300)).toBe(700);
      expect(calculateNetProfit(500, 600)).toBe(-100);
    });
  });

  describe('Receivables', () => {
    const calculateTotalReceivables = (orders: { remainingAmount: number }[]) => {
      return orders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
    };

    const getOverduePayments = (
      orders: { remainingAmount: number; deadline?: string }[]
    ) => {
      const now = new Date();
      return orders.filter(o => 
        o.remainingAmount > 0 && 
        o.deadline && 
        new Date(o.deadline) < now
      );
    };

    it('calculates total receivables', () => {
      const orders = [
        { remainingAmount: 100 },
        { remainingAmount: 200 },
        { remainingAmount: 0 },
      ];
      expect(calculateTotalReceivables(orders)).toBe(300);
    });

    it('identifies overdue payments', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const orders = [
        { remainingAmount: 100, deadline: pastDate.toISOString() },
        { remainingAmount: 200, deadline: futureDate.toISOString() },
        { remainingAmount: 0, deadline: pastDate.toISOString() },
      ];

      const overdue = getOverduePayments(orders);
      expect(overdue).toHaveLength(1);
      expect(overdue[0].remainingAmount).toBe(100);
    });
  });

  describe('Fixed Expenses', () => {
    const calculateMonthlyFixedExpenses = (
      fixedExpenses: { amount: number; active: boolean }[]
    ) => {
      return fixedExpenses
        .filter(e => e.active)
        .reduce((sum, e) => sum + e.amount, 0);
    };

    const getExpensesDueToday = (
      fixedExpenses: { dueDay: number; active: boolean }[]
    ) => {
      const today = new Date().getDate();
      return fixedExpenses.filter(e => e.active && e.dueDay === today);
    };

    it('calculates monthly fixed expenses', () => {
      const expenses = [
        { amount: 1000, active: true },
        { amount: 500, active: true },
        { amount: 200, active: false },
      ];
      expect(calculateMonthlyFixedExpenses(expenses)).toBe(1500);
    });

    it('filters out inactive expenses', () => {
      const expenses = [
        { amount: 1000, active: false },
        { amount: 500, active: false },
      ];
      expect(calculateMonthlyFixedExpenses(expenses)).toBe(0);
    });

    it('finds expenses due today', () => {
      const today = new Date().getDate();
      const expenses = [
        { dueDay: today, active: true },
        { dueDay: today, active: false },
        { dueDay: 15, active: true },
      ];
      expect(getExpensesDueToday(expenses)).toHaveLength(1);
    });
  });
});

describe('Report Calculations', () => {
  describe('Period Filtering', () => {
    const filterByPeriod = (
      data: { createdAt: string }[],
      period: 'week' | 'month' | 'year'
    ) => {
      const now = new Date();
      const cutoff = new Date();

      switch (period) {
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
      }

      return data.filter(d => new Date(d.createdAt) >= cutoff);
    };

    it('filters last week data', () => {
      const now = new Date();
      const recentDate = new Date();
      recentDate.setDate(now.getDate() - 3);
      
      const oldDate = new Date();
      oldDate.setDate(now.getDate() - 10);

      const data = [
        { createdAt: recentDate.toISOString() },
        { createdAt: oldDate.toISOString() },
      ];

      expect(filterByPeriod(data, 'week')).toHaveLength(1);
    });

    it('filters last month data', () => {
      const now = new Date();
      const recentDate = new Date();
      recentDate.setDate(now.getDate() - 15);
      
      const oldDate = new Date();
      oldDate.setMonth(now.getMonth() - 2);

      const data = [
        { createdAt: recentDate.toISOString() },
        { createdAt: oldDate.toISOString() },
      ];

      expect(filterByPeriod(data, 'month')).toHaveLength(1);
    });
  });

  describe('Aggregations', () => {
    const groupByPaymentMethod = (orders: { paymentMethod: string; total: number }[]) => {
      const result: Record<string, number> = {};
      
      orders.forEach(order => {
        const method = order.paymentMethod || 'unknown';
        result[method] = (result[method] || 0) + order.total;
      });

      return result;
    };

    const groupByStatus = (orders: { status: string }[]) => {
      const result: Record<string, number> = {};
      
      orders.forEach(order => {
        result[order.status] = (result[order.status] || 0) + 1;
      });

      return result;
    };

    it('groups by payment method', () => {
      const orders = [
        { paymentMethod: 'cash', total: 100 },
        { paymentMethod: 'card', total: 200 },
        { paymentMethod: 'cash', total: 50 },
      ];

      const grouped = groupByPaymentMethod(orders);
      expect(grouped.cash).toBe(150);
      expect(grouped.card).toBe(200);
    });

    it('groups by status', () => {
      const orders = [
        { status: 'pending' },
        { status: 'production' },
        { status: 'pending' },
        { status: 'finished' },
      ];

      const grouped = groupByStatus(orders);
      expect(grouped.pending).toBe(2);
      expect(grouped.production).toBe(1);
      expect(grouped.finished).toBe(1);
    });
  });
});
