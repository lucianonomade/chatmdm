// Types - Centralized type definitions

export interface CompanySettings {
  id?: string;
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  phone2?: string;
  email: string;
  logoUrl?: string;
  primaryColor?: string;
  showName?: boolean;
  tagline?: string;
  showTagline?: boolean;
  usesStock?: boolean;
  lowStockThreshold?: number;
  theme?: {
    sidebarColor?: string;
    sidebarTextColor?: string;
    primaryColor?: string;
    hoverColor?: string;
    sidebarHeaderColor?: string;
  };
  // Print settings
  printLogoOnReceipts?: boolean;
  autoPrintOnSale?: boolean;
  // Notification settings
  notifyLowStock?: boolean;
  notifyNewSales?: boolean;
  notifyPendingPayments?: boolean;
  notifyOrderStatus?: boolean;
  // Login customization
  loginHeaderColor?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  type: 'in' | 'out' | 'adjustment';
  reason?: string;
  previousStock: number;
  newStock: number;
  createdAt: string;
  createdBy?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  doc: string;
  notes?: string;
}

export interface ProductVariation {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  stock: number;
  type: 'product' | 'service';
  description?: string;
  variations?: ProductVariation[];
  pricing_mode?: 'quantidade' | 'medidor';
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  variationName?: string;
  finishing?: string;
  customDescription?: string;
  dimensions?: string;
  category?: string;
  subcategory?: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: 'cash' | 'pix' | 'card';
}

export interface ServiceOrder {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'production' | 'finished' | 'delivered';
  paymentStatus: 'paid' | 'pending' | 'partial';
  paymentMethod?: 'cash' | 'pix' | 'card';
  amountPaid?: number;
  remainingAmount?: number;
  payments?: Payment[];
  createdAt: string;
  deadline?: string;
  description?: string;
  measurements?: string;
  sellerId?: string;
  sellerName?: string;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'seller' | 'manager';
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email?: string;
}

export interface Expense {
  id: string;
  supplierId: string;
  supplierName: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  active: boolean;
}

export type PaymentMethod = 'cash' | 'pix' | 'card';
export type OrderStatus = 'pending' | 'production' | 'finished' | 'delivered';
export type PaymentStatus = 'paid' | 'pending' | 'partial';
export type UserRole = 'admin' | 'seller' | 'manager';
