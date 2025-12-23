import { describe, it, expect, beforeEach } from 'vitest';

// Stock Management Flow Integration Tests
describe('Stock Management Flow', () => {
  interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
    pricingMode: 'fixed' | 'variable';
    variations?: Array<{ name: string; price: number }>;
  }

  interface StockMovement {
    id: string;
    productId: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    previousStock: number;
    newStock: number;
    reason?: string;
    createdAt: Date;
  }

  let products: Product[] = [];
  let movements: StockMovement[] = [];

  beforeEach(() => {
    products = [];
    movements = [];
  });

  // Helper functions
  const addProduct = (product: Omit<Product, 'id'>): Product => {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    products.push(newProduct);
    return newProduct;
  };

  const recordStockMovement = (
    productId: string,
    type: 'in' | 'out' | 'adjustment',
    quantity: number,
    reason?: string
  ): StockMovement | null => {
    const product = products.find(p => p.id === productId);
    if (!product) return null;

    const previousStock = product.stock;
    let newStock: number;

    switch (type) {
      case 'in':
        newStock = previousStock + quantity;
        break;
      case 'out':
        if (quantity > previousStock) return null; // Prevent negative stock
        newStock = previousStock - quantity;
        break;
      case 'adjustment':
        newStock = quantity; // Direct adjustment to specific value
        break;
    }

    product.stock = newStock;

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId,
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      createdAt: new Date(),
    };

    movements.push(movement);
    return movement;
  };

  const getLowStockProducts = (threshold: number): Product[] => {
    return products.filter(p => p.stock <= threshold);
  };

  const getStockValue = (): number => {
    return products.reduce((total, p) => total + p.stock * p.price, 0);
  };

  const getMovementHistory = (productId: string): StockMovement[] => {
    return movements
      .filter(m => m.productId === productId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  describe('Stock Movements', () => {
    it('should record stock entry', () => {
      const product = addProduct({
        name: 'Camiseta',
        price: 50,
        stock: 10,
        category: 'Roupas',
        pricingMode: 'fixed',
      });

      const movement = recordStockMovement(product.id, 'in', 20, 'Compra fornecedor');

      expect(movement).not.toBeNull();
      expect(movement?.previousStock).toBe(10);
      expect(movement?.newStock).toBe(30);
      expect(product.stock).toBe(30);
    });

    it('should record stock exit', () => {
      const product = addProduct({
        name: 'Calça',
        price: 80,
        stock: 15,
        category: 'Roupas',
        pricingMode: 'fixed',
      });

      const movement = recordStockMovement(product.id, 'out', 5, 'Venda');

      expect(movement?.newStock).toBe(10);
      expect(product.stock).toBe(10);
    });

    it('should prevent negative stock', () => {
      const product = addProduct({
        name: 'Produto',
        price: 100,
        stock: 5,
        category: 'Geral',
        pricingMode: 'fixed',
      });

      const movement = recordStockMovement(product.id, 'out', 10);

      expect(movement).toBeNull();
      expect(product.stock).toBe(5); // Stock unchanged
    });

    it('should handle stock adjustment', () => {
      const product = addProduct({
        name: 'Produto',
        price: 30,
        stock: 100,
        category: 'Geral',
        pricingMode: 'fixed',
      });

      const movement = recordStockMovement(product.id, 'adjustment', 50, 'Inventário');

      expect(movement?.previousStock).toBe(100);
      expect(movement?.newStock).toBe(50);
      expect(product.stock).toBe(50);
    });

    it('should return null for non-existent product', () => {
      const movement = recordStockMovement('non-existent', 'in', 10);
      expect(movement).toBeNull();
    });
  });

  describe('Stock Queries', () => {
    beforeEach(() => {
      addProduct({ name: 'A', price: 10, stock: 5, category: 'Cat1', pricingMode: 'fixed' });
      addProduct({ name: 'B', price: 20, stock: 15, category: 'Cat1', pricingMode: 'fixed' });
      addProduct({ name: 'C', price: 30, stock: 3, category: 'Cat2', pricingMode: 'fixed' });
      addProduct({ name: 'D', price: 40, stock: 0, category: 'Cat2', pricingMode: 'fixed' });
    });

    it('should get low stock products', () => {
      const lowStock = getLowStockProducts(5);
      
      expect(lowStock).toHaveLength(3); // A(5), C(3), D(0)
      expect(lowStock.map(p => p.name)).toContain('A');
      expect(lowStock.map(p => p.name)).toContain('C');
      expect(lowStock.map(p => p.name)).toContain('D');
    });

    it('should calculate total stock value', () => {
      const value = getStockValue();
      
      // (5*10) + (15*20) + (3*30) + (0*40) = 50 + 300 + 90 + 0 = 440
      expect(value).toBe(440);
    });

    it('should get movement history for product', () => {
      const product = products[0];
      
      recordStockMovement(product.id, 'in', 10);
      recordStockMovement(product.id, 'out', 3);
      recordStockMovement(product.id, 'in', 5);

      const history = getMovementHistory(product.id);
      
      expect(history).toHaveLength(3);
      expect(history[0].type).toBe('in'); // Most recent first
    });
  });

  describe('Sale Stock Deduction', () => {
    it('should deduct stock after sale', () => {
      const product1 = addProduct({
        name: 'Produto 1',
        price: 50,
        stock: 20,
        category: 'Cat',
        pricingMode: 'fixed',
      });
      const product2 = addProduct({
        name: 'Produto 2',
        price: 30,
        stock: 15,
        category: 'Cat',
        pricingMode: 'fixed',
      });

      // Simulate sale with cart items
      const cart = [
        { productId: product1.id, quantity: 3 },
        { productId: product2.id, quantity: 2 },
      ];

      // Process sale
      cart.forEach(item => {
        recordStockMovement(item.productId, 'out', item.quantity, 'Venda');
      });

      expect(product1.stock).toBe(17);
      expect(product2.stock).toBe(13);
    });

    it('should validate stock before sale', () => {
      const product = addProduct({
        name: 'Produto',
        price: 100,
        stock: 2,
        category: 'Cat',
        pricingMode: 'fixed',
      });

      const hasStock = (productId: string, quantity: number): boolean => {
        const prod = products.find(p => p.id === productId);
        return prod ? prod.stock >= quantity : false;
      };

      expect(hasStock(product.id, 2)).toBe(true);
      expect(hasStock(product.id, 3)).toBe(false);
    });
  });

  describe('Complete Stock Flow', () => {
    it('should handle complete inventory cycle', () => {
      // Create product with initial stock
      const product = addProduct({
        name: 'Camiseta Branca',
        price: 79.90,
        stock: 50,
        category: 'Camisetas',
        pricingMode: 'fixed',
      });

      // Receive shipment
      recordStockMovement(product.id, 'in', 100, 'Recebimento fornecedor');
      expect(product.stock).toBe(150);

      // Multiple sales
      recordStockMovement(product.id, 'out', 5, 'Venda #1001');
      recordStockMovement(product.id, 'out', 3, 'Venda #1002');
      recordStockMovement(product.id, 'out', 10, 'Venda #1003');
      expect(product.stock).toBe(132);

      // Inventory adjustment (found discrepancy)
      recordStockMovement(product.id, 'adjustment', 130, 'Ajuste inventário');
      expect(product.stock).toBe(130);

      // Return from customer
      recordStockMovement(product.id, 'in', 2, 'Devolução cliente');
      expect(product.stock).toBe(132);

      // Verify movement history
      const history = getMovementHistory(product.id);
      expect(history).toHaveLength(6);
    });
  });
});

