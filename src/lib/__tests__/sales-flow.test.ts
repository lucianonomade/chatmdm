import { describe, it, expect, beforeEach } from 'vitest';

// Sales Flow Integration Tests
describe('Sales Flow Integration', () => {
  // Cart state simulation
  let cart: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    variation?: string;
  }>;

  beforeEach(() => {
    cart = [];
  });

  // Helper functions
  const addToCart = (product: { id: string; name: string; price: number; variation?: string }) => {
    const existingIndex = cart.findIndex(
      item => item.id === product.id && item.variation === product.variation
    );
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
  };

  const removeFromCart = (productId: string, variation?: string) => {
    const index = cart.findIndex(
      item => item.id === productId && item.variation === variation
    );
    if (index >= 0) {
      cart.splice(index, 1);
    }
  };

  const updateQuantity = (productId: string, quantity: number, variation?: string) => {
    const item = cart.find(
      item => item.id === productId && item.variation === variation
    );
    if (item) {
      item.quantity = Math.max(0, quantity);
      if (item.quantity === 0) {
        removeFromCart(productId, variation);
      }
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const applyDiscount = (subtotal: number, discountPercent: number) => {
    return subtotal * (1 - discountPercent / 100);
  };

  const processPayment = (
    total: number,
    payments: Array<{ method: string; amount: number }>
  ) => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      success: totalPaid >= total,
      change: Math.max(0, totalPaid - total),
      remaining: Math.max(0, total - totalPaid),
    };
  };

  describe('Cart Operations', () => {
    it('should add product to empty cart', () => {
      addToCart({ id: '1', name: 'Product A', price: 50 });
      
      expect(cart).toHaveLength(1);
      expect(cart[0].quantity).toBe(1);
      expect(cart[0].name).toBe('Product A');
    });

    it('should increment quantity when adding same product', () => {
      addToCart({ id: '1', name: 'Product A', price: 50 });
      addToCart({ id: '1', name: 'Product A', price: 50 });
      
      expect(cart).toHaveLength(1);
      expect(cart[0].quantity).toBe(2);
    });

    it('should treat same product with different variations as separate items', () => {
      addToCart({ id: '1', name: 'T-Shirt', price: 50, variation: 'M' });
      addToCart({ id: '1', name: 'T-Shirt', price: 50, variation: 'G' });
      
      expect(cart).toHaveLength(2);
      expect(cart[0].variation).toBe('M');
      expect(cart[1].variation).toBe('G');
    });

    it('should remove product from cart', () => {
      addToCart({ id: '1', name: 'Product A', price: 50 });
      addToCart({ id: '2', name: 'Product B', price: 30 });
      
      removeFromCart('1');
      
      expect(cart).toHaveLength(1);
      expect(cart[0].id).toBe('2');
    });

    it('should update quantity correctly', () => {
      addToCart({ id: '1', name: 'Product A', price: 50 });
      
      updateQuantity('1', 5);
      
      expect(cart[0].quantity).toBe(5);
    });

    it('should remove item when quantity is set to 0', () => {
      addToCart({ id: '1', name: 'Product A', price: 50 });
      
      updateQuantity('1', 0);
      
      expect(cart).toHaveLength(0);
    });

    it('should not allow negative quantities', () => {
      addToCart({ id: '1', name: 'Product A', price: 50 });
      
      updateQuantity('1', -5);
      
      expect(cart).toHaveLength(0);
    });
  });

  describe('Price Calculations', () => {
    it('should calculate subtotal correctly', () => {
      addToCart({ id: '1', name: 'Product A', price: 50 });
      addToCart({ id: '2', name: 'Product B', price: 30 });
      updateQuantity('1', 2);
      
      expect(calculateSubtotal()).toBe(130); // (50*2) + (30*1)
    });

    it('should apply percentage discount correctly', () => {
      const subtotal = 100;
      
      expect(applyDiscount(subtotal, 10)).toBe(90);
      expect(applyDiscount(subtotal, 50)).toBe(50);
      expect(applyDiscount(subtotal, 0)).toBe(100);
    });

    it('should handle 100% discount', () => {
      const subtotal = 100;
      
      expect(applyDiscount(subtotal, 100)).toBe(0);
    });

    it('should calculate complex cart correctly', () => {
      addToCart({ id: '1', name: 'Camiseta', price: 89.90 });
      addToCart({ id: '2', name: 'Calça', price: 159.90 });
      addToCart({ id: '3', name: 'Tênis', price: 299.90 });
      updateQuantity('1', 3);
      
      const subtotal = calculateSubtotal();
      expect(subtotal).toBeCloseTo(729.50, 2); // (89.90*3) + 159.90 + 299.90
    });
  });

  describe('Payment Processing', () => {
    it('should process exact payment successfully', () => {
      const result = processPayment(100, [{ method: 'Dinheiro', amount: 100 }]);
      
      expect(result.success).toBe(true);
      expect(result.change).toBe(0);
      expect(result.remaining).toBe(0);
    });

    it('should calculate change for overpayment', () => {
      const result = processPayment(85, [{ method: 'Dinheiro', amount: 100 }]);
      
      expect(result.success).toBe(true);
      expect(result.change).toBe(15);
    });

    it('should reject insufficient payment', () => {
      const result = processPayment(100, [{ method: 'Dinheiro', amount: 50 }]);
      
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(50);
    });

    it('should handle split payments', () => {
      const result = processPayment(150, [
        { method: 'Dinheiro', amount: 50 },
        { method: 'Cartão Débito', amount: 50 },
        { method: 'Pix', amount: 50 },
      ]);
      
      expect(result.success).toBe(true);
      expect(result.change).toBe(0);
    });

    it('should handle split payment with overpayment', () => {
      const result = processPayment(100, [
        { method: 'Cartão', amount: 80 },
        { method: 'Dinheiro', amount: 50 },
      ]);
      
      expect(result.success).toBe(true);
      expect(result.change).toBe(30);
    });
  });

  describe('Complete Sale Flow', () => {
    it('should complete a simple sale', () => {
      // Add products
      addToCart({ id: '1', name: 'Produto', price: 100 });
      
      // Calculate total
      const subtotal = calculateSubtotal();
      expect(subtotal).toBe(100);
      
      // Process payment
      const payment = processPayment(subtotal, [{ method: 'Dinheiro', amount: 100 }]);
      expect(payment.success).toBe(true);
      
      // Clear cart after sale
      cart = [];
      expect(cart).toHaveLength(0);
    });

    it('should complete sale with discount', () => {
      addToCart({ id: '1', name: 'Produto A', price: 100 });
      addToCart({ id: '2', name: 'Produto B', price: 50 });
      
      const subtotal = calculateSubtotal();
      const total = applyDiscount(subtotal, 10);
      
      expect(total).toBe(135); // 150 - 10%
      
      const payment = processPayment(total, [{ method: 'Pix', amount: 135 }]);
      expect(payment.success).toBe(true);
    });

    it('should complete sale with multiple items and quantities', () => {
      addToCart({ id: '1', name: 'Camiseta', price: 79.90 });
      addToCart({ id: '1', name: 'Camiseta', price: 79.90 });
      addToCart({ id: '1', name: 'Camiseta', price: 79.90 });
      addToCart({ id: '2', name: 'Bermuda', price: 89.90 });
      updateQuantity('2', 2);
      
      const subtotal = calculateSubtotal();
      expect(subtotal).toBeCloseTo(419.50, 2);
      
      const payment = processPayment(subtotal, [{ method: 'Cartão Crédito', amount: 420 }]);
      expect(payment.success).toBe(true);
      expect(payment.change).toBeCloseTo(0.50, 2);
    });
  });
});

