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
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { useSyncedCompanySettings } from "@/hooks/useSyncedCompanySettings";
import { useSupabaseUsers } from "@/hooks/useSupabaseUsers";
import { format } from "date-fns";

export default function Relatorios() {
  const { orders } = useSupabaseOrders();
  const { expenses } = useSupabaseExpenses();
  const { customers, products, fixedExpenses } = useStore();
  const { settings: companySettings } = useSyncedCompanySettings();
  const { users } = useSupabaseUsers();
  const { authUser } = useAuth();
  const [activeTab, setActiveTab] = useState("vendas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendedor, setVendedor] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Check if user is seller (restricted access)
  const isSeller = authUser?.role === 'seller';
  const currentUserName = authUser?.name;

  const sellers = users.filter((u) => u.role === "seller" || u.role === "manager");

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

  // Receivables report data with search filter
  const receivablesData = useMemo(() => {
    const pendingOrders = filteredOrders.filter((o) => (o.amountPaid || 0) < o.total);
    const totalPending = pendingOrders.reduce((acc, o) => acc + (o.total - (o.amountPaid || 0)), 0);

    const byCustomer = customers
      .map((customer) => {
        const customerOrders = pendingOrders.filter((o) => o.customerName === customer.name);
        const pendente = customerOrders.reduce((acc, o) => acc + (o.total - (o.amountPaid || 0)), 0);
        return {
          ...customer,
          pendente,
          orders: customerOrders.length,
        };
      })
      .filter((c) => c.pendente > 0)
      .filter((c) => {
        // Apply search filter
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return c.name.toLowerCase().includes(search) || 
               c.phone?.toLowerCase().includes(search);
      })
      .sort((a, b) => b.pendente - a.pendente);

    return { pendingOrders, totalPending, byCustomer };
  }, [filteredOrders, customers, searchTerm]);

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
    {
      id: "estoque",
      title: "Relatório de Estoque",
      description: "Controle de produtos em estoque e alertas de estoque baixo",
      icon: Package,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      id: "inadimplencia",
      title: "Relatório de Inadimplência",
      description: "Clientes com pagamentos pendentes e valores em aberto",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 items-end">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 sm:pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2 col-span-2 md:col-span-1">
              <Button
                onClick={() => handlePrint(activeTab)}
                variant="outline"
                className="h-8 sm:h-9 flex-1 text-xs sm:text-sm px-2"
              >
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
              <Button
                onClick={() => handlePrint(activeTab)}
                className="h-8 sm:h-9 flex-1 gradient-primary text-primary-foreground text-xs sm:text-sm px-2"
              >
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Report Content */}
        {activeTab === "vendas" && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button onClick={() => handlePrint("vendas")} variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={() => handlePrint("vendas")} className="gap-2 gradient-primary text-primary-foreground">
                <FileText className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <Card className="p-2.5 sm:p-4 border-2 border-success/30 shadow-md shadow-success/10 cursor-pointer transition-all duration-200 hover:bg-success/10 hover:border-success/50 hover:shadow-lg hover:shadow-success/20">
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
              <Card className="p-2.5 sm:p-4 border-2 border-info/30 shadow-md shadow-info/10 cursor-pointer transition-all duration-200 hover:bg-info/10 hover:border-info/50 hover:shadow-lg hover:shadow-info/20">
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
              <Card className="p-2.5 sm:p-4 border-2 border-warning/30 shadow-md shadow-warning/10 cursor-pointer transition-all duration-200 hover:bg-warning/10 hover:border-warning/50 hover:shadow-lg hover:shadow-warning/20">
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
              <Card className="p-2.5 sm:p-4 border-2 border-primary/30 shadow-md shadow-primary/10 cursor-pointer transition-all duration-200 hover:bg-hover/10 hover:border-hover/50 hover:shadow-lg hover:shadow-hover/20">
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
                <h3 className="font-semibold mb-3">Por Forma de Pagamento</h3>
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
                <h3 className="font-semibold mb-3">Por Vendedor</h3>
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
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer">
                        <TableCell>{safeFormatDate(order.createdAt)}</TableCell>
                        <TableCell>#{order.id.slice(-4)}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{order.sellerName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {paymentMethodLabel(order.paymentMethod)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">R$ {order.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {(order.amountPaid || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
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

        {activeTab === "estoque" && (
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
            <div className="flex justify-end">
              <Button onClick={() => handlePrint("inadimplencia")} variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir Relatório
              </Button>
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
              <h3 className="font-semibold mb-3">Clientes com Pendências</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Valor Pendente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivablesData.byCustomer.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer">
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell className="text-right">{customer.orders}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">
                          R$ {customer.pendente.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Detalhamento de Pendências</h3>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivablesData.pendingOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer">
                        <TableCell>{safeFormatDate(order.createdAt)}</TableCell>
                        <TableCell>#{order.id.slice(-4)}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell className="text-right">R$ {order.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {(order.amountPaid || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">
                          R$ {(order.total - (order.amountPaid || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