describe('Product Variations Stock', () => {
  interface ProductWithVariationStock {
    id: string;
    name: string;
    variations: Array<{
      name: string;
      price: number;
      stock: number;
    }>;
  }

  it('should track stock per variation', () => {
    const product: ProductWithVariationStock = {
      id: '1',
      name: 'Camiseta',
      variations: [
        { name: 'P', price: 50, stock: 10 },
        { name: 'M', price: 50, stock: 15 },
        { name: 'G', price: 55, stock: 8 },
      ],
    };

    const deductVariationStock = (variationName: string, quantity: number): boolean => {
      const variation = product.variations.find(v => v.name === variationName);
      if (!variation || variation.stock < quantity) return false;
      variation.stock -= quantity;
      return true;
    };

    const getTotalStock = (): number => {
      return product.variations.reduce((sum, v) => sum + v.stock, 0);
    };

    expect(getTotalStock()).toBe(33);

    expect(deductVariationStock('M', 5)).toBe(true);
    expect(product.variations.find(v => v.name === 'M')?.stock).toBe(10);

    expect(deductVariationStock('P', 20)).toBe(false); // Not enough stock
    expect(product.variations.find(v => v.name === 'P')?.stock).toBe(10);

    expect(getTotalStock()).toBe(28);
  });
});
