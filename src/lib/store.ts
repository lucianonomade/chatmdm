import { create } from 'zustand';
import type {
  CompanySettings,
  Customer,
  Product,
  ProductVariation,
  OrderItem,
  ServiceOrder,
  User,
  Supplier,
  Expense,
  FixedExpense,
} from './types';

// Re-export types for backward compatibility
export type {
  CompanySettings,
  Customer,
  Product,
  ProductVariation,
  OrderItem,
  ServiceOrder,
  User,
  Supplier,
  Expense,
  FixedExpense,
};


// Mock Data - Produtos para Gráfica
const MOCK_SUPPLIERS: Supplier[] = [];

const MOCK_USERS: User[] = [];

const MOCK_CLIENTS: Customer[] = [];

const MOCK_PRODUCTS: Product[] = [
  { 
    id: '1', 
    name: 'Cartão de Visita', 
    category: 'Gráfica',
    subcategory: 'Cartões',
    price: 120.00, 
    stock: 100, 
    type: 'product',
    variations: [
      { id: 'v1', name: 'Simples - Só Frente (1000un)', price: 120.00 },
      { id: 'v2', name: 'Simples - Frente e Verso (1000un)', price: 140.00 },
      { id: 'v3', name: 'Laminação Fosca - Frente e Verso (1000un)', price: 180.00 }
    ]
  },
  { 
    id: '2', 
    name: 'Panfleto A5', 
    category: 'Gráfica',
    subcategory: 'Panfletos',
    price: 250.00, 
    stock: 50, 
    type: 'product',
    variations: [
       { id: 'p1', name: 'Couchê 90g - Só Frente (2500un)', price: 250.00 },
       { id: 'p2', name: 'Couchê 90g - Frente e Verso (2500un)', price: 290.00 },
       { id: 'p3', name: 'Couchê 115g - Frente e Verso (2500un)', price: 350.00 }
    ]
  },
  { id: '3', name: 'Banner Lona (m²)', category: 'Comunicação Visual', subcategory: 'Lonas', price: 80.00, stock: 999, type: 'service' },
  { id: '4', name: 'Adesivo Vinil (m²)', category: 'Comunicação Visual', subcategory: 'Adesivos', price: 65.00, stock: 999, type: 'service' },
  { id: '5', name: 'Criação de Arte', category: 'Serviços', subcategory: 'Design', price: 50.00, stock: 999, type: 'service' },
  { id: '6', name: 'Xerox P/B', category: 'Papelaria', subcategory: 'Impressão', price: 0.50, stock: 5000, type: 'product' },
  { id: '7', name: 'Xerox Colorida', category: 'Papelaria', subcategory: 'Impressão', price: 2.00, stock: 2000, type: 'product' },
  { id: '8', name: 'Encadernação', category: 'Papelaria', subcategory: 'Acabamento', price: 15.00, stock: 200, type: 'service' },
  { id: '9', name: 'Folder A4', category: 'Gráfica', subcategory: 'Folders', price: 350.00, stock: 100, type: 'product' },
  { id: '10', name: 'Faixa (m)', category: 'Comunicação Visual', subcategory: 'Faixas', price: 45.00, stock: 999, type: 'service' },
];

const MOCK_ORDERS: ServiceOrder[] = [];

interface AppState {
  customers: Customer[];
  products: Product[];
  orders: ServiceOrder[];
  cart: OrderItem[];
  users: User[];
  currentUser: User | null;
  suppliers: Supplier[];
  expenses: Expense[];
  fixedExpenses: FixedExpense[];
  companySettings: CompanySettings;
  backups?: { id: string; date: string; data: any }[];
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;
  addCustomer: (customer: Omit<Customer, 'id'> & { id?: string }) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  removeSupplier: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addFixedExpense: (expense: Omit<FixedExpense, 'id'>) => void;
  updateFixedExpense: (id: string, expense: Partial<FixedExpense>) => void;
  removeFixedExpense: (id: string) => void;
  applyFixedExpenses: () => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  addOrder: (order: Omit<ServiceOrder, 'id'> & { id?: string }) => void;
  updateOrder: (id: string, data: Partial<ServiceOrder>) => void;
  updateOrderStatus: (id: string, status: ServiceOrder['status']) => void;
  removeOrder: (id: string) => void;
  addToCart: (product: Product, quantity?: number, variationId?: string, options?: { finishing?: string, customDescription?: string, dimensions?: string, variationNameOverride?: string, priceOverride?: number, totalOverride?: number }) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItem: (itemId: string, data: Partial<OrderItem>) => void;
  clearCart: () => void;
  addUser: (user: Omit<User, 'id'>) => void;
  removeUser: (id: string) => void;
  login: (user: User) => void;
  logout: () => void;
  restoreBackup: (data: any) => void;
  createBackup: () => void;
  deleteBackup: (id: string) => void;
  clearAllData: () => void;
}

