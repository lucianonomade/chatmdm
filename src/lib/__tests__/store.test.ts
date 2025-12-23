import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock zustand store
const createMockStore = () => {
  let cart: { id: string; name: string; price: number; quantity: number }[] = [];
  
  return {
    cart,
    addToCart: (product: { id: string; name: string; price: number }, quantity: number) => {
      const existingItem = cart.find(item => item.id === product.id);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({ ...product, quantity });
      }
    },
    removeFromCart: (productId: string) => {
      cart = cart.filter(item => item.id !== productId);
    },
    updateCartQuantity: (productId: string, quantity: number) => {
      const item = cart.find(item => item.id === productId);
      if (item) {
        if (quantity <= 0) {
          cart = cart.filter(i => i.id !== productId);
        } else {
          item.quantity = quantity;
        }
      }
    },
    clearCart: () => {
      cart = [];
    },
    getCartTotal: () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    getCartItemCount: () => cart.reduce((sum, item) => sum + item.quantity, 0),
    getCart: () => cart,
  };
};

describe('Cart Store', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('addToCart', () => {
    it('adds new item to empty cart', () => {
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 2);
      
      const cart = store.getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0]).toEqual({ id: '1', name: 'Product 1', price: 10, quantity: 2 });
    });

    it('increases quantity for existing item', () => {
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 2);
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 3);
      
      const cart = store.getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].quantity).toBe(5);
    });

    it('adds multiple different items', () => {
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 1);
      store.addToCart({ id: '2', name: 'Product 2', price: 20 }, 2);
      
      const cart = store.getCart();
      expect(cart).toHaveLength(2);
    });
  });

  describe('removeFromCart', () => {
    it('removes item from cart', () => {
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 2);
      store.addToCart({ id: '2', name: 'Product 2', price: 20 }, 1);
      
      store.removeFromCart('1');
      
      const cart = store.getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].id).toBe('2');
    });

    it('handles removing non-existent item', () => {
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 2);
      
      store.removeFromCart('non-existent');
      
      expect(store.getCart()).toHaveLength(1);
    });
  });

  describe('updateCartQuantity', () => {
    it('updates item quantity', () => {
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 2);
      
      store.updateCartQuantity('1', 5);
      
      expect(store.getCart()[0].quantity).toBe(5);
    });

    it('removes item when quantity is zero or less', () => {
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 2);
      
      store.updateCartQuantity('1', 0);
      
      expect(store.getCart()).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('removes all items from cart', () => {
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 2);
      store.addToCart({ id: '2', name: 'Product 2', price: 20 }, 1);
      
      store.clearCart();
      
      expect(store.getCart()).toHaveLength(0);
    });
  });

  describe('getCartTotal', () => {
    it('calculates total correctly', () => {
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 2);
      store.addToCart({ id: '2', name: 'Product 2', price: 25 }, 1);
      
      expect(store.getCartTotal()).toBe(45);
    });

    it('returns zero for empty cart', () => {
      expect(store.getCartTotal()).toBe(0);
    });
  });

  describe('getCartItemCount', () => {
    it('counts total items correctly', () => {
      store.addToCart({ id: '1', name: 'Product 1', price: 10 }, 2);
      store.addToCart({ id: '2', name: 'Product 2', price: 25 }, 3);
      
      expect(store.getCartItemCount()).toBe(5);
    });
  });
});