describe('Quote (Orçamento) Flow', () => {
  interface QuoteItem {
    description: string;
    quantity: number;
    unitPrice: number;
  }

  interface Quote {
    id: string;
    customerName: string;
    items: QuoteItem[];
    discount: number;
    createdAt: Date;
    validUntil: Date;
    sellerName: string;
  }

  const createQuote = (
    customerName: string,
    items: QuoteItem[],
    discount: number,
    sellerName: string,
    validDays: number = 30
  ): Quote => {
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + validDays);

    return {
      id: `ORC-${Date.now()}`,
      customerName,
      items,
      discount,
      createdAt: now,
      validUntil,
      sellerName,
    };
  };

  const calculateQuoteTotal = (quote: Quote): number => {
    const subtotal = quote.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    return subtotal * (1 - quote.discount / 100);
  };

  const isQuoteValid = (quote: Quote): boolean => {
    return new Date() <= quote.validUntil;
  };

  it('should create a valid quote', () => {
    const quote = createQuote(
      'João Silva',
      [
        { description: 'Serviço A', quantity: 1, unitPrice: 200 },
        { description: 'Produto B', quantity: 2, unitPrice: 50 },
      ],
      0,
      'Vendedor 1'
    );

    expect(quote.customerName).toBe('João Silva');
    expect(quote.items).toHaveLength(2);
    expect(quote.sellerName).toBe('Vendedor 1');
    expect(isQuoteValid(quote)).toBe(true);
  });

  it('should calculate quote total correctly', () => {
    const quote = createQuote(
      'Cliente',
      [
        { description: 'Item 1', quantity: 2, unitPrice: 100 },
        { description: 'Item 2', quantity: 1, unitPrice: 50 },
      ],
      10,
      'Vendedor'
    );

    const total = calculateQuoteTotal(quote);
    expect(total).toBe(225); // (200 + 50) * 0.9
  });

  it('should convert quote to sale', () => {
    const quote = createQuote(
      'Cliente',
      [{ description: 'Produto', quantity: 1, unitPrice: 100 }],
      0,
      'Vendedor'
    );

    const cart: Array<{ id: string; name: string; price: number; quantity: number }> = [];
    
    // Convert quote items to cart
    quote.items.forEach((item, index) => {
      cart.push({
        id: `quote-item-${index}`,
        name: item.description,
        price: item.unitPrice,
        quantity: item.quantity,
      });
    });

    expect(cart).toHaveLength(1);
    expect(cart[0].name).toBe('Produto');
  });
});
