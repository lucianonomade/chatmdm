import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Printer,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  Search,
  Calendar,
  DollarSign,
  ShoppingCart,
  Clock,
  Eye,
  User,
  Truck,
  Star,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { useSyncedCompanySettings } from "@/hooks/useSyncedCompanySettings";
import { useSupabaseUsers } from "@/hooks/useSupabaseUsers";
import { useSupabaseCustomers } from "@/hooks/useSupabaseCustomers";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { format } from "date-fns";
import { OrderDetailsDialog } from "@/components/ordens/OrderDetailsDialog";
import { ServiceOrder } from "@/lib/types";

export default function Relatorios() {
  const { orders, updateOrder, updateOrderStatus, deleteOrder } = useSupabaseOrders();
  const { expenses } = useSupabaseExpenses();
  const { products, fixedExpenses } = useStore();
  const { settings: companySettings } = useSyncedCompanySettings();
  const { users } = useSupabaseUsers();
  const { customers } = useSupabaseCustomers();
  const { suppliers } = useSupabaseSuppliers();
  const { authUser } = useAuth();
  const [activeTab, setActiveTab] = useState("vendas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendedor, setVendedor] = useState("todos");
  const [fornecedor, setFornecedor] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [customerOrdersDialogOpen, setCustomerOrdersDialogOpen] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsDialogType, setStatsDialogType] = useState<'all' | 'paid' | 'pending' | 'qty'>('all');

  // Check if user is seller (restricted access)
  const isSeller = authUser?.role === 'seller';
  const currentUserName = authUser?.name;

  const sellers = users.filter((u) => u.role === "seller" || u.role === "manager" || u.role === "admin");

  // Helper to safely format dates
  const safeFormatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return format(date, "dd/MM/yyyy");
  };

  // Filter orders by date, seller, search term, and role-based access
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Sellers can only see their own orders
      if (isSeller && order.sellerName !== currentUserName) return false;

      if (!order.createdAt) return true; // Include orders without date
      const orderDate = new Date(order.createdAt);
      if (isNaN(orderDate.getTime())) return true; // Include orders with invalid date
      
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null;

      if (fromDate && orderDate < fromDate) return false;
      if (toDate && orderDate > toDate) return false;
      if (vendedor !== "todos" && order.sellerName !== vendedor) return false;

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesCustomer = order.customerName?.toLowerCase().includes(search);
        const matchesSeller = order.sellerName?.toLowerCase().includes(search);
        const matchesId = order.id.toLowerCase().includes(search);
        if (!matchesCustomer && !matchesSeller && !matchesId) return false;
      }

      return true;
    });
  }, [orders, dateFrom, dateTo, vendedor, isSeller, currentUserName, searchTerm]);

  // Filter expenses by date
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (!expense.date) return true;
      const expenseDate = new Date(expense.date);
      if (isNaN(expenseDate.getTime())) return true;
      
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null;

      if (fromDate && expenseDate < fromDate) return false;
      if (toDate && expenseDate > toDate) return false;

      return true;
    });
  }, [expenses, dateFrom, dateTo]);

  // Sales report data
  const salesData = useMemo(() => {
    const totalVendas = filteredOrders.reduce((acc, order) => acc + order.total, 0);
    const totalRecebido = filteredOrders.reduce((acc, order) => acc + (order.amountPaid || 0), 0);
    const totalPendente = totalVendas - totalRecebido;
    const qtdVendas = filteredOrders.length;

    const byPaymentMethod = {
      cash: filteredOrders.filter((o) => o.paymentMethod === "cash").reduce((acc, o) => acc + o.total, 0),
      card: filteredOrders.filter((o) => o.paymentMethod === "card").reduce((acc, o) => acc + o.total, 0),
      pix: filteredOrders.filter((o) => o.paymentMethod === "pix").reduce((acc, o) => acc + o.total, 0),
    };

    const bySeller = sellers.map((seller) => {
      const sellerOrders = filteredOrders.filter((o) => o.sellerName === seller.name);
      return {
        name: seller.name,
        total: sellerOrders.reduce((acc, o) => acc + o.total, 0),
        quantidade: sellerOrders.length,
      };
    });

    // Expense calculations
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const fixedExpensesTotal = fixedExpenses.filter(e => e.active).reduce((acc, e) => acc + e.amount, 0);
    const fixedExpensesList = filteredExpenses.filter(e => e.category === 'Gasto Fixo');
    const fixedExpensesApplied = fixedExpensesList.reduce((acc, e) => acc + e.amount, 0);
    const otherExpenses = filteredExpenses.filter(e => e.category !== 'Gasto Fixo');
    const otherExpensesTotal = otherExpenses.reduce((acc, e) => acc + e.amount, 0);
    
    // Net result
    const lucroLiquido = totalRecebido - totalExpenses;

    return { 
      totalVendas, 
      totalRecebido, 
      totalPendente, 
      qtdVendas, 
      byPaymentMethod, 
      bySeller,
      totalExpenses,
      fixedExpensesTotal,
      fixedExpensesApplied,
      otherExpensesTotal,
      lucroLiquido,
      filteredExpenses,
      fixedExpensesList,
      otherExpenses
    };
  }, [filteredOrders, sellers, filteredExpenses, fixedExpenses]);

  // Stock report data with search filter
  const stockData = useMemo(() => {
    const MIN_STOCK = 5;
    
    // Apply search filter to products
    const filteredProducts = searchTerm 
      ? products.filter((p) => {
          const search = searchTerm.toLowerCase();
          return p.name.toLowerCase().includes(search) || 
                 p.category.toLowerCase().includes(search);
        })
      : products;
    
    const lowStock = filteredProducts.filter((p) => p.stock <= MIN_STOCK);
    const totalValue = filteredProducts.reduce((acc, p) => acc + p.price * p.stock, 0);
    const totalItems = filteredProducts.reduce((acc, p) => acc + p.stock, 0);

    return { products: filteredProducts, lowStock, totalValue, totalItems, MIN_STOCK };
  }, [products, searchTerm]);

  // Receivables report data with customer search filter (for inadimplencia tab)
  const receivablesData = useMemo(() => {
    // Get all pending orders first
    let pendingOrders = filteredOrders.filter((o) => (o.amountPaid || 0) < o.total);
    
    // If customer search is active, filter by customer name
    if (customerSearch) {
      const search = customerSearch.toLowerCase();
      pendingOrders = pendingOrders.filter((o) => 
        o.customerName?.toLowerCase().includes(search)
      );
    }
    
    const totalPending = pendingOrders.reduce((acc, o) => acc + (o.total - (o.amountPaid || 0)), 0);

    // Group by customer - only customers with pending amounts
    const byCustomer = customers
      .map((customer) => {
        const customerOrders = pendingOrders.filter((o) => o.customerName === customer.name);
        const pendente = customerOrders.reduce((acc, o) => acc + (o.total - (o.amountPaid || 0)), 0);
        return {
          ...customer,
          pendente,
          orders: customerOrders.length,
          orderDetails: customerOrders,
        };
      })
      .filter((c) => c.pendente > 0)
      .filter((c) => {
        // Apply customer search filter
        if (!customerSearch) return true;
        const search = customerSearch.toLowerCase();
        return c.name.toLowerCase().includes(search) || 
               c.phone?.toLowerCase().includes(search);
      })
      .sort((a, b) => b.pendente - a.pendente);

    return { pendingOrders, totalPending, byCustomer };
  }, [filteredOrders, customers, customerSearch]);

  // Commission report data
  const commissionData = useMemo(() => {
    const commissionRate = companySettings?.usesCommission ? (companySettings?.commissionPercentage || 0) / 100 : 0;
    
    if (commissionRate === 0) {
      return {
        enabled: false,
        rate: 0,
        percentage: 0,
        totalCommission: 0,
        bySeller: [],
        allOrders: [],
      };
    }

    // Only calculate commission on paid amounts
    const ordersWithCommission = filteredOrders
      .filter(order => (order.amountPaid || 0) > 0)
      .map(order => ({
        ...order,
        commissionValue: (order.amountPaid || 0) * commissionRate
      }));

    const totalCommission = ordersWithCommission.reduce((acc, order) => acc + order.commissionValue, 0);

    // Group by seller
    const bySeller = sellers.map((seller) => {
      const sellerOrders = ordersWithCommission.filter((o) => o.sellerName === seller.name);
      const totalSales = sellerOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);
      const commission = sellerOrders.reduce((acc, o) => acc + o.commissionValue, 0);
      return {
        id: seller.id,
        name: seller.name,
        totalSales,
        commission,
        ordersCount: sellerOrders.length,
        orders: sellerOrders,
      };
    }).filter(s => s.commission > 0).sort((a, b) => b.commission - a.commission);

    return {
      enabled: true,
      rate: commissionRate,
      percentage: companySettings?.commissionPercentage || 0,
      totalCommission,
      bySeller,
      allOrders: ordersWithCommission,
    };
  }, [filteredOrders, sellers, companySettings]);

  // Purchases by supplier report data
  const supplierPurchasesData = useMemo(() => {
    // Get expenses with supplier info
    const expensesWithSupplier = filteredExpenses.filter(e => e.supplierId || e.supplierName);
    
    // If a specific supplier is selected, filter all data by that supplier
    const isFiltered = fornecedor !== "todos";
    
    // Build supplier stats - only for selected supplier when filtered
    const bySupplier = suppliers
      .filter(supplier => !isFiltered || supplier.id === fornecedor)
      .map(supplier => {
        const supplierExpenses = expensesWithSupplier.filter(e => e.supplierId === supplier.id);
        const total = supplierExpenses.reduce((acc, e) => acc + e.amount, 0);
        return {
          id: supplier.id,
          name: supplier.name,
          total,
          count: supplierExpenses.length,
          expenses: supplierExpenses,
        };
      })
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);

    // Calculate totals based on filter
    const expensesToShow = isFiltered 
      ? expensesWithSupplier.filter(e => e.supplierId === fornecedor)
      : expensesWithSupplier;
    const totalPurchased = expensesToShow.reduce((acc, e) => acc + e.amount, 0);

    return { bySupplier, totalPurchased, expensesToAnalyze: expensesToShow };
  }, [filteredExpenses, suppliers, fornecedor]);

  // Top selling products report
  const topProductsData = useMemo(() => {
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();

    filteredOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const key = item.name || item.productName || 'Produto';
          const existing = productSales.get(key) || { name: key, quantity: 0, revenue: 0 };
          existing.quantity += item.quantity || 1;
          existing.revenue += (item.price || 0) * (item.quantity || 1);
          productSales.set(key, existing);
        });
      }
    });

    return Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredOrders]);

  // Top customers report
  const topCustomersData = useMemo(() => {
    const customerPurchases = new Map<string, { name: string; orders: number; total: number; paid: number }>();

    filteredOrders.forEach(order => {
      const key = order.customerName || 'Cliente não identificado';
      const existing = customerPurchases.get(key) || { name: key, orders: 0, total: 0, paid: 0 };
      existing.orders += 1;
      existing.total += order.total;
      existing.paid += order.amountPaid || 0;
      customerPurchases.set(key, existing);
    });

    return Array.from(customerPurchases.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredOrders]);

  // Customer orders for the customer search feature
  const customerOrders = useMemo(() => {
    if (!customerSearch) return [];
    const search = customerSearch.toLowerCase();
    return orders.filter((order) => {
      // Sellers can only see their own orders
      if (isSeller && order.sellerName !== currentUserName) return false;
      return order.customerName?.toLowerCase().includes(search);
    });
  }, [orders, customerSearch, isSeller, currentUserName]);

  // Handle order click
  const handleOrderClick = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setOrderDialogOpen(true);
  };

  // Handle status change
  const handleStatusChange = (status: 'pending' | 'production' | 'finished' | 'delivered') => {
    if (selectedOrder) {
      updateOrderStatus({ id: selectedOrder.id, status });
      setSelectedOrder({ ...selectedOrder, status });
    }
  };

  // Handle order delete
  const handleDeleteOrder = (orderId: string) => {
    deleteOrder(orderId);
    setOrderDialogOpen(false);
    setSelectedOrder(null);
  };

  // Handle print order
  const handlePrintOrder = (type: 'production' | 'receipt' | 'order' | 'quote') => {
    if (!selectedOrder || !companySettings) return;
    
    // Import dynamically to avoid circular deps, or use the printUtils
    const printWindow = window.open('', '', `height=600,width=${type === 'receipt' ? 400 : 800}`);
    if (!printWindow) return;

    const showPrices = type !== 'production';
    const title = type === 'production' ? 'ORDEM DE PRODUÇÃO' : 
                  type === 'receipt' ? 'RECIBO' : 
                  type === 'order' ? 'PEDIDO' : 'ORÇAMENTO';

    const paid = selectedOrder.amountPaid ?? (selectedOrder.paymentStatus === 'paid' ? selectedOrder.total : 0);
    const remaining = selectedOrder.remainingAmount ?? (selectedOrder.total - paid);
    const phones = [companySettings.phone, companySettings.phone2].filter(Boolean).join(' | ');
    
    const getPaymentMethodLabel = (method: string | null | undefined): string => {
      const labels: Record<string, string> = { cash: 'Dinheiro', pix: 'PIX', card: 'Cartão' };
      return method ? labels[method] || method : 'Não informado';
    };

    let itemsHtml = '';
    if (type === 'receipt') {
      selectedOrder.items.forEach((item: any) => {
        itemsHtml += `
          <div style="margin-bottom: 8px;">
            <div style="font-weight: bold;">${item.quantity}x ${item.name || 'Produto'}</div>
            ${item.variationName ? `<div style="font-size: 0.9em;">${item.variationName}</div>` : ''}
            ${showPrices ? `<div style="text-align: right;">R$ ${(item.total || 0).toFixed(2)}</div>` : ''}
          </div>
        `;
      });
    } else {
      itemsHtml = `<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead><tr>
          <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: left; width: 60%;">Item / Detalhes</th>
          <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: center; width: 10%;">Qtd</th>
          ${showPrices ? '<th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right; width: 15%;">Unit.</th><th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right; width: 15%;">Total</th>' : ''}
        </tr></thead><tbody>`;
      
      selectedOrder.items.forEach((item: any) => {
        const unitPrice = (item.total || 0) / (item.quantity || 1);
        itemsHtml += `
          <tr>
            <td style="padding: 8px 8px 20px 8px; border-bottom: 1px solid #ddd;">
              <div style="font-weight: bold; font-size: 1.2em;">${item.name || 'Produto'}</div>
              ${item.variationName ? `<div>${item.variationName}</div>` : ''}
              ${item.dimensions ? `<div style="font-size: 0.9em;">Medidas: ${item.dimensions}</div>` : ''}
              ${item.finishing ? `<div style="border: 2px solid #333; padding: 8px 12px; margin-top: 8px; font-size: 15px; font-weight: bold; background: #eee; display: inline-block;">ACABAMENTO: ${(item.finishing || '').toUpperCase()}</div>` : ''}
              ${item.customDescription ? `<div style="border: 2px solid #000; padding: 15px; margin-top: 8px; font-size: 16px; font-weight: bold; background: #f8f9fa;">OBS: ${(item.customDescription || '').toUpperCase()}</div>` : ''}
            </td>
            <td style="text-align: center; vertical-align: top; font-size: 1.2em; font-weight: bold; padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity || 1}</td>
            ${showPrices ? `
              <td style="text-align: right; vertical-align: top; padding: 8px; border-bottom: 1px solid #ddd;">R$ ${unitPrice.toFixed(2)}</td>
              <td style="text-align: right; vertical-align: top; padding: 8px; border-bottom: 1px solid #ddd;">R$ ${(item.total || 0).toFixed(2)}</td>
            ` : ''}
          </tr>
        `;
      });
      itemsHtml += '</tbody></table>';
    }

    const totalsHtml = showPrices ? `
      <div style="margin-top: 20px; text-align: right; font-size: 1.2em; font-weight: bold;">
        <div>TOTAL: R$ ${selectedOrder.total.toFixed(2)}</div>
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc;">
          <div style="font-size: 0.9em; margin-bottom: 4px;">
            <strong>Forma de Pagamento:</strong> ${getPaymentMethodLabel(selectedOrder.paymentMethod)}
          </div>
          ${paid > 0 ? `<div style="font-size: 0.9em; color: #28a745; margin-top: 4px;"><strong>Valor Pago:</strong> R$ ${paid.toFixed(2)}</div>` : ''}
          ${remaining > 0 ? `<div style="font-size: 0.9em; color: #dc3545; margin-top: 4px;"><strong>Falta Pagar:</strong> R$ ${remaining.toFixed(2)}</div>` : `<div style="font-size: 0.9em; color: #28a745; margin-top: 4px;"><strong>PAGAMENTO TOTAL REALIZADO</strong></div>`}
        </div>
      </div>
    ` : '';

    const productionFields = type === 'production' ? `
      <div style="margin-top: 40px; border: 2px solid #000; padding: 10px;">
        <div style="font-weight: bold; margin-bottom: 40px;">OBSERVAÇÕES DE PRODUÇÃO:</div>
        <div style="border-bottom: 1px dotted #999; margin-bottom: 20px;"></div>
        <div style="border-bottom: 1px dotted #999; margin-bottom: 20px;"></div>
      </div>
      <div style="margin-top: 20px; display: flex; justify-content: space-between;">
        <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Visto Produção</div>
        <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Visto Conferência</div>
      </div>
    ` : '';

    const html = `
      <html>
        <head>
          <title>${title} #${selectedOrder.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; font-size: ${type === 'receipt' ? '12px' : '14px'}; max-width: ${type === 'receipt' ? '300px' : '100%'}; margin: 0 auto; }
            .action-bar { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; padding: 15px; background: #f0f0f0; border-radius: 10px; }
            .action-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            .action-btn.print { background: #22c55e; }
            .action-btn.close { background: #ef4444; }
            @media print { .action-bar { display: none !important; } body { margin: 0; padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="action-bar">
            <button class="action-btn print" onclick="window.print()">🖨️ Imprimir</button>
            <button class="action-btn close" onclick="window.close()">✕ Fechar</button>
          </div>
          <div style="margin-bottom: 20px; text-align: center;">
            ${companySettings.logoUrl ? `<img src="${companySettings.logoUrl}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px;" />` : `<div style="font-weight: bold; font-size: 1.2em;">${companySettings.name || 'Empresa'}</div>`}
            ${companySettings.cnpj ? `<div style="font-size: 0.9em;">CNPJ: ${companySettings.cnpj}</div>` : ''}
            <div>${companySettings.address || ''}</div>
            <div>${phones}</div>
            <div style="margin-top: 10px; font-weight: bold; font-size: 1.5em;">${title}</div>
          </div>
          <div style="padding-bottom: 8px; border-bottom: 1px dashed #000; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <div><strong>Data:</strong> ${new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</div>
                <div><strong>Referência:</strong> #${selectedOrder.id}</div>
                ${type === 'quote' ? '<div style="font-size: 0.8em; margin-top: 5px;">Válido por 7 dias</div>' : ''}
              </div>
              <div style="text-align: right;">
                <div><strong>Cliente:</strong> ${selectedOrder.customerName}</div>
                ${selectedOrder.sellerName ? `<div><strong>Vendedor:</strong> ${selectedOrder.sellerName}</div>` : ''}
              </div>
            </div>
          </div>
          ${itemsHtml}
          ${totalsHtml}
          ${productionFields}
          ${type !== 'production' ? '<div style="text-align: center; padding: 8px; margin-top: 20px; border-top: 1px dashed #000;">Obrigado pela preferência!</div>' : ''}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  // Handle customer row click to show all orders
  const handleCustomerClick = (customerName: string) => {
    setSelectedCustomerName(customerName);
    setCustomerSearch(customerName);
    setCustomerOrdersDialogOpen(true);
  };

  // Get orders for selected customer in dialog
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomerName) return [];
    return orders.filter((order) => {
      if (isSeller && order.sellerName !== currentUserName) return false;
      return order.customerName === selectedCustomerName;
    });
  }, [orders, selectedCustomerName, isSeller, currentUserName]);

  // Get orders for stats dialog based on type
  const statsDialogOrders = useMemo(() => {
    if (statsDialogType === 'paid') {
      return filteredOrders.filter(o => o.paymentStatus === 'paid');
    } else if (statsDialogType === 'pending') {
      return filteredOrders.filter(o => o.paymentStatus !== 'paid');
    }
    return filteredOrders;
  }, [filteredOrders, statsDialogType]);

  const statsDialogTitle = useMemo(() => {
    switch (statsDialogType) {
      case 'paid': return 'Vendas Recebidas';
      case 'pending': return 'Vendas Pendentes';
      case 'qty': return 'Todas as Vendas';
      default: return 'Todas as Vendas';
    }
  }, [statsDialogType]);

  const handleStatsCardClick = (type: 'all' | 'paid' | 'pending' | 'qty') => {
    setStatsDialogType(type);
    setStatsDialogOpen(true);
  };

  const handlePrint = (reportType: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let content = "";
    const headerStyle = `
      <style>
        body { font-family: 'Courier New', monospace; padding: 20px; }
        .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
        .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .print-actions .btn-print { background: #22c55e; }
        .print-actions .btn-close { background: #ef4444; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .company { font-size: 18px; font-weight: bold; }
        .title { font-size: 16px; margin-top: 10px; }
        .period { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; font-weight: bold; }
        .total-row { font-weight: bold; background: #f0f0f0; }
        .summary { margin-top: 20px; padding: 10px; background: #f5f5f5; }
        .summary-item { display: flex; justify-content: space-between; margin: 5px 0; }
        @media print { body { margin: 0; } .print-actions { display: none !important; } }
      </style>
    `;

    const actionBar = `
      <div class="print-actions">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
        <button class="btn-close" onclick="window.close()">✕ Fechar</button>
      </div>
    `;

    const header = `
      <div class="header">
        <div class="company">${companySettings?.name || "Empresa"}</div>
        <div class="title">RELATÓRIO DE ${reportType.toUpperCase()}</div>
        <div class="period">Período: ${dateFrom || "Início"} até ${dateTo || "Hoje"}</div>
        <div class="period">Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
      </div>
    `;

    const paymentMethodLabel = (method: string) => {
      const labels: Record<string, string> = { cash: "Dinheiro", card: "Cartão", pix: "PIX" };
      return labels[method] || method;
    };

    if (reportType === "vendas") {
      content = `
        ${headerStyle}
        ${actionBar}
        ${header}
        <div class="summary">
          <div class="summary-item"><span>Total de Vendas:</span><span>R$ ${salesData.totalVendas.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Recebido:</span><span>R$ ${salesData.totalRecebido.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Pendente:</span><span>R$ ${salesData.totalPendente.toFixed(2)}</span></div>
          <div class="summary-item"><span>Quantidade de Vendas:</span><span>${salesData.qtdVendas}</span></div>
        </div>
        <h3>Por Forma de Pagamento</h3>
        <table>
          <tr><th>Forma</th><th>Valor</th></tr>
          <tr><td>Dinheiro</td><td>R$ ${salesData.byPaymentMethod.cash.toFixed(2)}</td></tr>
          <tr><td>Cartão</td><td>R$ ${salesData.byPaymentMethod.card.toFixed(2)}</td></tr>
          <tr><td>PIX</td><td>R$ ${salesData.byPaymentMethod.pix.toFixed(2)}</td></tr>
        </table>
        <h3>Por Vendedor</h3>
        <table>
          <tr><th>Vendedor</th><th>Qtd</th><th>Total</th></tr>
          ${salesData.bySeller.map((s) => `<tr><td>${s.name}</td><td>${s.quantidade}</td><td>R$ ${s.total.toFixed(2)}</td></tr>`).join("")}
        </table>
        <h3>Detalhamento de Vendas</h3>
        <table>
          <tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Pago</th></tr>
          ${filteredOrders.map((o) => `
            <tr>
              <td>${o.createdAt ? (isNaN(new Date(o.createdAt).getTime()) ? "-" : format(new Date(o.createdAt), "dd/MM/yyyy")) : "-"}</td>
              <td>#${o.id.slice(-4)}</td>
              <td>${o.customerName}</td>
              <td>${o.sellerName || "-"}</td>
              <td>R$ ${o.total.toFixed(2)}</td>
              <td>R$ ${(o.amountPaid || 0).toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="4">TOTAL</td>
            <td>R$ ${salesData.totalVendas.toFixed(2)}</td>
            <td>R$ ${salesData.totalRecebido.toFixed(2)}</td>
          </tr>
        </table>
      `;
    } else if (reportType === "vendas-resumo") {
      content = `
        ${headerStyle}
        ${actionBar}
        ${header.replace("VENDAS-RESUMO", "RESUMO DE VENDAS")}
        <div class="summary">
          <div class="summary-item"><span>Total de Vendas:</span><span>R$ ${salesData.totalVendas.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Recebido:</span><span>R$ ${salesData.totalRecebido.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Pendente:</span><span>R$ ${salesData.totalPendente.toFixed(2)}</span></div>
          <div class="summary-item"><span>Quantidade de Vendas:</span><span>${salesData.qtdVendas}</span></div>
          <div class="summary-item"><span>Gastos Fixos:</span><span>R$ ${salesData.fixedExpensesApplied.toFixed(2)}</span></div>
          <div class="summary-item"><span>Outras Despesas:</span><span>R$ ${salesData.otherExpensesTotal.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Despesas:</span><span>R$ ${salesData.totalExpenses.toFixed(2)}</span></div>
          <div class="summary-item" style="font-weight: bold; ${salesData.lucroLiquido >= 0 ? 'color: green;' : 'color: red;'}"><span>Lucro Líquido:</span><span>R$ ${salesData.lucroLiquido.toFixed(2)}</span></div>
        </div>
      `;
    } else if (reportType === "vendas-pagamento") {
      content = `
        ${headerStyle}
        ${actionBar}
        ${header.replace("VENDAS-PAGAMENTO", "VENDAS POR FORMA DE PAGAMENTO")}
        <div class="summary">
          <div class="summary-item"><span>Total de Vendas:</span><span>R$ ${salesData.totalVendas.toFixed(2)}</span></div>
        </div>
        <h3>Por Forma de Pagamento</h3>
        <table>
          <tr><th>Forma de Pagamento</th><th>Valor</th><th>%</th></tr>
          <tr><td>Dinheiro</td><td>R$ ${salesData.byPaymentMethod.cash.toFixed(2)}</td><td>${salesData.totalVendas > 0 ? ((salesData.byPaymentMethod.cash / salesData.totalVendas) * 100).toFixed(1) : 0}%</td></tr>
          <tr><td>Cartão</td><td>R$ ${salesData.byPaymentMethod.card.toFixed(2)}</td><td>${salesData.totalVendas > 0 ? ((salesData.byPaymentMethod.card / salesData.totalVendas) * 100).toFixed(1) : 0}%</td></tr>
          <tr><td>PIX</td><td>R$ ${salesData.byPaymentMethod.pix.toFixed(2)}</td><td>${salesData.totalVendas > 0 ? ((salesData.byPaymentMethod.pix / salesData.totalVendas) * 100).toFixed(1) : 0}%</td></tr>
          <tr class="total-row"><td>TOTAL</td><td>R$ ${salesData.totalVendas.toFixed(2)}</td><td>100%</td></tr>
        </table>
      `;
    } else if (reportType === "vendas-vendedor") {
      content = `
        ${headerStyle}
        ${actionBar}
        ${header.replace("VENDAS-VENDEDOR", "VENDAS POR VENDEDOR")}
        <div class="summary">
          <div class="summary-item"><span>Total de Vendas:</span><span>R$ ${salesData.totalVendas.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total de Vendedores:</span><span>${salesData.bySeller.length}</span></div>
        </div>
        <h3>Por Vendedor</h3>
        <table>
          <tr><th>Vendedor</th><th>Qtd Vendas</th><th>Total</th><th>%</th></tr>
          ${salesData.bySeller.map((s) => `
            <tr>
              <td>${s.name}</td>
              <td>${s.quantidade}</td>
              <td>R$ ${s.total.toFixed(2)}</td>
              <td>${salesData.totalVendas > 0 ? ((s.total / salesData.totalVendas) * 100).toFixed(1) : 0}%</td>
            </tr>
          `).join("")}
          <tr class="total-row"><td>TOTAL</td><td>${salesData.qtdVendas}</td><td>R$ ${salesData.totalVendas.toFixed(2)}</td><td>100%</td></tr>
        </table>
      `;
    } else if (reportType === "vendas-detalhes") {
      content = `
        ${headerStyle}
        ${actionBar}
        ${header.replace("VENDAS-DETALHES", "DETALHAMENTO DE VENDAS")}
        <div class="summary">
          <div class="summary-item"><span>Total de Vendas:</span><span>R$ ${salesData.totalVendas.toFixed(2)}</span></div>
          <div class="summary-item"><span>Quantidade de Vendas:</span><span>${salesData.qtdVendas}</span></div>
        </div>
        <h3>Detalhamento de Vendas</h3>
        <table>
          <tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Pago</th><th>Status</th></tr>
          ${filteredOrders.map((o) => `
            <tr>
              <td>${o.createdAt ? (isNaN(new Date(o.createdAt).getTime()) ? "-" : format(new Date(o.createdAt), "dd/MM/yyyy")) : "-"}</td>
              <td>#${o.id.slice(-4)}</td>
              <td>${o.customerName}</td>
              <td>${o.sellerName || "-"}</td>
              <td>R$ ${o.total.toFixed(2)}</td>
              <td>R$ ${(o.amountPaid || 0).toFixed(2)}</td>
              <td>${o.paymentStatus === 'paid' ? 'Pago' : o.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="4">TOTAL</td>
            <td>R$ ${salesData.totalVendas.toFixed(2)}</td>
            <td>R$ ${salesData.totalRecebido.toFixed(2)}</td>
            <td></td>
          </tr>
        </table>
      `;
    } else if (reportType === "vendedor-resumo") {
      // Only seller summary
      const sellerData = salesData.bySeller.find(s => s.name === vendedor);
      const sellerTotal = sellerData?.total || 0;
      const sellerQty = sellerData?.quantidade || 0;
      const sellerOrders = filteredOrders;
      const sellerRecebido = sellerOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);
      const sellerPendente = sellerTotal - sellerRecebido;
      content = `
        ${headerStyle}
        ${actionBar}
        ${header.replace("VENDEDOR-RESUMO", `RESUMO DE VENDAS - ${vendedor.toUpperCase()}`)}
        <div class="summary">
          <div class="summary-item"><span>Vendedor:</span><span>${vendedor}</span></div>
          <div class="summary-item"><span>Total de Vendas:</span><span>R$ ${sellerTotal.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Recebido:</span><span>R$ ${sellerRecebido.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Pendente:</span><span>R$ ${sellerPendente.toFixed(2)}</span></div>
          <div class="summary-item"><span>Quantidade de Pedidos:</span><span>${sellerQty}</span></div>
        </div>
      `;
    } else if (reportType === "vendedor-detalhes") {
      // Only seller details
      const sellerData = salesData.bySeller.find(s => s.name === vendedor);
      const sellerTotal = sellerData?.total || 0;
      const sellerOrders = filteredOrders;
      const sellerRecebido = sellerOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);
      content = `
        ${headerStyle}
        ${actionBar}
        ${header.replace("VENDEDOR-DETALHES", `DETALHAMENTO DE VENDAS - ${vendedor.toUpperCase()}`)}
        <h3>Vendas de ${vendedor}</h3>
        <table>
          <tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Status</th></tr>
          ${sellerOrders.map((o) => `
            <tr>
              <td>${o.createdAt ? (isNaN(new Date(o.createdAt).getTime()) ? "-" : format(new Date(o.createdAt), "dd/MM/yyyy")) : "-"}</td>
              <td>#${o.id.slice(-4)}</td>
              <td>${o.customerName}</td>
              <td>R$ ${o.total.toFixed(2)}</td>
              <td>R$ ${(o.amountPaid || 0).toFixed(2)}</td>
              <td>${o.paymentStatus === 'paid' ? 'Pago' : o.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td>R$ ${sellerTotal.toFixed(2)}</td>
            <td>R$ ${sellerRecebido.toFixed(2)}</td>
            <td></td>
          </tr>
        </table>
      `;
    } else if (reportType === "vendedor-completo") {
      // Seller summary + details
      const sellerData = salesData.bySeller.find(s => s.name === vendedor);
      const sellerTotal = sellerData?.total || 0;
      const sellerQty = sellerData?.quantidade || 0;
      const sellerOrders = filteredOrders;
      const sellerRecebido = sellerOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);
      const sellerPendente = sellerTotal - sellerRecebido;
      content = `
        ${headerStyle}
        ${actionBar}
        ${header.replace("VENDEDOR-COMPLETO", `RELATÓRIO DE VENDAS - ${vendedor.toUpperCase()}`)}
        <div class="summary">
          <div class="summary-item"><span>Vendedor:</span><span>${vendedor}</span></div>
          <div class="summary-item"><span>Total de Vendas:</span><span>R$ ${sellerTotal.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Recebido:</span><span>R$ ${sellerRecebido.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Pendente:</span><span>R$ ${sellerPendente.toFixed(2)}</span></div>
          <div class="summary-item"><span>Quantidade de Pedidos:</span><span>${sellerQty}</span></div>
        </div>
        <h3>Detalhamento de Vendas</h3>
        <table>
          <tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Status</th></tr>
          ${sellerOrders.map((o) => `
            <tr>
              <td>${o.createdAt ? (isNaN(new Date(o.createdAt).getTime()) ? "-" : format(new Date(o.createdAt), "dd/MM/yyyy")) : "-"}</td>
              <td>#${o.id.slice(-4)}</td>
              <td>${o.customerName}</td>
              <td>R$ ${o.total.toFixed(2)}</td>
              <td>R$ ${(o.amountPaid || 0).toFixed(2)}</td>
              <td>${o.paymentStatus === 'paid' ? 'Pago' : o.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td>R$ ${sellerTotal.toFixed(2)}</td>
            <td>R$ ${sellerRecebido.toFixed(2)}</td>
            <td></td>
          </tr>
        </table>
      `;
    } else if (reportType === "estoque") {
      content = `
        ${headerStyle}
        ${actionBar}
        ${header}
        <div class="summary">
          <div class="summary-item"><span>Total de Itens em Estoque:</span><span>${stockData.totalItems}</span></div>
          <div class="summary-item"><span>Valor Total do Estoque:</span><span>R$ ${stockData.totalValue.toFixed(2)}</span></div>
          <div class="summary-item"><span>Produtos com Estoque Baixo:</span><span>${stockData.lowStock.length}</span></div>
        </div>
        <h3>Produtos com Estoque Baixo</h3>
        <table>
          <tr><th>Produto</th><th>Categoria</th><th>Estoque</th><th>Mínimo</th><th>Preço</th></tr>
          ${stockData.lowStock.map((p) => `
            <tr style="background: #fff3cd;">
              <td>${p.name}</td>
              <td>${p.category}</td>
              <td>${p.stock}</td>
              <td>${stockData.MIN_STOCK}</td>
              <td>R$ ${p.price.toFixed(2)}</td>
            </tr>
          `).join("")}
        </table>
        <h3>Todos os Produtos</h3>
        <table>
          <tr><th>Produto</th><th>Categoria</th><th>Estoque</th><th>Preço</th><th>Valor Total</th></tr>
          ${stockData.products.map((p) => `
            <tr>
              <td>${p.name}</td>
              <td>${p.category}</td>
              <td>${p.stock}</td>
              <td>R$ ${p.price.toFixed(2)}</td>
              <td>R$ ${(p.price * p.stock).toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="4">TOTAL</td>
            <td>R$ ${stockData.totalValue.toFixed(2)}</td>
          </tr>
        </table>
      `;
    } else if (reportType === "inadimplencia") {
      content = `
        ${headerStyle}
        ${actionBar}
        ${header}
        <div class="summary">
          <div class="summary-item"><span>Total em Aberto:</span><span>R$ ${receivablesData.totalPending.toFixed(2)}</span></div>
          <div class="summary-item"><span>Clientes com Pendências:</span><span>${receivablesData.byCustomer.length}</span></div>
          <div class="summary-item"><span>Pedidos Pendentes:</span><span>${receivablesData.pendingOrders.length}</span></div>
        </div>
        <h3>Por Cliente</h3>
        <table>
          <tr><th>Cliente</th><th>Telefone</th><th>Pedidos</th><th>Valor Pendente</th></tr>
          ${receivablesData.byCustomer.map((c) => `
            <tr>
              <td>${c.name}</td>
              <td>${c.phone}</td>
              <td>${c.orders}</td>
              <td>R$ ${c.pendente.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td>R$ ${receivablesData.totalPending.toFixed(2)}</td>
          </tr>
        </table>
        <h3>Detalhamento de Pendências</h3>
        <table>
          <tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Pendente</th></tr>
          ${receivablesData.pendingOrders.map((o) => `
            <tr>
              <td>${o.createdAt ? (isNaN(new Date(o.createdAt).getTime()) ? "-" : format(new Date(o.createdAt), "dd/MM/yyyy")) : "-"}</td>
              <td>#${o.id.slice(-4)}</td>
              <td>${o.customerName}</td>
              <td>R$ ${o.total.toFixed(2)}</td>
              <td>R$ ${(o.amountPaid || 0).toFixed(2)}</td>
              <td>R$ ${(o.total - (o.amountPaid || 0)).toFixed(2)}</td>
            </tr>
          `).join("")}
        </table>
      `;
    } else if (reportType === "inadimplencia-clientes") {
      // Only customers with pending amounts
      content = `
        ${headerStyle}
        ${actionBar}
        <div class="header">
          <div class="company">${companySettings?.name || "Empresa"}</div>
          <div class="title">CLIENTES COM PENDÊNCIAS</div>
          <div class="period">Período: ${dateFrom || "Início"} até ${dateTo || "Hoje"}</div>
          ${customerSearch ? `<div class="period">Filtro: ${customerSearch}</div>` : ''}
          <div class="period">Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
        </div>
        <div class="summary">
          <div class="summary-item"><span>Total em Aberto:</span><span>R$ ${receivablesData.totalPending.toFixed(2)}</span></div>
          <div class="summary-item"><span>Clientes com Pendências:</span><span>${receivablesData.byCustomer.length}</span></div>
        </div>
        <table>
          <tr><th>Cliente</th><th>Telefone</th><th>Pedidos</th><th>Valor Pendente</th></tr>
          ${receivablesData.byCustomer.map((c) => `
            <tr>
              <td>${c.name}</td>
              <td>${c.phone || '-'}</td>
              <td>${c.orders}</td>
              <td>R$ ${c.pendente.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td>R$ ${receivablesData.totalPending.toFixed(2)}</td>
          </tr>
        </table>
      `;
    } else if (reportType === "inadimplencia-detalhes") {
      // Detailed pending orders
      content = `
        ${headerStyle}
        ${actionBar}
        <div class="header">
          <div class="company">${companySettings?.name || "Empresa"}</div>
          <div class="title">DETALHAMENTO DE PENDÊNCIAS</div>
          <div class="period">Período: ${dateFrom || "Início"} até ${dateTo || "Hoje"}</div>
          ${customerSearch ? `<div class="period">Cliente: ${customerSearch}</div>` : ''}
          <div class="period">Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
        </div>
        <div class="summary">
          <div class="summary-item"><span>Total Pendente:</span><span>R$ ${receivablesData.totalPending.toFixed(2)}</span></div>
          <div class="summary-item"><span>Pedidos Pendentes:</span><span>${receivablesData.pendingOrders.length}</span></div>
        </div>
        <table>
          <tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Pendente</th></tr>
          ${receivablesData.pendingOrders.map((o) => `
            <tr>
              <td>${o.createdAt ? (isNaN(new Date(o.createdAt).getTime()) ? "-" : format(new Date(o.createdAt), "dd/MM/yyyy")) : "-"}</td>
              <td>#${o.id.slice(-4)}</td>
              <td>${o.customerName}</td>
              <td>R$ ${o.total.toFixed(2)}</td>
              <td>R$ ${(o.amountPaid || 0).toFixed(2)}</td>
              <td>R$ ${(o.total - (o.amountPaid || 0)).toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td>R$ ${receivablesData.pendingOrders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</td>
            <td>R$ ${receivablesData.pendingOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0).toFixed(2)}</td>
            <td>R$ ${receivablesData.totalPending.toFixed(2)}</td>
          </tr>
        </table>
      `;
    } else if (reportType === "cliente" && customerSearch && customerOrders.length > 0) {
      const totalCompras = customerOrders.reduce((acc, o) => acc + o.total, 0);
      const totalPago = customerOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);
      const totalPendente = totalCompras - totalPago;
      
      content = `
        ${headerStyle}
        ${actionBar}
        <div class="header">
          <div class="company">${companySettings?.name || "Empresa"}</div>
          <div class="title">HISTÓRICO DE COMPRAS - ${customerSearch.toUpperCase()}</div>
          <div class="period">Período: ${dateFrom || "Início"} até ${dateTo || "Hoje"}</div>
          <div class="period">Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
        </div>
        <div class="summary">
          <div class="summary-item"><span>Total de Pedidos:</span><span>${customerOrders.length}</span></div>
          <div class="summary-item"><span>Total das Compras:</span><span>R$ ${totalCompras.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Pago:</span><span>R$ ${totalPago.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Pendente:</span><span>R$ ${totalPendente.toFixed(2)}</span></div>
        </div>
        <h3>Detalhamento de Compras</h3>
        <table>
          <tr><th>Data</th><th>Pedido</th><th>Total</th><th>Pago</th><th>Status</th></tr>
          ${customerOrders.map((o) => `
            <tr>
              <td>${o.createdAt ? (isNaN(new Date(o.createdAt).getTime()) ? "-" : format(new Date(o.createdAt), "dd/MM/yyyy")) : "-"}</td>
              <td>#${o.id.slice(-4)}</td>
              <td>R$ ${o.total.toFixed(2)}</td>
              <td>R$ ${(o.amountPaid || 0).toFixed(2)}</td>
              <td>${o.paymentStatus === 'paid' ? 'Pago' : o.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="2">TOTAL</td>
            <td>R$ ${totalCompras.toFixed(2)}</td>
            <td>R$ ${totalPago.toFixed(2)}</td>
            <td></td>
          </tr>
        </table>
      `;
    } else if (reportType === "fornecedor" && fornecedor !== "todos") {
      const selectedSupplier = suppliers.find(s => s.id === fornecedor);
      content = `
        ${headerStyle}
        ${actionBar}
        <div class="header">
          <div class="company">${companySettings?.name || "Empresa"}</div>
          <div class="title">COMPRAS - ${selectedSupplier?.name?.toUpperCase() || "FORNECEDOR"}</div>
          <div class="period">Período: ${dateFrom || "Início"} até ${dateTo || "Hoje"}</div>
          <div class="period">Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
        </div>
        <div class="summary">
          <div class="summary-item"><span>Fornecedor:</span><span>${selectedSupplier?.name || "-"}</span></div>
          <div class="summary-item"><span>Total de Compras:</span><span>${supplierPurchasesData.expensesToAnalyze.length}</span></div>
          <div class="summary-item"><span>Valor Total:</span><span>R$ ${supplierPurchasesData.totalPurchased.toFixed(2)}</span></div>
        </div>
        <h3>Detalhamento de Compras</h3>
        <table>
          <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr>
          ${supplierPurchasesData.expensesToAnalyze.map((e) => `
            <tr>
              <td>${e.date ? (isNaN(new Date(e.date).getTime()) ? "-" : format(new Date(e.date), "dd/MM/yyyy")) : "-"}</td>
              <td>${e.description}</td>
              <td>${e.category || "-"}</td>
              <td>R$ ${e.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td>R$ ${supplierPurchasesData.totalPurchased.toFixed(2)}</td>
          </tr>
        </table>
      `;
    } else if (reportType === "top-produtos") {
      content = `
        ${headerStyle}
        ${actionBar}
        <div class="header">
          <div class="company">${companySettings?.name || "Empresa"}</div>
          <div class="title">PRODUTOS MAIS VENDIDOS</div>
          <div class="period">Período: ${dateFrom || "Início"} até ${dateTo || "Hoje"}</div>
          <div class="period">Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
        </div>
        <table>
          <tr><th>#</th><th>Produto</th><th>Quantidade</th><th>Faturamento</th></tr>
          ${topProductsData.map((p, i) => `
            <tr>
              <td>${i + 1}º</td>
              <td>${p.name}</td>
              <td>${p.quantity}</td>
              <td>R$ ${p.revenue.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="2">TOTAL</td>
            <td>${topProductsData.reduce((acc, p) => acc + p.quantity, 0)}</td>
            <td>R$ ${topProductsData.reduce((acc, p) => acc + p.revenue, 0).toFixed(2)}</td>
          </tr>
        </table>
      `;
    } else if (reportType === "top-clientes") {
      content = `
        ${headerStyle}
        ${actionBar}
        <div class="header">
          <div class="company">${companySettings?.name || "Empresa"}</div>
          <div class="title">CLIENTES QUE MAIS COMPRAM</div>
          <div class="period">Período: ${dateFrom || "Início"} até ${dateTo || "Hoje"}</div>
          <div class="period">Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
        </div>
        <table>
          <tr><th>#</th><th>Cliente</th><th>Pedidos</th><th>Total Comprado</th><th>Pago</th></tr>
          ${topCustomersData.map((c, i) => `
            <tr>
              <td>${i + 1}º</td>
              <td>${c.name}</td>
              <td>${c.orders}</td>
              <td>R$ ${c.total.toFixed(2)}</td>
              <td>R$ ${c.paid.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="2">TOTAL</td>
            <td>${topCustomersData.reduce((acc, c) => acc + c.orders, 0)}</td>
            <td>R$ ${topCustomersData.reduce((acc, c) => acc + c.total, 0).toFixed(2)}</td>
            <td>R$ ${topCustomersData.reduce((acc, c) => acc + c.paid, 0).toFixed(2)}</td>
          </tr>
        </table>
      `;
    } else if (reportType === "comissoes") {
      // Full commission report
      content = `
        ${headerStyle}
        ${actionBar}
        ${header.replace("COMISSOES", "COMISSÕES DOS VENDEDORES")}
        <div class="summary">
          <div class="summary-item"><span>Taxa de Comissão:</span><span>${commissionData.percentage}%</span></div>
          <div class="summary-item"><span>Total em Comissões:</span><span>R$ ${commissionData.totalCommission.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total de Vendedores:</span><span>${commissionData.bySeller.length}</span></div>
          <div class="summary-item"><span>Total de Vendas:</span><span>${commissionData.allOrders.length}</span></div>
        </div>
        <h3>Comissões por Vendedor</h3>
        <table>
          <tr><th>Vendedor</th><th>Qtd Vendas</th><th>Total Vendido</th><th>Comissão</th></tr>
          ${commissionData.bySeller.map((s) => `
            <tr>
              <td>${s.name}</td>
              <td>${s.ordersCount}</td>
              <td>R$ ${s.totalSales.toFixed(2)}</td>
              <td>R$ ${s.commission.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td>TOTAL</td>
            <td>${commissionData.allOrders.length}</td>
            <td>R$ ${commissionData.allOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0).toFixed(2)}</td>
            <td>R$ ${commissionData.totalCommission.toFixed(2)}</td>
          </tr>
        </table>
        <h3>Detalhamento de Vendas</h3>
        <table>
          <tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Vendedor</th><th>Valor Pago</th><th>Comissão</th></tr>
          ${commissionData.allOrders.map((o) => `
            <tr>
              <td>${o.createdAt ? (isNaN(new Date(o.createdAt).getTime()) ? "-" : format(new Date(o.createdAt), "dd/MM/yyyy")) : "-"}</td>
              <td>#${o.id.slice(-4)}</td>
              <td>${o.customerName}</td>
              <td>${o.sellerName || "-"}</td>
              <td>R$ ${(o.amountPaid || 0).toFixed(2)}</td>
              <td>R$ ${o.commissionValue.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="4">TOTAL</td>
            <td>R$ ${commissionData.allOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0).toFixed(2)}</td>
            <td>R$ ${commissionData.totalCommission.toFixed(2)}</td>
          </tr>
        </table>
      `;
    } else if (reportType === "comissoes-resumo") {
      // Only commission summary by seller
      content = `
        ${headerStyle}
        ${actionBar}
        ${header.replace("COMISSOES-RESUMO", "RESUMO DE COMISSÕES")}
        <div class="summary">
          <div class="summary-item"><span>Taxa de Comissão:</span><span>${commissionData.percentage}%</span></div>
          <div class="summary-item"><span>Total em Comissões:</span><span>R$ ${commissionData.totalCommission.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total de Vendedores:</span><span>${commissionData.bySeller.length}</span></div>
        </div>
        <h3>Comissões por Vendedor</h3>
        <table>
          <tr><th>Vendedor</th><th>Qtd Vendas</th><th>Total Vendido</th><th>Comissão</th><th>%</th></tr>
          ${commissionData.bySeller.map((s) => `
            <tr>
              <td>${s.name}</td>
              <td>${s.ordersCount}</td>
              <td>R$ ${s.totalSales.toFixed(2)}</td>
              <td>R$ ${s.commission.toFixed(2)}</td>
              <td>${commissionData.totalCommission > 0 ? ((s.commission / commissionData.totalCommission) * 100).toFixed(1) : 0}%</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td>TOTAL</td>
            <td>${commissionData.allOrders.length}</td>
            <td>R$ ${commissionData.allOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0).toFixed(2)}</td>
            <td>R$ ${commissionData.totalCommission.toFixed(2)}</td>
            <td>100%</td>
          </tr>
        </table>
      `;
    } else if (reportType.startsWith("comissoes-vendedor-")) {
      // Commission for specific seller
      const sellerName = reportType.replace("comissoes-vendedor-", "");
      const sellerData = commissionData.bySeller.find(s => s.name === sellerName);
      if (sellerData) {
        content = `
          ${headerStyle}
          ${actionBar}
          <div class="header">
            <div class="company">${companySettings?.name || "Empresa"}</div>
            <div class="title">COMISSÃO - ${sellerName.toUpperCase()}</div>
            <div class="period">Período: ${dateFrom || "Início"} até ${dateTo || "Hoje"}</div>
            <div class="period">Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
          </div>
          <div class="summary">
            <div class="summary-item"><span>Vendedor:</span><span>${sellerName}</span></div>
            <div class="summary-item"><span>Taxa de Comissão:</span><span>${commissionData.percentage}%</span></div>
            <div class="summary-item"><span>Total Vendido:</span><span>R$ ${sellerData.totalSales.toFixed(2)}</span></div>
            <div class="summary-item"><span>Total em Comissão:</span><span>R$ ${sellerData.commission.toFixed(2)}</span></div>
            <div class="summary-item"><span>Quantidade de Vendas:</span><span>${sellerData.ordersCount}</span></div>
          </div>
          <h3>Detalhamento de Vendas</h3>
          <table>
            <tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Valor Pago</th><th>Comissão</th></tr>
            ${sellerData.orders.map((o) => `
              <tr>
                <td>${o.createdAt ? (isNaN(new Date(o.createdAt).getTime()) ? "-" : format(new Date(o.createdAt), "dd/MM/yyyy")) : "-"}</td>
                <td>#${o.id.slice(-4)}</td>
                <td>${o.customerName}</td>
                <td>R$ ${(o.amountPaid || 0).toFixed(2)}</td>
                <td>R$ ${o.commissionValue.toFixed(2)}</td>
              </tr>
            `).join("")}
            <tr class="total-row">
              <td colspan="3">TOTAL</td>
              <td>R$ ${sellerData.totalSales.toFixed(2)}</td>
              <td>R$ ${sellerData.commission.toFixed(2)}</td>
            </tr>
          </table>
        `;
      }
    } else if (reportType === "comissoes-detalhes") {
      // Detailed commission orders
      content = `
        ${headerStyle}
        ${actionBar}
        ${header.replace("COMISSOES-DETALHES", "DETALHAMENTO DE VENDAS COM COMISSÃO")}
        <div class="summary">
          <div class="summary-item"><span>Taxa de Comissão:</span><span>${commissionData.percentage}%</span></div>
          <div class="summary-item"><span>Total em Comissões:</span><span>R$ ${commissionData.totalCommission.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total de Vendas:</span><span>${commissionData.allOrders.length}</span></div>
        </div>
        <h3>Detalhamento de Vendas</h3>
        <table>
          <tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Vendedor</th><th>Valor Pago</th><th>Comissão</th></tr>
          ${commissionData.allOrders.map((o) => `
            <tr>
              <td>${o.createdAt ? (isNaN(new Date(o.createdAt).getTime()) ? "-" : format(new Date(o.createdAt), "dd/MM/yyyy")) : "-"}</td>
              <td>#${o.id.slice(-4)}</td>
              <td>${o.customerName}</td>
              <td>${o.sellerName || "-"}</td>
              <td>R$ ${(o.amountPaid || 0).toFixed(2)}</td>
              <td>R$ ${o.commissionValue.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="4">TOTAL</td>
            <td>R$ ${commissionData.allOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0).toFixed(2)}</td>
            <td>R$ ${commissionData.totalCommission.toFixed(2)}</td>
          </tr>
        </table>
      `;
    }

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Relatório</title></head><body>${content}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
  };

  const paymentMethodLabel = (method?: string) => {
    const labels: Record<string, string> = { cash: "Dinheiro", card: "Cartão", pix: "PIX" };
    return method ? labels[method] || method : "-";
  };

  const reportTypes = [
    {
      id: "vendas",
      title: "Relatório de Vendas",
      description: "Visualize todas as vendas por período, vendedor e forma de pagamento",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    // Only show stock report if stock control is enabled
    ...(companySettings?.usesStock !== false ? [{
      id: "estoque",
      title: "Relatório de Estoque",
      description: "Controle de produtos em estoque e alertas de estoque baixo",
      icon: Package,
      color: "text-info",
      bgColor: "bg-info/10",
    }] : []),
    {
      id: "inadimplencia",
      title: "Relatório de Inadimplência",
      description: "Clientes com pagamentos pendentes e valores em aberto",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    // Only show commission report if commission is enabled
    ...(companySettings?.usesCommission ? [{
      id: "comissoes",
      title: "Relatório de Comissões",
      description: "Comissões dos vendedores sobre vendas realizadas",
      icon: DollarSign,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    }] : []),
  ];

  return (
    <MainLayout title="Relatórios">
      <div className="space-y-6">
        {/* Report Type Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isActive = activeTab === report.id;
            return (
              <Card
                key={report.id}
                className={`p-3 sm:p-5 cursor-pointer transition-all duration-200 border-2 ${
                  isActive
                    ? "ring-2 ring-primary border-primary shadow-lg"
                    : "border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/20"
                }`}
                onClick={() => setActiveTab(report.id)}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`p-2 sm:p-3 rounded-lg ${report.bgColor} transition-colors shrink-0`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${report.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base">{report.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                  {isActive && (
                    <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-primary shrink-0" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Filters Card */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            {/* Row 1: Dates and Seller */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data Inicial</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-7 sm:pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data Final</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-7 sm:pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
              </div>
              {/* Only show seller filter for admin/manager */}
              {!isSeller && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Vendedor</Label>
                  <Select value={vendedor} onValueChange={setVendedor}>
                    <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="todos">Todos</SelectItem>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isSeller && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Fornecedor</Label>
                  <Select value={fornecedor} onValueChange={setFornecedor}>
                    <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="todos">Todos</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {/* Row 2: Search and Actions */}
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[150px] max-w-[250px] space-y-1.5 relative">
                <Label className="text-xs">Buscar Cliente</Label>
                <div className="relative">
                  <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome do cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-7 sm:pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
                {/* Customer suggestions dropdown */}
                {customerSearch && customerSearch.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {customers
                      .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                      .slice(0, 8)
                      .map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                          onClick={() => setCustomerSearch(customer.name)}
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{customer.name}</span>
                          {customer.phone && (
                            <span className="text-xs text-muted-foreground ml-auto">{customer.phone}</span>
                          )}
                        </button>
                      ))}
                    {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum cliente encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePrint(activeTab)}
                  className="h-8 sm:h-9 gradient-primary text-primary-foreground text-xs sm:text-sm px-3"
                >
                  <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Customer Orders Results */}
        {customerSearch && customerOrders.length > 0 && (
          <Card className="p-4 border-2 border-primary/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Compras de "{customerSearch}" ({customerOrders.length} pedidos)
              </h3>
              <Button onClick={() => handlePrint("cliente")} variant="outline" size="sm" className="gap-1">
                <Printer className="h-3.5 w-3.5" />
                Imprimir
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerOrders.map((order) => {
                    const isPaid = order.paymentStatus === 'paid';
                    const isPartial = order.paymentStatus === 'partial';
                    const pendingAmount = order.total - (order.amountPaid || 0);
                    return (
                      <TableRow 
                        key={order.id} 
                        className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer"
                        onClick={() => handleOrderClick(order)}
                      >
                        <TableCell>{safeFormatDate(order.createdAt)}</TableCell>
                        <TableCell>#{order.id.slice(-4)}</TableCell>
                        <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                        <TableCell>R$ {(order.amountPaid || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={isPaid ? "default" : isPartial ? "secondary" : "destructive"}
                            className={isPaid ? "bg-success text-success-foreground" : ""}
                          >
                            {isPaid ? "Pago" : isPartial ? `Parcial (R$ ${pendingAmount.toFixed(2)})` : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(order);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between text-sm">
              <span className="text-muted-foreground">Total das compras:</span>
              <span className="font-bold">R$ {customerOrders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total pago:</span>
              <span className="font-bold text-success">R$ {customerOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total pendente:</span>
              <span className="font-bold text-destructive">
                R$ {customerOrders.reduce((acc, o) => acc + (o.total - (o.amountPaid || 0)), 0).toFixed(2)}
              </span>
            </div>
          </Card>
        )}

        {/* Report Content */}
        {activeTab === "vendas" && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => handlePrint("vendas-resumo")} variant="outline" size="sm" className="gap-1">
                <Printer className="h-3.5 w-3.5" />
                Resumo
              </Button>
              <Button onClick={() => handlePrint("vendas-detalhes")} variant="outline" size="sm" className="gap-1">
                <Printer className="h-3.5 w-3.5" />
                Detalhes
              </Button>
              <Button onClick={() => handlePrint("vendas")} className="gap-2 gradient-primary text-primary-foreground">
                <FileText className="h-4 w-4" />
                Relatório Completo
              </Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <Card 
                className="p-2.5 sm:p-4 border-2 border-success/30 shadow-md shadow-success/10 cursor-pointer transition-all duration-200 hover:bg-success/10 hover:border-success/50 hover:shadow-lg hover:shadow-success/20"
                onClick={() => handleStatsCardClick('all')}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-success/10 shrink-0">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Vendas</p>
                    <p className="text-sm sm:text-lg font-bold truncate">R$ {salesData.totalVendas.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card 
                className="p-2.5 sm:p-4 border-2 border-info/30 shadow-md shadow-info/10 cursor-pointer transition-all duration-200 hover:bg-info/10 hover:border-info/50 hover:shadow-lg hover:shadow-info/20"
                onClick={() => handleStatsCardClick('paid')}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-info/10 shrink-0">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-info" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Recebido</p>
                    <p className="text-sm sm:text-lg font-bold truncate">R$ {salesData.totalRecebido.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card 
                className="p-2.5 sm:p-4 border-2 border-warning/30 shadow-md shadow-warning/10 cursor-pointer transition-all duration-200 hover:bg-warning/10 hover:border-warning/50 hover:shadow-lg hover:shadow-warning/20"
                onClick={() => handleStatsCardClick('pending')}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10 shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
                    <p className="text-sm sm:text-lg font-bold truncate">R$ {salesData.totalPendente.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card 
                className="p-2.5 sm:p-4 border-2 border-primary/30 shadow-md shadow-primary/10 cursor-pointer transition-all duration-200 hover:bg-hover/10 hover:border-hover/50 hover:shadow-lg hover:shadow-hover/20"
                onClick={() => handleStatsCardClick('qty')}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Qtd Vendas</p>
                    <p className="text-sm sm:text-lg font-bold">{salesData.qtdVendas}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Expense and Profit Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <Card className="p-2.5 sm:p-4 border-2 border-destructive/30 shadow-md shadow-destructive/10 cursor-pointer transition-all duration-200 hover:bg-destructive/10 hover:border-destructive/50 hover:shadow-lg hover:shadow-destructive/20">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 shrink-0">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Gastos Fixos</p>
                    <p className="text-sm sm:text-lg font-bold text-destructive truncate">R$ {salesData.fixedExpensesApplied.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-2.5 sm:p-4 border-2 border-orange-500/30 shadow-md shadow-orange-500/10 cursor-pointer transition-all duration-200 hover:bg-orange-500/10 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/10 shrink-0">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Outras Desp.</p>
                    <p className="text-sm sm:text-lg font-bold text-orange-500 truncate">R$ {salesData.otherExpensesTotal.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-2.5 sm:p-4 border-2 border-destructive/30 shadow-md shadow-destructive/10 cursor-pointer transition-all duration-200 hover:bg-destructive/10 hover:border-destructive/50 hover:shadow-lg hover:shadow-destructive/20">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 shrink-0">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Desp.</p>
                    <p className="text-sm sm:text-lg font-bold text-destructive truncate">R$ {salesData.totalExpenses.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card className={`p-2.5 sm:p-4 border-2 cursor-pointer transition-all duration-200 ${salesData.lucroLiquido >= 0 ? 'bg-success/5 border-success/30 shadow-md shadow-success/10 hover:bg-success/10 hover:border-success/50 hover:shadow-lg hover:shadow-success/20' : 'bg-destructive/5 border-destructive/30 shadow-md shadow-destructive/10 hover:bg-destructive/10 hover:border-destructive/50 hover:shadow-lg hover:shadow-destructive/20'}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${salesData.lucroLiquido >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    <TrendingUp className={`h-4 w-4 sm:h-5 sm:w-5 ${salesData.lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Lucro Líquido</p>
                    <p className={`text-sm sm:text-lg font-bold truncate ${salesData.lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                      R$ {salesData.lucroLiquido.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Por Forma de Pagamento</h3>
                  <Button onClick={() => handlePrint("vendas-pagamento")} variant="ghost" size="sm" className="gap-1 h-7">
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span>Dinheiro</span>
                    <span className="font-medium">R$ {salesData.byPaymentMethod.cash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span>Cartão</span>
                    <span className="font-medium">R$ {salesData.byPaymentMethod.card.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span>PIX</span>
                    <span className="font-medium">R$ {salesData.byPaymentMethod.pix.toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Por Vendedor</h3>
                  {salesData.bySeller.length > 0 && (
                    <Button onClick={() => handlePrint("vendas-vendedor")} variant="ghost" size="sm" className="gap-1 h-7">
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {salesData.bySeller.map((seller) => (
                    <div key={seller.name} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span>{seller.name}</span>
                      <div className="text-right">
                        <span className="font-medium">R$ {seller.total.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-2">({seller.quantidade})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Top Products and Top Customers Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Produtos Mais Vendidos
                  </h3>
                  {topProductsData.length > 0 && (
                    <Button onClick={() => handlePrint("top-produtos")} variant="ghost" size="sm" className="gap-1 h-7">
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {topProductsData.length > 0 ? topProductsData.map((product, index) => (
                    <div key={product.name} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <span className="truncate max-w-[150px]">{product.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">R$ {product.revenue.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-2">({product.quantity}x)</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto vendido no período</p>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Clientes que Mais Compram
                  </h3>
                  {topCustomersData.length > 0 && (
                    <Button onClick={() => handlePrint("top-clientes")} variant="ghost" size="sm" className="gap-1 h-7">
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {topCustomersData.length > 0 ? topCustomersData.map((customer, index) => (
                    <div 
                      key={customer.name} 
                      className="flex justify-between items-center p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                      onClick={() => handleCustomerClick(customer.name)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <span className="truncate max-w-[150px]">{customer.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">R$ {customer.total.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-2">({customer.orders} pedidos)</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma venda no período</p>
                  )}
                </div>
              </Card>
            </div>

            {!isSeller && supplierPurchasesData.bySupplier.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Truck className="h-4 w-4 text-purple-500" />
                    Compras por Fornecedor
                    <Badge variant="secondary" className="ml-2">
                      Total: R$ {supplierPurchasesData.totalPurchased.toFixed(2)}
                    </Badge>
                  </h3>
                  {fornecedor !== "todos" && (
                    <Button onClick={() => handlePrint("fornecedor")} variant="outline" size="sm" className="gap-1">
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead className="text-center">Compras</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierPurchasesData.bySupplier.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{supplier.count}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-destructive">
                            R$ {supplier.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Seller Sales Table - Shows when a seller is selected */}
            {vendedor !== "todos" && (
              <Card className="p-4 border-2 border-primary/30">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Vendas de {vendedor} ({filteredOrders.length} pedidos)
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    <Button onClick={() => handlePrint("vendedor-resumo")} variant="outline" size="sm" className="gap-1 h-7 text-xs">
                      <Printer className="h-3 w-3" />
                      Resumo
                    </Button>
                    <Button onClick={() => handlePrint("vendedor-detalhes")} variant="outline" size="sm" className="gap-1 h-7 text-xs">
                      <Printer className="h-3 w-3" />
                      Detalhes
                    </Button>
                    <Button onClick={() => handlePrint("vendedor-completo")} variant="default" size="sm" className="gap-1 h-7 text-xs">
                      <Printer className="h-3 w-3" />
                      Completo
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Pago</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => {
                        const isPaid = order.paymentStatus === 'paid';
                        const isPartial = order.paymentStatus === 'partial';
                        const pendingAmount = order.total - (order.amountPaid || 0);
                        return (
                          <TableRow 
                            key={order.id} 
                            className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer"
                            onClick={() => handleOrderClick(order)}
                          >
                            <TableCell>{safeFormatDate(order.createdAt)}</TableCell>
                            <TableCell>#{order.id.slice(-4)}</TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                            <TableCell>R$ {(order.amountPaid || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={isPaid ? "default" : isPartial ? "secondary" : "destructive"}
                                className={isPaid ? "bg-success text-success-foreground" : ""}
                              >
                                {isPaid ? "Pago" : isPartial ? `Parcial` : "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOrderClick(order);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Detalhamento de Vendas</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const isPaid = order.paymentStatus === 'paid';
                      const isPartial = order.paymentStatus === 'partial';
                      return (
                        <TableRow 
                          key={order.id} 
                          className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer"
                          onClick={() => handleOrderClick(order)}
                        >
                          <TableCell>{safeFormatDate(order.createdAt)}</TableCell>
                          <TableCell>#{order.id.slice(-4)}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>{order.sellerName || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {paymentMethodLabel(order.paymentMethod)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={isPaid ? "default" : isPartial ? "secondary" : "destructive"}
                              className={isPaid ? "bg-success text-success-foreground" : ""}
                            >
                              {isPaid ? "Pago" : isPartial ? "Parcial" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">R$ {order.total.toFixed(2)}</TableCell>
                          <TableCell className="text-right">R$ {(order.amountPaid || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOrderClick(order);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Expenses Table */}
            {salesData.filteredExpenses.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Detalhamento de Despesas</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.filteredExpenses.map((expense) => (
                        <TableRow key={expense.id} className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer">
                          <TableCell>{safeFormatDate(expense.date)}</TableCell>
                          <TableCell>{expense.description.replace(/\s*\[.*\]$/, '')}</TableCell>
                          <TableCell>
                            <Badge variant={expense.category === 'Gasto Fixo' ? 'default' : 'outline'}>
                              {expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-destructive font-medium">
                            R$ {expense.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === "estoque" && companySettings?.usesStock !== false && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => handlePrint("estoque")} variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir Relatório
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="p-4 border-2 border-info/30 shadow-md shadow-info/10 cursor-pointer transition-all duration-200 hover:bg-info/10 hover:border-info/50 hover:shadow-lg hover:shadow-info/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Package className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Itens</p>
                    <p className="text-lg font-bold">{stockData.totalItems}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-2 border-success/30 shadow-md shadow-success/10 cursor-pointer transition-all duration-200 hover:bg-success/10 hover:border-success/50 hover:shadow-lg hover:shadow-success/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <DollarSign className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Estoque</p>
                    <p className="text-lg font-bold">R$ {stockData.totalValue.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-2 border-warning/30 shadow-md shadow-warning/10 cursor-pointer transition-all duration-200 hover:bg-warning/10 hover:border-warning/50 hover:shadow-lg hover:shadow-warning/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estoque Baixo</p>
                    <p className="text-lg font-bold">{stockData.lowStock.length}</p>
                  </div>
                </div>
              </Card>
            </div>

            {stockData.lowStock.length > 0 && (
              <Card className="p-4 border-warning/50">
                <h3 className="font-semibold mb-3 text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Produtos com Estoque Baixo
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Produto</TableHead>
                        <TableHead className="min-w-[100px] hidden sm:table-cell">Categoria</TableHead>
                        <TableHead className="text-right min-w-[60px]">Estoque</TableHead>
                        <TableHead className="text-right min-w-[60px] hidden sm:table-cell">Mínimo</TableHead>
                        <TableHead className="text-right min-w-[80px]">Preço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockData.lowStock.map((product) => (
                        <TableRow key={product.id} className="bg-warning/5 hover:bg-warning/15 border-b-2 border-transparent hover:border-warning/30 transition-all duration-200 cursor-pointer">
                          <TableCell className="font-medium">
                            <div className="truncate max-w-[180px]">{product.name}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{product.category}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{product.category}</TableCell>
                          <TableCell className="text-right text-warning font-bold">{product.stock}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{stockData.MIN_STOCK}</TableCell>
                          <TableCell className="text-right">R$ {product.price.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Todos os Produtos</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockData.products.map((product) => (
                      <TableRow key={product.id} className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer">
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right">{product.stock}</TableCell>
                        <TableCell className="text-right">R$ {product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {(product.price * product.stock).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "inadimplencia" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              {customerSearch && receivablesData.byCustomer.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Mostrando pendências de: <span className="font-semibold text-foreground">{customerSearch}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2 h-6 text-xs"
                    onClick={() => setCustomerSearch("")}
                  >
                    Limpar filtro
                  </Button>
                </div>
              )}
              <div className="ml-auto">
                <Button onClick={() => handlePrint("inadimplencia")} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir Relatório
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="p-4 border-2 border-destructive/30 shadow-md shadow-destructive/10 cursor-pointer transition-all duration-200 hover:bg-destructive/10 hover:border-destructive/50 hover:shadow-lg hover:shadow-destructive/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <DollarSign className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Pendente</p>
                    <p className="text-lg font-bold">R$ {receivablesData.totalPending.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-2 border-warning/30 shadow-md shadow-warning/10 cursor-pointer transition-all duration-200 hover:bg-warning/10 hover:border-warning/50 hover:shadow-lg hover:shadow-warning/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Users className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clientes Devedores</p>
                    <p className="text-lg font-bold">{receivablesData.byCustomer.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-2 border-info/30 shadow-md shadow-info/10 cursor-pointer transition-all duration-200 hover:bg-info/10 hover:border-info/50 hover:shadow-lg hover:shadow-info/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <FileText className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pedidos Pendentes</p>
                    <p className="text-lg font-bold">{receivablesData.pendingOrders.length}</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Clientes com Pendências</h3>
                <Button onClick={() => handlePrint("inadimplencia-clientes")} variant="outline" size="sm" className="gap-1">
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Valor Pendente</TableHead>
                      <TableHead className="text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivablesData.byCustomer.map((customer) => (
                      <TableRow 
                        key={customer.id} 
                        className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer"
                        onClick={() => handleCustomerClick(customer.name)}
                      >
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell className="text-right">{customer.orders}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">
                          R$ {customer.pendente.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerClick(customer.name);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Detalhamento de Pendências</h3>
                <Button onClick={() => handlePrint("inadimplencia-detalhes")} variant="outline" size="sm" className="gap-1">
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">Pendente</TableHead>
                      <TableHead className="text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivablesData.pendingOrders.map((order) => (
                      <TableRow 
                        key={order.id} 
                        className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer"
                        onClick={() => handleOrderClick(order)}
                      >
                        <TableCell>{safeFormatDate(order.createdAt)}</TableCell>
                        <TableCell>#{order.id.slice(-4)}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell className="text-right">R$ {order.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {(order.amountPaid || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">
                          R$ {(order.total - (order.amountPaid || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(order);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* Commissions Report */}
        {activeTab === "comissoes" && companySettings?.usesCommission && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => handlePrint("comissoes-resumo")} variant="outline" size="sm" className="gap-1">
                <Printer className="h-3.5 w-3.5" />
                Resumo
              </Button>
              <Button onClick={() => handlePrint("comissoes")} className="gap-2 gradient-primary text-primary-foreground">
                <FileText className="h-4 w-4" />
                Relatório Completo
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 border-2 border-orange-500/30 shadow-md shadow-orange-500/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <DollarSign className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Comissões</p>
                    <p className="text-lg font-bold text-orange-500">R$ {commissionData.totalCommission.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-2 border-success/30 shadow-md shadow-success/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Vendas</p>
                    <p className="text-lg font-bold">R$ {commissionData.allOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0).toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-2 border-primary/30 shadow-md shadow-primary/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vendedores</p>
                    <p className="text-lg font-bold">{commissionData.bySeller.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-2 border-info/30 shadow-md shadow-info/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <ShoppingCart className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa</p>
                    <p className="text-lg font-bold">{commissionData.percentage}%</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Commission by Seller */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Comissões por Vendedor</h3>
                <Button onClick={() => handlePrint("comissoes-resumo")} variant="ghost" size="sm" className="gap-1 h-7">
                  <Printer className="h-3.5 w-3.5" />
                </Button>
              </div>
              {commissionData.bySeller.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-center">Vendas</TableHead>
                        <TableHead className="text-right">Total Vendido</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                        <TableHead className="text-center">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionData.bySeller.map((seller) => (
                        <TableRow key={seller.id} className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200">
                          <TableCell className="font-medium">{seller.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{seller.ordersCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right">R$ {seller.totalSales.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-orange-500">
                            R$ {seller.commission.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="gap-1 h-7 text-xs"
                              onClick={() => handlePrint(`comissoes-vendedor-${seller.name}`)}
                            >
                              <Printer className="h-3 w-3" />
                              Imprimir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma comissão no período selecionado</p>
                </div>
              )}
            </Card>

            {/* Detailed Commission Orders */}
            {commissionData.allOrders.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Detalhamento de Vendas com Comissão</h3>
                  <Button onClick={() => handlePrint("comissoes-detalhes")} variant="outline" size="sm" className="gap-1">
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-right">Valor Pago</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionData.allOrders.slice(0, 50).map((order) => (
                        <TableRow 
                          key={order.id} 
                          className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer"
                          onClick={() => handleOrderClick(order)}
                        >
                          <TableCell>{safeFormatDate(order.createdAt)}</TableCell>
                          <TableCell>#{order.id.slice(-4)}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>{order.sellerName || "-"}</TableCell>
                          <TableCell className="text-right">R$ {(order.amountPaid || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium text-orange-500">
                            R$ {order.commissionValue.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {commissionData.allOrders.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Mostrando 50 de {commissionData.allOrders.length} vendas. Use a impressão para ver todos.
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        onStatusChange={handleStatusChange}
        onPrint={handlePrintOrder}
        onDelete={handleDeleteOrder}
      />

      {/* Customer Orders Dialog */}
      <Dialog open={customerOrdersDialogOpen} onOpenChange={setCustomerOrdersDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Pedidos de {selectedCustomerName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground">Total Compras</p>
                <p className="text-lg font-bold">
                  R$ {selectedCustomerOrders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                </p>
              </Card>
              <Card className="p-3 bg-success/10">
                <p className="text-xs text-muted-foreground">Total Pago</p>
                <p className="text-lg font-bold text-success">
                  R$ {selectedCustomerOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0).toFixed(2)}
                </p>
              </Card>
              <Card className="p-3 bg-destructive/10">
                <p className="text-xs text-muted-foreground">Total Pendente</p>
                <p className="text-lg font-bold text-destructive">
                  R$ {selectedCustomerOrders.reduce((acc, o) => acc + (o.total - (o.amountPaid || 0)), 0).toFixed(2)}
                </p>
              </Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCustomerOrders.map((order) => {
                  const isPaid = order.paymentStatus === 'paid';
                  const isPartial = order.paymentStatus === 'partial';
                  return (
                    <TableRow 
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setCustomerOrdersDialogOpen(false);
                        handleOrderClick(order);
                      }}
                    >
                      <TableCell>{safeFormatDate(order.createdAt)}</TableCell>
                      <TableCell>#{order.id.slice(-4)}</TableCell>
                      <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                      <TableCell>R$ {(order.amountPaid || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={isPaid ? "default" : isPartial ? "secondary" : "destructive"}
                          className={isPaid ? "bg-success text-success-foreground" : ""}
                        >
                          {isPaid ? "Pago" : isPartial ? "Parcial" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog - Shows orders based on card clicked */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {statsDialogTitle} ({statsDialogOrders.length} pedidos)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">
                  R$ {statsDialogOrders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                </p>
              </Card>
              <Card className="p-3 bg-success/10">
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="text-lg font-bold text-success">
                  R$ {statsDialogOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0).toFixed(2)}
                </p>
              </Card>
              <Card className="p-3 bg-destructive/10">
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="text-lg font-bold text-destructive">
                  R$ {statsDialogOrders.reduce((acc, o) => acc + (o.total - (o.amountPaid || 0)), 0).toFixed(2)}
                </p>
              </Card>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statsDialogOrders.map((order) => {
                    const isPaid = order.paymentStatus === 'paid';
                    const isPartial = order.paymentStatus === 'partial';
                    return (
                      <TableRow 
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setStatsDialogOpen(false);
                          handleOrderClick(order);
                        }}
                      >
                        <TableCell>{safeFormatDate(order.createdAt)}</TableCell>
                        <TableCell>#{order.id.slice(-4)}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{order.sellerName || "-"}</TableCell>
                        <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                        <TableCell>R$ {(order.amountPaid || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={isPaid ? "default" : isPartial ? "secondary" : "destructive"}
                            className={isPaid ? "bg-success text-success-foreground" : ""}
                          >
                            {isPaid ? "Pago" : isPartial ? "Parcial" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
