import { describe, it, expect, beforeEach } from 'vitest';

// Service Orders Flow Integration Tests
describe('Service Orders Flow Integration', () => {
  type OrderStatus = 'Pendente' | 'Em Produção' | 'Pronto' | 'Entregue' | 'Cancelado';
  type PaymentStatus = 'Pendente' | 'Parcial' | 'Pago';

  interface OrderItem {
    description: string;
    quantity: number;
    unitPrice: number;
  }

  interface Payment {
    method: string;
    amount: number;
    date: Date;
  }

  interface ServiceOrder {
    id: string;
    customerName: string;
    customerId?: string;
    items: OrderItem[];
    total: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    payments: Payment[];
    amountPaid: number;
    remainingAmount: number;
    deadline?: Date;
    measurements?: string;
    description?: string;
    sellerName?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  let orders: ServiceOrder[] = [];
  let orderIdCounter = 1000;

  beforeEach(() => {
    orders = [];
    orderIdCounter = 1000;
  });

  // Helper functions
  const generateOrderId = (): string => {
    orderIdCounter++;
    return orderIdCounter.toString();
  };

  const createOrder = (
    customerName: string,
    items: OrderItem[],
    options: {
      deadline?: Date;
      measurements?: string;
      description?: string;
      sellerName?: string;
    } = {}
  ): ServiceOrder => {
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    
    const order: ServiceOrder = {
      id: generateOrderId(),
      customerName,
      items,
      total,
      status: 'Pendente',
      paymentStatus: 'Pendente',
      payments: [],
      amountPaid: 0,
      remainingAmount: total,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...options,
    };

    orders.push(order);
    return order;
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus): boolean => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    // Validate status transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      'Pendente': ['Em Produção', 'Cancelado'],
      'Em Produção': ['Pronto', 'Cancelado'],
      'Pronto': ['Entregue', 'Cancelado'],
      'Entregue': [],
      'Cancelado': [],
    };

    if (!validTransitions[order.status].includes(newStatus)) {
      return false;
    }

    order.status = newStatus;
    order.updatedAt = new Date();
    return true;
  };

  const addPayment = (orderId: string, method: string, amount: number): boolean => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;
    if (amount <= 0) return false;
    if (amount > order.remainingAmount) return false;

    order.payments.push({ method, amount, date: new Date() });
    order.amountPaid += amount;
    order.remainingAmount = order.total - order.amountPaid;

    if (order.remainingAmount === 0) {
      order.paymentStatus = 'Pago';
    } else if (order.amountPaid > 0) {
      order.paymentStatus = 'Parcial';
    }

    order.updatedAt = new Date();
    return true;
  };

  const getOrdersByStatus = (status: OrderStatus): ServiceOrder[] => {
    return orders.filter(o => o.status === status);
  };

  const getOrdersByPaymentStatus = (status: PaymentStatus): ServiceOrder[] => {
    return orders.filter(o => o.paymentStatus === status);
  };

  describe('Order Creation', () => {
    it('should create order with correct initial state', () => {
      const order = createOrder('João Silva', [
        { description: 'Conserto de roupa', quantity: 1, unitPrice: 50 },
      ]);

      expect(order.id).toBe('1001');
      expect(order.customerName).toBe('João Silva');
      expect(order.status).toBe('Pendente');
      expect(order.paymentStatus).toBe('Pendente');
      expect(order.total).toBe(50);
      expect(order.amountPaid).toBe(0);
      expect(order.remainingAmount).toBe(50);
    });

    it('should calculate total for multiple items', () => {
      const order = createOrder('Cliente', [
        { description: 'Item A', quantity: 2, unitPrice: 100 },
        { description: 'Item B', quantity: 3, unitPrice: 50 },
      ]);

      expect(order.total).toBe(350); // (2*100) + (3*50)
    });

    it('should include optional fields', () => {
      const deadline = new Date('2024-12-31');
      const order = createOrder('Cliente', [
        { description: 'Serviço', quantity: 1, unitPrice: 100 },
      ], {
        deadline,
        measurements: 'M: 42cm, L: 65cm',
        description: 'Ajuste em vestido',
        sellerName: 'Maria',
      });

      expect(order.deadline).toEqual(deadline);
      expect(order.measurements).toBe('M: 42cm, L: 65cm');
      expect(order.description).toBe('Ajuste em vestido');
      expect(order.sellerName).toBe('Maria');
    });

    it('should generate sequential order IDs', () => {
      const order1 = createOrder('Cliente 1', [{ description: 'A', quantity: 1, unitPrice: 10 }]);
      const order2 = createOrder('Cliente 2', [{ description: 'B', quantity: 1, unitPrice: 20 }]);
      const order3 = createOrder('Cliente 3', [{ description: 'C', quantity: 1, unitPrice: 30 }]);

      expect(parseInt(order2.id)).toBe(parseInt(order1.id) + 1);
      expect(parseInt(order3.id)).toBe(parseInt(order2.id) + 1);
    });
  });

  describe('Order Status Transitions', () => {
    it('should allow valid status transitions', () => {
      const order = createOrder('Cliente', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);

      expect(updateOrderStatus(order.id, 'Em Produção')).toBe(true);
      expect(order.status).toBe('Em Produção');

      expect(updateOrderStatus(order.id, 'Pronto')).toBe(true);
      expect(order.status).toBe('Pronto');

      expect(updateOrderStatus(order.id, 'Entregue')).toBe(true);
      expect(order.status).toBe('Entregue');
    });

    it('should block invalid status transitions', () => {
      const order = createOrder('Cliente', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);

      expect(updateOrderStatus(order.id, 'Pronto')).toBe(false); // Can't skip Em Produção
      expect(order.status).toBe('Pendente');

      expect(updateOrderStatus(order.id, 'Entregue')).toBe(false);
      expect(order.status).toBe('Pendente');
    });

    it('should not allow transitions from Entregue', () => {
      const order = createOrder('Cliente', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);
      
      updateOrderStatus(order.id, 'Em Produção');
      updateOrderStatus(order.id, 'Pronto');
      updateOrderStatus(order.id, 'Entregue');

      expect(updateOrderStatus(order.id, 'Pendente')).toBe(false);
      expect(updateOrderStatus(order.id, 'Cancelado')).toBe(false);
      expect(order.status).toBe('Entregue');
    });

    it('should allow cancellation from any non-final state', () => {
      const order1 = createOrder('Cliente 1', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);
      expect(updateOrderStatus(order1.id, 'Cancelado')).toBe(true);

      const order2 = createOrder('Cliente 2', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);
      updateOrderStatus(order2.id, 'Em Produção');
      expect(updateOrderStatus(order2.id, 'Cancelado')).toBe(true);

      const order3 = createOrder('Cliente 3', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);
      updateOrderStatus(order3.id, 'Em Produção');
      updateOrderStatus(order3.id, 'Pronto');
      expect(updateOrderStatus(order3.id, 'Cancelado')).toBe(true);
    });

    it('should not allow transitions from Cancelado', () => {
      const order = createOrder('Cliente', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);
      updateOrderStatus(order.id, 'Cancelado');

      expect(updateOrderStatus(order.id, 'Pendente')).toBe(false);
      expect(updateOrderStatus(order.id, 'Em Produção')).toBe(false);
      expect(order.status).toBe('Cancelado');
    });
  });

  describe('Payment Processing', () => {
    it('should add payment and update amounts', () => {
      const order = createOrder('Cliente', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);

      expect(addPayment(order.id, 'Dinheiro', 50)).toBe(true);
      expect(order.amountPaid).toBe(50);
      expect(order.remainingAmount).toBe(50);
      expect(order.paymentStatus).toBe('Parcial');
    });

    it('should mark as Pago when fully paid', () => {
      const order = createOrder('Cliente', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);

      addPayment(order.id, 'Pix', 100);

      expect(order.paymentStatus).toBe('Pago');
      expect(order.remainingAmount).toBe(0);
    });

    it('should handle multiple partial payments', () => {
      const order = createOrder('Cliente', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);

      addPayment(order.id, 'Dinheiro', 30);
      addPayment(order.id, 'Pix', 40);
      addPayment(order.id, 'Cartão', 30);

      expect(order.payments).toHaveLength(3);
      expect(order.amountPaid).toBe(100);
      expect(order.paymentStatus).toBe('Pago');
    });

    it('should reject payment greater than remaining amount', () => {
      const order = createOrder('Cliente', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);

      expect(addPayment(order.id, 'Dinheiro', 150)).toBe(false);
      expect(order.amountPaid).toBe(0);
    });

    it('should reject zero or negative payments', () => {
      const order = createOrder('Cliente', [{ description: 'Item', quantity: 1, unitPrice: 100 }]);

      expect(addPayment(order.id, 'Dinheiro', 0)).toBe(false);
      expect(addPayment(order.id, 'Dinheiro', -50)).toBe(false);
    });
  });

  describe('Order Queries', () => {
    beforeEach(() => {
      // Create test orders
      const order1 = createOrder('Cliente 1', [{ description: 'A', quantity: 1, unitPrice: 100 }]);
      const order2 = createOrder('Cliente 2', [{ description: 'B', quantity: 1, unitPrice: 200 }]);
      const order3 = createOrder('Cliente 3', [{ description: 'C', quantity: 1, unitPrice: 150 }]);

      updateOrderStatus(order2.id, 'Em Produção');
      updateOrderStatus(order3.id, 'Em Produção');
      updateOrderStatus(order3.id, 'Pronto');

      addPayment(order2.id, 'Pix', 200);
    });

    it('should filter orders by status', () => {
      expect(getOrdersByStatus('Pendente')).toHaveLength(1);
      expect(getOrdersByStatus('Em Produção')).toHaveLength(1);
      expect(getOrdersByStatus('Pronto')).toHaveLength(1);
      expect(getOrdersByStatus('Entregue')).toHaveLength(0);
    });

    it('should filter orders by payment status', () => {
      expect(getOrdersByPaymentStatus('Pendente')).toHaveLength(2);
      expect(getOrdersByPaymentStatus('Pago')).toHaveLength(1);
    });
  });

  describe('Complete Order Flow', () => {
    it('should complete full order lifecycle', () => {
      // Create order
      const order = createOrder('Maria Santos', [
        { description: 'Ajuste vestido', quantity: 1, unitPrice: 80 },
        { description: 'Bainha calça', quantity: 2, unitPrice: 25 },
      ], {
        deadline: new Date('2024-12-20'),
        measurements: 'Busto: 90cm',
        sellerName: 'Ana',
      });

      expect(order.total).toBe(130);
      expect(order.status).toBe('Pendente');

      // Receive partial payment
      addPayment(order.id, 'Dinheiro', 50);
      expect(order.paymentStatus).toBe('Parcial');

      // Start production
      updateOrderStatus(order.id, 'Em Produção');
      expect(order.status).toBe('Em Produção');

      // Complete production
      updateOrderStatus(order.id, 'Pronto');
      expect(order.status).toBe('Pronto');

      // Receive remaining payment
      addPayment(order.id, 'Pix', 80);
      expect(order.paymentStatus).toBe('Pago');

      // Deliver
      updateOrderStatus(order.id, 'Entregue');
      expect(order.status).toBe('Entregue');

      // Verify final state
      expect(order.payments).toHaveLength(2);
      expect(order.amountPaid).toBe(130);
      expect(order.remainingAmount).toBe(0);
    });

    it('should handle order cancellation with partial payment', () => {
      const order = createOrder('Cliente', [{ description: 'Serviço', quantity: 1, unitPrice: 200 }]);

      addPayment(order.id, 'Dinheiro', 100);
      updateOrderStatus(order.id, 'Cancelado');

      expect(order.status).toBe('Cancelado');
      expect(order.amountPaid).toBe(100); // Payment records maintained for refund
    });
  });
});

