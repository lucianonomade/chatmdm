import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, DollarSign, AlertTriangle, CheckCircle2, Clock, Eye, CreditCard, Banknote, Smartphone, ExternalLink, CalendarIcon, X, Users } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import { useStore } from "@/lib/store";
import { ServiceOrder } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useSyncedCompanySettings } from "@/hooks/useSyncedCompanySettings";
import { toast } from "sonner";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function ContasReceber() {
  const navigate = useNavigate();
  const { orders, updateOrder } = useSupabaseOrders();
  const { settings: companySettings } = useSyncedCompanySettings();
  const { authUser } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pix' | 'card'>('cash');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [pendingOrdersDialogOpen, setPendingOrdersDialogOpen] = useState(false);
  const [debtorsDialogOpen, setDebtorsDialogOpen] = useState(false);

  // Filter orders based on user role
  const accessibleOrders = authUser?.role === 'seller'
    ? orders.filter(o => o.sellerId === authUser.id)
    : orders;

  // Get only orders with pending payments
  const pendingOrders = accessibleOrders.filter(
    o => o.paymentStatus !== 'paid' && (o.remainingAmount || o.total) > 0
  );

  const filteredOrders = pendingOrders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase());
    
    // Date filter
    if (dateFrom || dateTo) {
      const orderDate = new Date(o.createdAt);
      if (dateFrom && dateTo) {
        if (!isWithinInterval(orderDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })) {
          return false;
        }
      } else if (dateFrom) {
        if (orderDate < startOfDay(dateFrom)) return false;
      } else if (dateTo) {
        if (orderDate > endOfDay(dateTo)) return false;
      }
    }
    
    return matchesSearch;
  });

  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Calculate totals
  const totalPendente = pendingOrders.reduce((sum, o) => sum + (o.remainingAmount || o.total), 0);
  const totalClientes = new Set(pendingOrders.map(o => o.customerId)).size;

  // Group orders by customer for debtors dialog
  const debtorsByCustomer = useMemo(() => {
    const grouped: Record<string, { customerName: string; customerId: string; orders: ServiceOrder[]; totalPending: number }> = {};
    
    pendingOrders.forEach((order) => {
      const key = order.customerId || order.customerName;
      if (!grouped[key]) {
        grouped[key] = {
          customerName: order.customerName,
          customerId: order.customerId || '',
          orders: [],
          totalPending: 0
        };
      }
      grouped[key].orders.push(order);
      grouped[key].totalPending += order.remainingAmount || order.total;
    });
    
    return Object.values(grouped).sort((a, b) => b.totalPending - a.totalPending);
  }, [pendingOrders]);

  const handleDarBaixa = (order: ServiceOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedOrder(order);
    setPaymentAmount((order.remainingAmount || order.total).toFixed(2));
    setPaymentDialogOpen(true);
  };

  const handleViewOrder = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };

  const handleGoToOrder = () => {
    if (selectedOrder) {
      setOrderDetailsOpen(false);
      navigate(`/ordens-servico?tab=${selectedOrder.status === 'pending' ? 'pending' : selectedOrder.status === 'production' ? 'production' : 'completed'}`);
    }
  };

  const handleConfirmPayment = () => {
    if (!selectedOrder) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    const remainingBefore = selectedOrder.remainingAmount || selectedOrder.total;
    const newRemaining = Math.max(0, remainingBefore - amount);
    const newAmountPaid = (selectedOrder.amountPaid || 0) + amount;

    const newPayment = {
      id: Math.random().toString(36).substr(2, 9),
      amount,
      date: new Date().toISOString(),
      method: paymentMethod
    };

    updateOrder({
      id: selectedOrder.id,
      data: {
        amountPaid: newAmountPaid,
        remainingAmount: newRemaining,
        paymentStatus: newRemaining === 0 ? 'paid' : 'partial',
        payments: [...(selectedOrder.payments || []), newPayment]
      }
    });

    toast.success(
      newRemaining === 0
        ? "Pagamento quitado com sucesso!"
        : `Pagamento de R$ ${amount.toFixed(2)} registrado. Restam R$ ${newRemaining.toFixed(2)}`
    );

    setPaymentDialogOpen(false);
    setSelectedOrder(null);
    setPaymentAmount("");
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Relatório de Contas a Receber</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: 'Courier New', monospace; padding: 20px; }
      .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
      .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
      .print-actions .btn-print { background: #22c55e; }
      .print-actions .btn-close { background: #ef4444; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
      th { font-weight: bold; background: #f5f5f5; }
      .text-right { text-align: right; }
      .total { margin-top: 20px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
      @media print { .print-actions { display: none !important; } }
    `);
    printWindow.document.write('</style></head><body>');

    printWindow.document.write(`
      <div class="print-actions">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
        <button class="btn-close" onclick="window.close()">✕ Fechar</button>
      </div>
    `);

    const receberPhones = [companySettings.phone, companySettings.phone2].filter(Boolean).join(' | ');
    printWindow.document.write(`
      <div class="header">
        <div style="font-weight: bold; font-size: 16px;">${companySettings.name}</div>
        <div>${companySettings.address}</div>
        <div>${receberPhones}</div>
        <div style="margin-top: 10px; font-weight: bold;">RELATÓRIO DE CONTAS A RECEBER</div>
        <div>${new Date().toLocaleDateString()}</div>
      </div>
    `);

    printWindow.document.write('<table>');
    printWindow.document.write('<thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th class="text-right">Total</th><th class="text-right">Pago</th><th class="text-right">Pendente</th></tr></thead>');
    printWindow.document.write('<tbody>');

    filteredOrders.forEach(order => {
      const remaining = order.remainingAmount || order.total;
      const paid = order.amountPaid || 0;

      printWindow.document.write(`
        <tr>
          <td>#${order.id}</td>
          <td>${order.customerName}</td>
          <td>${new Date(order.createdAt).toLocaleDateString()}</td>
          <td class="text-right">R$ ${order.total.toFixed(2)}</td>
          <td class="text-right">R$ ${paid.toFixed(2)}</td>
          <td class="text-right" style="font-weight: bold; color: #c00;">R$ ${remaining.toFixed(2)}</td>
        </tr>
      `);
    });

    printWindow.document.write('</tbody></table>');
    printWindow.document.write(`
      <div class="total">
        TOTAL PENDENTE: R$ ${totalPendente.toFixed(2)}
      </div>
    `);

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  const handlePrintFullPage = () => {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Pedidos & Pagamentos - Contas a Receber</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
      .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
      .print-actions .btn-print { background: #22c55e; }
      .print-actions .btn-close { background: #ef4444; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
      .header h1 { margin: 0 0 5px 0; font-size: 20px; }
      .header p { margin: 3px 0; font-size: 12px; color: #666; }
      .stats-grid { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 25px; }
      .stat-card { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
      .stat-card.warning { background: #fff8e6; border-color: #f59e0b; }
      .stat-card.primary { background: #e0f2fe; border-color: #3b82f6; }
      .stat-card.info { background: #ecfdf5; border-color: #10b981; }
      .stat-label { font-size: 11px; color: #666; margin-bottom: 5px; }
      .stat-value { font-size: 18px; font-weight: bold; }
      .stat-value.warning { color: #f59e0b; }
      .stat-value.primary { color: #3b82f6; }
      .stat-value.info { color: #10b981; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
      td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
      .text-right { text-align: right; }
      .text-success { color: #10b981; }
      .text-warning { color: #f59e0b; font-weight: bold; }
      .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; }
      .badge-partial { background: #fef3c7; color: #92400e; }
      .badge-pending { background: #fee2e2; color: #991b1b; }
      .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #333; display: flex; justify-content: space-between; }
      .footer-total { font-size: 14px; font-weight: bold; }
      .print-date { font-size: 10px; color: #666; }
      .installment-info { font-size: 10px; color: #666; margin-top: 3px; }
      @media print { .print-actions { display: none !important; } }
    `);
    printWindow.document.write('</style></head><body>');

    printWindow.document.write(`
      <div class="print-actions">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
        <button class="btn-close" onclick="window.close()">✕ Fechar</button>
      </div>
    `);

    // Header
    const receberDetailPhones = [companySettings.phone, companySettings.phone2].filter(Boolean).join(' | ');
    printWindow.document.write(`
      <div class="header">
        <h1>${companySettings.name}</h1>
        <p>${companySettings.address || ''}</p>
        <p>${receberDetailPhones} ${companySettings.email ? '• ' + companySettings.email : ''}</p>
        <p style="margin-top: 10px; font-size: 14px; font-weight: bold;">PEDIDOS & PAGAMENTOS - CONTAS A RECEBER</p>
      </div>
    `);

    // Stats Cards
    printWindow.document.write(`
      <div class="stats-grid">
        <div class="stat-card warning">
          <div class="stat-label">Total Pendente</div>
          <div class="stat-value warning">R$ ${totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="stat-card primary">
          <div class="stat-label">Pedidos em Aberto</div>
          <div class="stat-value primary">${pendingOrders.length}</div>
        </div>
        <div class="stat-card info">
          <div class="stat-label">Clientes Devedores</div>
          <div class="stat-value info">${totalClientes}</div>
        </div>
      </div>
    `);

    // Filter info
    if (dateFrom || dateTo) {
      const filterText = dateFrom && dateTo 
        ? `De ${format(dateFrom, "dd/MM/yyyy")} até ${format(dateTo, "dd/MM/yyyy")}`
        : dateFrom 
          ? `A partir de ${format(dateFrom, "dd/MM/yyyy")}`
          : `Até ${format(dateTo!, "dd/MM/yyyy")}`;
      printWindow.document.write(`<p style="font-size: 11px; color: #666; margin-bottom: 10px;"><strong>Filtro aplicado:</strong> ${filterText}</p>`);
    }

    // Table
    printWindow.document.write('<table>');
    printWindow.document.write('<thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th class="text-right">Total</th><th class="text-right">Pago</th><th class="text-right">Pendente</th><th>Status</th></tr></thead>');
    printWindow.document.write('<tbody>');

    filteredOrders.forEach(order => {
      const remaining = order.remainingAmount || order.total;
      const paid = order.amountPaid || 0;
      const statusClass = order.paymentStatus === 'partial' ? 'badge-partial' : 'badge-pending';
      const statusText = order.paymentStatus === 'partial' ? 'Parcial' : 'Pendente';
      
      // Check for installments
      const payments = order.payments || [];
      const pendingInstallments = payments.filter((p: any) => p.status === 'pending');
      let installmentInfo = '';
      if (pendingInstallments.length > 0) {
        const installmentValue = pendingInstallments[0].amount;
        installmentInfo = `<div class="installment-info">Parcelado: ${pendingInstallments.length}x de R$ ${installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>`;
      }

      printWindow.document.write(`
        <tr>
          <td>#${order.id}</td>
          <td>${order.customerName}</td>
          <td>${new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
          <td class="text-right">R$ ${order.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
          <td class="text-right text-success">R$ ${paid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
          <td class="text-right text-warning">R$ ${remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}${installmentInfo}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
        </tr>
      `);
    });

    printWindow.document.write('</tbody></table>');

    // Footer
    printWindow.document.write(`
      <div class="footer">
        <div class="footer-total">TOTAL PENDENTE: R$ ${totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        <div class="print-date">Impresso em: ${new Date().toLocaleString("pt-BR")}</div>
      </div>
    `);

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'pix': return <Smartphone className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <MainLayout title="Contas a Receber">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          <Card 
            className="border-2 border-warning/30 shadow-md hover:shadow-lg hover:border-warning/60 hover:bg-warning/10 transition-all duration-200 cursor-pointer"
            onClick={() => setPendingOrdersDialogOpen(true)}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-warning/10 flex items-center justify-center shadow-md shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Pendente</p>
                  <p className="text-base sm:text-xl font-bold text-warning truncate">
                    R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-2 border-primary/30 shadow-md hover:shadow-lg hover:border-primary/60 hover:bg-primary/10 transition-all duration-200 cursor-pointer"
            onClick={() => setPendingOrdersDialogOpen(true)}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shadow-md shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Pedidos em Aberto</p>
                  <p className="text-base sm:text-xl font-bold text-primary">{pendingOrders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-2 border-info/30 shadow-md hover:shadow-lg hover:border-info/60 hover:bg-info/10 transition-all duration-200 cursor-pointer"
            onClick={() => setDebtorsDialogOpen(true)}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-info/10 flex items-center justify-center shadow-md shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Clientes Devedores</p>
                  <p className="text-base sm:text-xl font-bold text-info">{totalClientes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou pedido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <PrintButton 
                label="Imprimir Página" 
                onClick={handlePrintFullPage} 
                className="flex-1 sm:flex-none"
              />
              <PrintButton 
                label="Relatório" 
                onClick={handlePrintReport} 
                className="flex-1 sm:flex-none"
              />
            </div>
          </div>
          
          {/* Date Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Filtrar por período:</span>
            <div className="flex flex-wrap gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="icon" onClick={clearDateFilter} className="h-9 w-9">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table className="table-fixed w-full" containerClassName="overflow-x-hidden">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold px-3 w-[110px]">Pedido</TableHead>
                  <TableHead className="font-semibold px-3 hidden sm:table-cell">Cliente</TableHead>
                  <TableHead className="font-semibold px-3 hidden md:table-cell w-[120px]">Data</TableHead>
                  <TableHead className="font-semibold px-3 text-right hidden lg:table-cell w-[120px]">Total</TableHead>
                  <TableHead className="font-semibold px-3 text-right hidden lg:table-cell w-[120px]">Pago</TableHead>
                  <TableHead className="font-semibold px-3 text-right w-[130px]">Pendente</TableHead>
                  <TableHead className="font-semibold px-3 hidden sm:table-cell w-[110px]">Status</TableHead>
                  <TableHead className="font-semibold px-3 text-right w-[92px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success opacity-50" />
                      <p className="text-muted-foreground font-medium">Nenhum pagamento pendente!</p>
                      <p className="text-sm text-muted-foreground">Todos os clientes estão em dia.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const remaining = order.remainingAmount || order.total;
                    const paid = order.amountPaid || 0;

                    return (
                      <TableRow 
                        key={order.id} 
                        className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer"
                        onClick={() => handleViewOrder(order)}
                      >
                        <TableCell className="px-3 py-3">
                          <div className="font-mono text-sm font-medium truncate">#{order.id}</div>
                          <div className="text-xs text-muted-foreground sm:hidden truncate">{order.customerName}</div>
                        </TableCell>
                        <TableCell className="font-medium hidden sm:table-cell px-3 py-3 truncate">{order.customerName}</TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell px-3 py-3 whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell px-3 py-3 whitespace-nowrap">
                          R$ {order.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-success hidden lg:table-cell px-3 py-3 whitespace-nowrap">
                          R$ {paid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-warning px-3 py-3 whitespace-nowrap">
                          R$ {remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell px-3 py-3">
                          <Badge className={
                            order.paymentStatus === 'partial'
                              ? "bg-warning/10 text-warning border-warning/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }>
                            {order.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-3 py-3">
                          <Button
                            size="icon"
                            className="gradient-primary text-primary-foreground h-9 w-9"
                            onClick={(e) => handleDarBaixa(order, e)}
                            aria-label="Receber"
                            title="Receber"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Pedido:</span>
                  <span className="font-mono font-bold">#{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{selectedOrder.customerName}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Total do Pedido:</span>
                  <span>R$ {selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Já Pago:</span>
                  <span className="text-success">R$ {(selectedOrder.amountPaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-medium">Valor Pendente:</span>
                  <span className="font-bold text-warning">
                    R$ {(selectedOrder.remainingAmount || selectedOrder.total).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment History */}
              {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Histórico de Pagamentos</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedOrder.payments.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(p.method)}
                          <span>{new Date(p.date).toLocaleDateString()}</span>
                        </div>
                        <span className="font-medium text-success">+ R$ {p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Valor do Pagamento (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4" />
                        Dinheiro
                      </div>
                    </SelectItem>
                    <SelectItem value="pix">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        PIX
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Cartão
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setPaymentDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 gradient-primary text-primary-foreground" onClick={handleConfirmPayment}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido #{selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{selectedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span>{new Date(selectedOrder.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline">
                    {selectedOrder.status === 'pending' ? 'Aguardando' : 
                     selectedOrder.status === 'production' ? 'Em Produção' : 
                     selectedOrder.status === 'finished' ? 'Finalizado' : 'Entregue'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Itens do Pedido</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                      <div>
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                        {item.variationName && <span className="text-muted-foreground ml-1">({item.variationName})</span>}
                      </div>
                      <span>R$ {item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold">R$ {selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pago:</span>
                  <span className="text-success">R$ {(selectedOrder.amountPaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-medium">Pendente:</span>
                  <span className="font-bold text-warning">
                    R$ {(selectedOrder.remainingAmount || selectedOrder.total).toFixed(2)}
                  </span>
                </div>
                
                {/* Installments info - show summary only */}
                {selectedOrder.payments && selectedOrder.payments.length > 1 && (() => {
                  const installmentEntries = selectedOrder.payments.filter((p) => {
                    const anyP = p as any;
                    return !anyP?.method || !anyP?.date;
                  });

                  const qty = installmentEntries.length > 0 ? installmentEntries.length : selectedOrder.payments.length;
                  const value = (installmentEntries[0]?.amount ?? selectedOrder.payments[0]?.amount ?? 0) as number;

                  return (
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          <span className="font-medium">Parcelamento:</span>
                        </div>
                        <span className="font-semibold text-primary">
                          {qty}x de R$ {value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Show payment method if no payments array but has paymentMethod */}
                {(!selectedOrder.payments || selectedOrder.payments.length === 0) && selectedOrder.paymentMethod && (
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      {selectedOrder.paymentMethod === 'cash' && <Banknote className="w-4 h-4 text-success" />}
                      {selectedOrder.paymentMethod === 'pix' && <Smartphone className="w-4 h-4 text-info" />}
                      {selectedOrder.paymentMethod === 'card' && <CreditCard className="w-4 h-4 text-primary" />}
                      <span className="font-medium">
                        {selectedOrder.paymentMethod === 'cash' && 'Dinheiro'}
                        {selectedOrder.paymentMethod === 'pix' && 'PIX'}
                        {selectedOrder.paymentMethod === 'card' && 'Cartão'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={handleGoToOrder}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Pedido Completo
                </Button>
                <Button 
                  className="flex-1 gradient-primary text-primary-foreground" 
                  onClick={() => {
                    setOrderDetailsOpen(false);
                    handleDarBaixa(selectedOrder);
                  }}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Receber Pagamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Pedidos Pendentes */}
      <Dialog open={pendingOrdersDialogOpen} onOpenChange={setPendingOrdersDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Pedidos Pendentes
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success opacity-50" />
                <p className="font-medium">Nenhum pagamento pendente!</p>
              </div>
            ) : (
              pendingOrders.map((order) => {
                const remaining = order.remainingAmount || order.total;
                const paid = order.amountPaid || 0;
                const isInstallment = order.payments && order.payments.length > 1;
                return (
                  <div 
                    key={order.id} 
                    className="p-3 rounded-lg border bg-card hover:bg-warning/5 transition-colors cursor-pointer"
                    onClick={() => {
                      setPendingOrdersDialogOpen(false);
                      handleViewOrder(order);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">Pedido #{order.id} • {new Date(order.createdAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <Badge 
                        variant="outline"
                        className={order.paymentStatus === 'partial' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}
                      >
                        {order.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}
                      </Badge>
                    </div>
                    
                    {/* Items preview */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs font-normal">
                          {item.quantity}x {item.name}
                        </Badge>
                      ))}
                      {order.items.length > 3 && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          +{order.items.length - 3} itens
                        </Badge>
                      )}
                    </div>
                    
                    {/* Payment details */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total:</span>{' '}
                        <span className="font-semibold">R$ {order.total.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pago:</span>{' '}
                        <span className="font-semibold text-success">R$ {paid.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Restante:</span>{' '}
                        <span className="font-bold text-warning">R$ {remaining.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* Installment info */}
                    {isInstallment && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Parcelado em {order.payments!.length}x de R$ {(order.total / order.payments!.length).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t pt-3 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Total Pendente:</span>
              <span className="text-xl font-bold text-warning">R$ {totalPendente.toFixed(2)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Clientes Devedores */}
      <Dialog open={debtorsDialogOpen} onOpenChange={setDebtorsDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-info" />
              Clientes Devedores
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3">
            {debtorsByCustomer.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success opacity-50" />
                <p className="font-medium">Nenhum cliente devedor!</p>
              </div>
            ) : (
              debtorsByCustomer.map((debtor) => (
                <div 
                  key={debtor.customerId || debtor.customerName} 
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  {/* Customer Header */}
                  <div className="p-3 bg-info/5 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-info" />
                      </div>
                      <div>
                        <p className="font-semibold">{debtor.customerName}</p>
                        <p className="text-xs text-muted-foreground">{debtor.orders.length} pedido(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Pendente</p>
                      <p className="font-bold text-info">R$ {debtor.totalPending.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Customer Orders */}
                  <div className="divide-y divide-border">
                    {debtor.orders.map((order) => {
                      const remaining = order.remainingAmount || order.total;
                      const paid = order.amountPaid || 0;
                      return (
                        <div 
                          key={order.id} 
                          className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setDebtorsDialogOpen(false);
                            handleViewOrder(order);
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">Pedido #{order.id}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            <Badge 
                              variant="outline"
                              className={order.paymentStatus === 'partial' ? 'bg-warning/10 text-warning text-xs' : 'bg-destructive/10 text-destructive text-xs'}
                            >
                              {order.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}
                            </Badge>
                          </div>
                          
                          {/* Items preview */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs font-normal">
                                {item.quantity}x {item.name}
                              </Badge>
                            ))}
                            {order.items.length > 2 && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                +{order.items.length - 2}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Payment details */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            <span>
                              <span className="text-muted-foreground">Total:</span>{' '}
                              <span className="font-medium">R$ {order.total.toFixed(2)}</span>
                            </span>
                            <span>
                              <span className="text-muted-foreground">Pago:</span>{' '}
                              <span className="font-medium text-success">R$ {paid.toFixed(2)}</span>
                            </span>
                            <span>
                              <span className="text-muted-foreground">Restante:</span>{' '}
                              <span className="font-bold text-warning">R$ {remaining.toFixed(2)}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t pt-3 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Total Geral Pendente:</span>
              <span className="text-xl font-bold text-warning">R$ {totalPendente.toFixed(2)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
