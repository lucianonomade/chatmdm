import { describe, it, expect, beforeEach } from 'vitest';

// Customer Management Flow Integration Tests
describe('Customer Management Flow', () => {
  interface Customer {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    doc?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  let customers: Customer[] = [];

  beforeEach(() => {
    customers = [];
  });

  // Helper functions
  const addCustomer = (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Customer => {
    const customer: Customer = {
      ...data,
      id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    customers.push(customer);
    return customer;
  };

  const updateCustomer = (id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>): Customer | null => {
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return null;

    customers[index] = {
      ...customers[index],
      ...updates,
      updatedAt: new Date(),
    };
    return customers[index];
  };

  const deleteCustomer = (id: string): boolean => {
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return false;
    customers.splice(index, 1);
    return true;
  };

  const searchCustomers = (query: string): Customer[] => {
    const lowerQuery = query.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.phone?.includes(query) ||
      c.email?.toLowerCase().includes(lowerQuery) ||
      c.doc?.includes(query)
    );
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cleaned[10]);
  };

  const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  describe('Customer CRUD Operations', () => {
    it('should add a new customer', () => {
      const customer = addCustomer({
        name: 'João Silva',
        phone: '11999998888',
        email: 'joao@email.com',
      });

      expect(customer.id).toBeDefined();
      expect(customer.name).toBe('João Silva');
      expect(customers).toHaveLength(1);
    });

    it('should update customer data', () => {
      const customer = addCustomer({ name: 'Maria' });
      
      const updated = updateCustomer(customer.id, {
        name: 'Maria Santos',
        phone: '11988887777',
      });

      expect(updated?.name).toBe('Maria Santos');
      expect(updated?.phone).toBe('11988887777');
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(customer.createdAt.getTime());
    });

    it('should return null when updating non-existent customer', () => {
      const result = updateCustomer('non-existent', { name: 'Test' });
      expect(result).toBeNull();
    });

    it('should delete customer', () => {
      const customer = addCustomer({ name: 'To Delete' });
      
      expect(deleteCustomer(customer.id)).toBe(true);
      expect(customers).toHaveLength(0);
    });

    it('should return false when deleting non-existent customer', () => {
      expect(deleteCustomer('non-existent')).toBe(false);
    });
  });

  describe('Customer Search', () => {
    beforeEach(() => {
      addCustomer({ name: 'João Silva', phone: '11999998888', email: 'joao@email.com' });
      addCustomer({ name: 'Maria Santos', phone: '11988887777', email: 'maria@email.com' });
      addCustomer({ name: 'José Oliveira', phone: '21977776666' });
      addCustomer({ name: 'Ana Souza', doc: '12345678901' });
    });

    it('should search by name', () => {
      const results = searchCustomers('João');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('João Silva');
    });

    it('should search case-insensitive', () => {
      const results = searchCustomers('MARIA');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Maria Santos');
    });

    it('should search by phone', () => {
      const results = searchCustomers('99999');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('João Silva');
    });

    it('should search by email', () => {
      const results = searchCustomers('maria@');
      expect(results).toHaveLength(1);
    });

    it('should search by document', () => {
      const results = searchCustomers('12345678901');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Ana Souza');
    });

    it('should return empty array for no matches', () => {
      const results = searchCustomers('xyz123');
      expect(results).toHaveLength(0);
    });

    it('should return multiple matches', () => {
      addCustomer({ name: 'João Pedro' });
      const results = searchCustomers('João');
      expect(results).toHaveLength(2);
    });
  });

  describe('Validation', () => {
    describe('Phone Validation', () => {
      it('should validate correct phone numbers', () => {
        expect(validatePhone('11999998888')).toBe(true);
        expect(validatePhone('1199998888')).toBe(true);
        expect(validatePhone('(11) 99999-8888')).toBe(true);
      });

      it('should reject invalid phone numbers', () => {
        expect(validatePhone('123')).toBe(false);
        expect(validatePhone('123456789012')).toBe(false);
      });
    });

    describe('Email Validation', () => {
      it('should validate correct emails', () => {
        expect(validateEmail('user@example.com')).toBe(true);
        expect(validateEmail('user.name@domain.com.br')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(validateEmail('invalid')).toBe(false);
        expect(validateEmail('user@')).toBe(false);
        expect(validateEmail('@domain.com')).toBe(false);
      });
    });

    describe('CPF Validation', () => {
      it('should validate correct CPFs', () => {
        expect(validateCPF('529.982.247-25')).toBe(true);
        expect(validateCPF('52998224725')).toBe(true);
      });

      it('should reject invalid CPFs', () => {
        expect(validateCPF('111.111.111-11')).toBe(false);
        expect(validateCPF('123.456.789-00')).toBe(false);
        expect(validateCPF('123')).toBe(false);
      });
    });
  });

  describe('Formatting', () => {
    it('should format phone with 11 digits', () => {
      expect(formatPhone('11999998888')).toBe('(11) 99999-8888');
    });

    it('should format phone with 10 digits', () => {
      expect(formatPhone('1199998888')).toBe('(11) 9999-8888');
    });

    it('should return original for invalid format', () => {
      expect(formatPhone('123')).toBe('123');
    });
  });

  describe('Complete Customer Flow', () => {
    it('should manage customer lifecycle', () => {
      // Create customer
      const customer = addCustomer({
        name: 'Cliente Teste',
        phone: '11999990000',
        email: 'teste@email.com',
      });
      expect(customers).toHaveLength(1);

      // Search for customer
      let results = searchCustomers('Teste');
      expect(results).toHaveLength(1);

      // Update customer
      updateCustomer(customer.id, {
        name: 'Cliente Teste Atualizado',
        notes: 'Cliente VIP',
      });
      expect(customers[0].name).toBe('Cliente Teste Atualizado');

      // Search again
      results = searchCustomers('Atualizado');
      expect(results).toHaveLength(1);

      // Delete customer
      deleteCustomer(customer.id);
      expect(customers).toHaveLength(0);
    });
  });
});

describe('Customer-Order Relationship', () => {
  interface CustomerWithOrders {
    id: string;
    name: string;
    orderCount: number;
    totalSpent: number;
    lastOrderDate?: Date;
  }

  const calculateCustomerStats = (
    customerId: string,
    orders: Array<{ customerId: string; total: number; createdAt: Date }>
  ): CustomerWithOrders | null => {
    const customerOrders = orders.filter(o => o.customerId === customerId);
    
    if (customerOrders.length === 0) {
      return null;
    }

    const sortedOrders = [...customerOrders].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return {
      id: customerId,
      name: '', // Would be fetched from customer data
      orderCount: customerOrders.length,
      totalSpent: customerOrders.reduce((sum, o) => sum + o.total, 0),
      lastOrderDate: sortedOrders[0].createdAt,
    };
  };

  it('should calculate customer statistics', () => {
    const orders = [
      { customerId: 'c1', total: 100, createdAt: new Date('2024-01-01') },
      { customerId: 'c1', total: 200, createdAt: new Date('2024-02-01') },
      { customerId: 'c1', total: 150, createdAt: new Date('2024-03-01') },
      { customerId: 'c2', total: 300, createdAt: new Date('2024-01-15') },
    ];

    const stats = calculateCustomerStats('c1', orders);

    expect(stats?.orderCount).toBe(3);
    expect(stats?.totalSpent).toBe(450);
    expect(stats?.lastOrderDate).toEqual(new Date('2024-03-01'));
  });

  it('should return null for customer with no orders', () => {
    const stats = calculateCustomerStats('c3', []);
    expect(stats).toBeNull();
  });
});