describe('Order Kanban View', () => {
  type KanbanColumn = 'Pendente' | 'Em Produção' | 'Pronto' | 'Entregue';

  interface KanbanOrder {
    id: string;
    customerName: string;
    total: number;
    status: KanbanColumn;
  }

  const organizeByKanban = (orders: KanbanOrder[]): Record<KanbanColumn, KanbanOrder[]> => {
    const columns: Record<KanbanColumn, KanbanOrder[]> = {
      'Pendente': [],
      'Em Produção': [],
      'Pronto': [],
      'Entregue': [],
    };

    orders.forEach(order => {
      if (columns[order.status]) {
        columns[order.status].push(order);
      }
    });

    return columns;
  };

  it('should organize orders into kanban columns', () => {
    const orders: KanbanOrder[] = [
      { id: '1', customerName: 'A', total: 100, status: 'Pendente' },
      { id: '2', customerName: 'B', total: 200, status: 'Em Produção' },
      { id: '3', customerName: 'C', total: 150, status: 'Em Produção' },
      { id: '4', customerName: 'D', total: 300, status: 'Pronto' },
      { id: '5', customerName: 'E', total: 250, status: 'Entregue' },
    ];

    const kanban = organizeByKanban(orders);

    expect(kanban['Pendente']).toHaveLength(1);
    expect(kanban['Em Produção']).toHaveLength(2);
    expect(kanban['Pronto']).toHaveLength(1);
    expect(kanban['Entregue']).toHaveLength(1);
  });

  it('should handle empty columns', () => {
    const orders: KanbanOrder[] = [
      { id: '1', customerName: 'A', total: 100, status: 'Pendente' },
    ];

    const kanban = organizeByKanban(orders);

    expect(kanban['Pendente']).toHaveLength(1);
    expect(kanban['Em Produção']).toHaveLength(0);
    expect(kanban['Pronto']).toHaveLength(0);
    expect(kanban['Entregue']).toHaveLength(0);
  });
});