// Load state from local storage
const loadState = (): Partial<AppState> | null => {
  try {
    const serialized = localStorage.getItem('grafica-pos-storage');
    if (serialized) {
      const state = JSON.parse(serialized).state;
      return { ...state, currentUser: null };
    }
  } catch (e) {
    console.warn('Failed to load state', e);
  }
  return null;
};

const savedState = loadState();

export const useStore = create<AppState>((set) => ({
  customers: savedState?.customers || MOCK_CLIENTS,
  products: savedState?.products || MOCK_PRODUCTS,
  orders: savedState?.orders || MOCK_ORDERS,
  cart: savedState?.cart || [],
  users: savedState?.users || MOCK_USERS,
  currentUser: savedState?.currentUser || null,
  suppliers: savedState?.suppliers || MOCK_SUPPLIERS,
  expenses: savedState?.expenses || [],
  fixedExpenses: savedState?.fixedExpenses || [],
  companySettings: savedState?.companySettings || {
    name: 'Gráfica Express',
    cnpj: '00.000.000/0001-00',
    address: 'Rua Exemplo, 123 - Centro',
    phone: '(11) 99999-9999',
    phone2: '',
    email: 'contato@graficaexpress.com.br',
    showName: true,
    tagline: 'Soluções em Impressão e Design',
    showTagline: true
  },
  backups: savedState?.backups || [],

  addSupplier: (supplier) => set((state) => ({
    suppliers: [...state.suppliers, { ...supplier, id: Math.random().toString(36).substr(2, 9) }]
  })),

  removeSupplier: (id) => set((state) => ({
    suppliers: state.suppliers.filter(s => s.id !== id)
  })),

  addExpense: (expense) => set((state) => ({
    expenses: [...state.expenses, { ...expense, id: Math.random().toString(36).substr(2, 9) }]
  })),

  addFixedExpense: (expense) => set((state) => ({
    fixedExpenses: [...state.fixedExpenses, { ...expense, id: Math.random().toString(36).substr(2, 9), active: true }]
  })),

  updateFixedExpense: (id, expenseData) => set((state) => ({
    fixedExpenses: state.fixedExpenses.map(e => e.id === id ? { ...e, ...expenseData } : e)
  })),

  removeFixedExpense: (id) => set((state) => ({
    fixedExpenses: state.fixedExpenses.filter(e => e.id !== id)
  })),

  applyFixedExpenses: () => set((state) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Check which fixed expenses should be applied this month
    const newExpenses: Expense[] = [];
    
    state.fixedExpenses.filter(fe => fe.active).forEach(fixedExpense => {
      // Check if this expense was already applied this month
      const alreadyApplied = state.expenses.some(e => 
        e.category === 'Gasto Fixo' && 
        e.description.includes(`[${fixedExpense.id}]`) &&
        new Date(e.date).getMonth() === currentMonth &&
        new Date(e.date).getFullYear() === currentYear
      );
      
      if (!alreadyApplied) {
        newExpenses.push({
          id: Math.random().toString(36).substr(2, 9),
          supplierId: '',
          supplierName: 'Gasto Fixo',
          description: `${fixedExpense.name} [${fixedExpense.id}]`,
          amount: fixedExpense.amount,
          date: new Date(currentYear, currentMonth, fixedExpense.dueDay).toISOString(),
          category: 'Gasto Fixo'
        });
      }
    });
    
    return { expenses: [...state.expenses, ...newExpenses] };
  }),

  updateCompanySettings: (settings) => set((state) => ({
    companySettings: { ...state.companySettings, ...settings }
  })),

  addCustomer: (customer) => set((state) => ({
    customers: [...state.customers, { ...customer, id: customer.id || Math.random().toString(36).substr(2, 9) }]
  })),

  updateCustomer: (id, customerData) => set((state) => ({
    customers: state.customers.map(c => c.id === id ? { ...c, ...customerData } : c)
  })),

  removeCustomer: (id) => set((state) => ({
    customers: state.customers.filter(c => c.id !== id)
  })),

  updateSupplier: (id, supplierData) => set((state) => ({
    suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...supplierData } : s)
  })),

  addProduct: (product) => set((state) => ({
    products: [...state.products, { ...product, id: Math.random().toString(36).substr(2, 9) }]
  })),

  updateProduct: (id, productData) => set((state) => ({
    products: state.products.map(p => p.id === id ? { ...p, ...productData } : p)
  })),

  removeProduct: (id) => set((state) => ({
    products: state.products.filter(p => p.id !== id)
  })),

  addOrder: (order) => set((state) => ({
    orders: [{ ...order, id: order.id || (Math.floor(Math.random() * 9000) + 1000).toString() }, ...state.orders]
  })),

  updateOrder: (id, data) => set((state) => ({
    orders: state.orders.map(o => o.id === id ? { ...o, ...data } : o)
  })),

  updateOrderStatus: (id, status) => set((state) => ({
    orders: state.orders.map(o => o.id === id ? { ...o, status } : o)
  })),

  removeOrder: (id) => set((state) => ({
    orders: state.orders.filter(o => o.id !== id)
  })),

  addToCart: (product, quantity = 1, variationId, options) => set((state) => {
    // Use price override if provided (for editing orders), otherwise use product/variation price
    let price = options?.priceOverride ?? product.price;
    let variationName = options?.variationNameOverride;
    let total = options?.totalOverride;

    if (variationId && product.variations && !variationName) {
       const variation = product.variations.find(v => v.id === variationId);
       if (variation) {
          price = options?.priceOverride ?? variation.price;
          variationName = variation.name;
       }
    }

    const hasCustomOptions = options?.finishing || options?.customDescription || options?.dimensions || options?.variationNameOverride;

    if (!hasCustomOptions && !options?.priceOverride && !options?.totalOverride) {
        const existingIndex = state.cart.findIndex(item => 
           item.productId === product.id && 
           item.variationName === variationName &&
           !item.finishing && !item.customDescription && !item.dimensions
        );

        if (existingIndex >= 0) {
          const existingItem = state.cart[existingIndex];
          const newCart = [...state.cart];
          newCart[existingIndex] = {
             ...existingItem,
             quantity: existingItem.quantity + quantity,
             total: (existingItem.quantity + quantity) * price
          };
          return { cart: newCart };
        }
    }

    // Calculate final total: use totalOverride if provided, otherwise calculate from price * quantity
    const finalTotal = total ?? (price * quantity);

    return {
      cart: [...state.cart, {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        name: product.name,
        variationName: variationName,
        price: price,
        quantity,
        total: finalTotal,
        finishing: options?.finishing,
        customDescription: options?.customDescription,
        dimensions: options?.dimensions,
        category: product.category,
        subcategory: product.subcategory
      }]
    };
  }),

  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.filter(item => item.id !== itemId)
  })),

  updateCartItem: (itemId, data) => set((state) => ({
    cart: state.cart.map(item => item.id === itemId ? { ...item, ...data, total: (data.quantity || item.quantity) * (data.price || item.price) } : item)
  })),

  clearCart: () => set({ cart: [] }),

  addUser: (user) => set((state) => ({
    users: [...state.users, { ...user, id: Math.random().toString(36).substr(2, 9), active: true }]
  })),

  removeUser: (id) => set((state) => ({
    users: state.users.filter(u => u.id !== id)
  })),

  login: (user) => {
    // Clear previous user's task seen status so dialog opens for new user
    sessionStorage.removeItem('dailyTasksSeen');
    return set({ currentUser: user });
  },
  
  logout: () => {
    sessionStorage.removeItem('dailyTasksSeen');
    return set({ currentUser: null });
  },


  restoreBackup: (data) => set((state) => ({
    ...state,
    ...data
  })),

  createBackup: () => set((state) => {
    const backupData = {
      customers: state.customers,
      products: state.products,
      orders: state.orders,
      cart: state.cart,
      users: state.users,
      suppliers: state.suppliers,
      expenses: state.expenses,
      companySettings: state.companySettings
    };

    const newBackup = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      data: backupData
    };

    const currentBackups = state.backups || [];
    const updatedBackups = [newBackup, ...currentBackups].slice(0, 5);

    return { backups: updatedBackups };
  }),

  deleteBackup: (id) => set((state) => ({
    backups: (state.backups || []).filter(b => b.id !== id)
  })),

  clearAllData: () => {
    localStorage.removeItem('grafica-pos-storage');
    window.location.reload();
  },
}));

// Subscribe to changes to save state
useStore.subscribe((state) => {
  try {
    const stateToSave = {
      customers: state.customers,
      products: state.products,
      orders: state.orders,
      cart: state.cart,
      users: state.users,
      suppliers: state.suppliers,
      expenses: state.expenses,
      fixedExpenses: state.fixedExpenses,
      companySettings: state.companySettings,
      backups: state.backups
    };
    localStorage.setItem('grafica-pos-storage', JSON.stringify({ state: stateToSave }));
  } catch (e) {
    console.warn('Failed to save state', e);
  }
});
