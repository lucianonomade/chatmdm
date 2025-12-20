import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DialogHeaderWithAction } from "@/components/ui/dialog-header-with-action";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { ServiceOrder } from "@/lib/types";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/hooks/useAuth";
import { playClickSound } from "@/hooks/useClickSound";
import { DollarSign, ShoppingCart, ClipboardList, CheckCircle2, Clock, Printer, Search, Banknote, ListFilter, ArrowRight, Bell, TrendingUp, CreditCard, BarChart3, MessageCircle } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAutoNotifications } from "@/hooks/useAutoNotifications";
import { DailyTasksDialog } from "@/components/DailyTasksDialog";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { OrdersStatusChart } from "@/components/dashboard/OrdersStatusChart";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OnboardingDialog, useOnboarding } from "@/components/OnboardingDialog";

export default function Dashboard() {
  const navigate = useNavigate();
  const { companySettings } = useStore();
  const { settings: cloudSettings } = useCompanySettings();
  const { orders, updateOrder, updateOrderStatus } = useSupabaseOrders();
  const { authUser } = useAuth();
  const { notifyOrderStatusChange } = useAutoNotifications();
  
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [receivedDialogOpen, setReceivedDialogOpen] = useState(false);
  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false);
  const [receivablesDialogOpen, setReceivablesDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [receivablesSearchTerm, setReceivablesSearchTerm] = useState("");
  const [lastPrintedType, setLastPrintedType] = useState<string | null>(null);
  const [dailyTasksOpen, setDailyTasksOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('week');
  
  // Onboarding
  const { showOnboarding, setShowOnboarding } = useOnboarding();

  // Show daily tasks dialog on first load (after login)
  useEffect(() => {
    if (authUser) {
      // Small delay to ensure sessionStorage is cleared from login
      const timer = setTimeout(() => {
        const hasSeenTasks = sessionStorage.getItem('dailyTasksSeen');
        if (!hasSeenTasks) {
          setDailyTasksOpen(true);
          sessionStorage.setItem('dailyTasksSeen', 'true');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authUser?.id]);

  // Helper function for status changes with notifications
  const handleStatusChangeWithNotification = (order: ServiceOrder, newStatus: ServiceOrder['status'], navigateTo?: string) => {
    const oldStatus = order.status;
    updateOrderStatus({ id: order.id, status: newStatus });
    setSelectedOrder(null);
    
    const statusLabels: Record<string, string> = {
      pending: 'Aguardando',
      production: 'Em Produção',
      finished: 'Finalizado',
      delivered: 'Entregue',
    };
    toast.success(`Status: ${statusLabels[newStatus]}`);
    
    // Send notification
    notifyOrderStatusChange(order.id, order.customerName, oldStatus, newStatus, order.sellerId);
    
    if (navigateTo) {
      navigate(navigateTo);
    }
  };

  // Filter orders based on user role
  const accessibleOrders = authUser?.role === 'seller'
    ? orders.filter(o => o.sellerId === authUser.id)
    : orders;

  // Today's data
  const todaysOrders = accessibleOrders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const salesToday = todaysOrders.reduce((acc, curr) => acc + curr.total, 0);

  const receivedToday = accessibleOrders.reduce((acc, order) => {
    const today = new Date().toDateString();
    const paymentsToday = order.payments?.filter(p => new Date(p.date).toDateString() === today) || [];
    return acc + paymentsToday.reduce((sum, p) => sum + p.amount, 0);
  }, 0);

  // Receivables
  const receivables = accessibleOrders.filter(o =>
    (o.paymentStatus === 'pending' || o.paymentStatus === 'partial') &&
    (o.customerName.toLowerCase().includes(receivablesSearchTerm.toLowerCase()) || o.id.includes(receivablesSearchTerm))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalReceivable = receivables.reduce((acc, curr) => acc + (curr.remainingAmount || (curr.total - (curr.amountPaid || 0))), 0);

  // Stats
  const pendingOrders = accessibleOrders.filter(o => o.status === 'production' || o.status === 'pending').length;
  const finishedOrders = accessibleOrders.filter(o => o.status === 'finished').length;
  const totalOrders = accessibleOrders.length;

  const stats = [
    { title: "Em Produção", value: pendingOrders, icon: Clock, color: "text-warning", bg: "bg-warning/10", href: '/ordens-servico' },
    { title: "Finalizadas", value: finishedOrders, icon: CheckCircle2, color: "text-info", bg: "bg-info/10", href: '/ordens-servico' },
    { title: "Total de Pedidos", value: totalOrders, icon: ClipboardList, color: "text-muted-foreground", bg: "bg-muted", href: '/ordens-servico' }
  ];

  // Print functions
  const handlePrintDailyReport = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Relatório de Vendas</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: 'Courier New', monospace; padding: 20px; }
      .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
      .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
      .print-actions .btn-print { background: #22c55e; }
      .print-actions .btn-close { background: #ef4444; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
      th { font-weight: bold; }
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

    const dailyPhones = [companySettings.phone, cloudSettings?.phone2].filter(Boolean).join(' | ');
    printWindow.document.write(`
      <div class="header">
        <div style="font-weight: bold; font-size: 16px;">${companySettings.name}</div>
        <div>${companySettings.address}</div>
        <div>${dailyPhones}</div>
        <div style="margin-top: 10px;">RELATÓRIO DE VENDAS DO DIA</div>
        <div>${new Date().toLocaleDateString()}</div>
      </div>
    `);

    printWindow.document.write('<table>');
    printWindow.document.write('<thead><tr><th>Hora</th><th>Cliente</th><th>Itens</th><th class="text-right">Valor</th></tr></thead>');
    printWindow.document.write('<tbody>');

    todaysOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).forEach(order => {
      const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const items = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
      printWindow.document.write(`<tr><td>${time}</td><td>${order.customerName}</td><td>${items}</td><td class="text-right">R$ ${order.total.toFixed(2)}</td></tr>`);
    });

    printWindow.document.write('</tbody></table>');
    printWindow.document.write(`<div class="total">TOTAL DO DIA: R$ ${salesToday.toFixed(2)}</div>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  const handlePrintReceivedToday = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Relatório de Recebimentos</title>');
    printWindow.document.write('<style>body { font-family: monospace; padding: 20px; } .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; } .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); } .print-actions .btn-print { background: #22c55e; } .print-actions .btn-close { background: #ef4444; } table { width: 100%; border-collapse: collapse; margin-top: 10px; } th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; } .text-right { text-align: right; } .total { margin-top: 20px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; } .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; } @media print { .print-actions { display: none !important; } }</style></head><body>');
    printWindow.document.write(`<div class="print-actions"><button class="btn-print" onclick="window.print()">🖨️ Imprimir</button><button class="btn-close" onclick="window.close()">✕ Fechar</button></div>`);
    const receivedPhones = [companySettings.phone, cloudSettings?.phone2].filter(Boolean).join(' | ');
    printWindow.document.write(`<div class="header"><div style="font-weight: bold; font-size: 16px;">${companySettings.name}</div><div>${companySettings.address}</div><div>${receivedPhones}</div><div style="margin-top: 10px;">RELATÓRIO DE PEDIDOS DO DIA (RECEBIDO HOJE)</div><div>${new Date().toLocaleDateString()}</div></div>`);

    printWindow.document.write('<table><thead><tr><th>Pedido</th><th>Cliente</th><th>Status</th><th class="text-right">Total</th><th class="text-right">Pago</th></tr></thead><tbody>');

    let totalOrdersSum = 0;
    let totalReceived = 0;

    todaysOrders.forEach(order => {
      const paid = order.amountPaid ?? (order.paymentStatus === 'paid' ? order.total : 0);
      totalOrdersSum += order.total;
      totalReceived += paid;
      const statusLabel = order.status === 'finished' ? 'Finalizado' : order.status === 'production' ? 'Produção' : 'Pendente';
      printWindow.document.write(`<tr><td>#${order.id}</td><td>${order.customerName}</td><td>${statusLabel}</td><td class="text-right">R$ ${order.total.toFixed(2)}</td><td class="text-right">R$ ${paid.toFixed(2)}</td></tr>`);
    });

    printWindow.document.write('</tbody></table>');
    printWindow.document.write(`<div class="total"><div>TOTAL EM PEDIDOS: R$ ${totalOrdersSum.toFixed(2)}</div><div style="margin-top: 5px; font-size: 18px;">TOTAL RECEBIDO (PAGO): R$ ${totalReceived.toFixed(2)}</div></div>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  const handlePrintReceivablesReport = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Relatório de Contas a Receber</title>');
    printWindow.document.write('<style>body { font-family: monospace; padding: 20px; } .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; } .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); } .print-actions .btn-print { background: #22c55e; } .print-actions .btn-close { background: #ef4444; } table { width: 100%; border-collapse: collapse; margin-top: 10px; } th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; } .text-right { text-align: right; } .total { margin-top: 20px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; } .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; } @media print { .print-actions { display: none !important; } }</style></head><body>');
    printWindow.document.write(`<div class="print-actions"><button class="btn-print" onclick="window.print()">🖨️ Imprimir</button><button class="btn-close" onclick="window.close()">✕ Fechar</button></div>`);
    const receivablesPhones = [companySettings.phone, cloudSettings?.phone2].filter(Boolean).join(' | ');
    printWindow.document.write(`<div class="header"><div style="font-weight: bold; font-size: 16px;">${companySettings.name}</div><div>${companySettings.address}</div><div>${receivablesPhones}</div><div style="margin-top: 10px;">RELATÓRIO DE CONTAS A RECEBER</div><div>${new Date().toLocaleDateString()}</div></div>`);
    printWindow.document.write('<table><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th class="text-right">Total</th><th class="text-right">Pago</th><th class="text-right">Restante</th></tr></thead><tbody>');

    let totalSum = 0;
    receivables.forEach(order => {
      const paid = order.amountPaid || 0;
      const remaining = order.remainingAmount || (order.total - paid);
      totalSum += remaining;
      printWindow.document.write(`<tr><td>#${order.id}</td><td>${order.customerName}</td><td>${new Date(order.createdAt).toLocaleDateString()}</td><td class="text-right">R$ ${order.total.toFixed(2)}</td><td class="text-right">R$ ${paid.toFixed(2)}</td><td class="text-right font-bold">R$ ${remaining.toFixed(2)}</td></tr>`);
    });

    printWindow.document.write('</tbody></table>');
    printWindow.document.write(`<div class="total">TOTAL A RECEBER: R$ ${totalSum.toFixed(2)}</div>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  const handlePrintOrdersDialog = () => {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return;

    const filteredOrdersList = accessibleOrders.filter(o => 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm)
    );

    printWindow.document.write('<html><head><title>Pedidos & Pagamentos</title>');
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
      .stat-label { font-size: 11px; color: #666; margin-bottom: 5px; }
      .stat-value { font-size: 18px; font-weight: bold; }
      .order-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
      .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
      .order-id { font-weight: bold; font-size: 14px; }
      .order-customer { font-weight: 600; }
      .order-date { font-size: 11px; color: #666; }
      .order-items { margin: 10px 0; }
      .order-item { display: inline-block; background: #f3f4f6; padding: 3px 8px; border-radius: 4px; font-size: 10px; margin: 2px; }
      .order-values { display: flex; gap: 20px; font-size: 12px; }
      .order-values span { color: #666; }
      .order-values strong { color: #333; }
      .text-success { color: #10b981; }
      .text-warning { color: #f59e0b; }
      .text-danger { color: #ef4444; }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; }
      .badge-paid { background: #d1fae5; color: #065f46; }
      .badge-partial { background: #fef3c7; color: #92400e; }
      .badge-pending { background: #fee2e2; color: #991b1b; }
      .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #333; display: flex; justify-content: space-between; }
      .footer-total { font-size: 14px; font-weight: bold; }
      .print-date { font-size: 10px; color: #666; }
      .installment-info { font-size: 10px; color: #3b82f6; margin-left: 10px; }
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
    const ordersPhones = [companySettings.phone, cloudSettings?.phone2].filter(Boolean).join(' | ');
    printWindow.document.write(`
      <div class="header">
        <h1>${companySettings.name}</h1>
        <p>${companySettings.address || ''}</p>
        <p>${ordersPhones} ${companySettings.email ? '• ' + companySettings.email : ''}</p>
        <p style="margin-top: 10px; font-size: 14px; font-weight: bold;">PEDIDOS & PAGAMENTOS</p>
      </div>
    `);

    // Stats
    const totalOrders = filteredOrdersList.length;
    const totalValue = filteredOrdersList.reduce((sum, o) => sum + o.total, 0);
    const totalPaid = filteredOrdersList.reduce((sum, o) => sum + (o.amountPaid || (o.paymentStatus === 'paid' ? o.total : 0)), 0);
    const totalPending = filteredOrdersList.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);

    printWindow.document.write(`
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total de Pedidos</div>
          <div class="stat-value">${totalOrders}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Valor Total</div>
          <div class="stat-value">R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Pago</div>
          <div class="stat-value text-success">R$ ${totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Pendente</div>
          <div class="stat-value text-warning">R$ ${totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
    `);

    // Orders
    filteredOrdersList.forEach(order => {
      const paid = order.amountPaid || (order.paymentStatus === 'paid' ? order.total : 0);
      const remaining = order.remainingAmount || 0;
      const statusClass = order.paymentStatus === 'paid' ? 'badge-paid' : order.paymentStatus === 'partial' ? 'badge-partial' : 'badge-pending';
      const statusText = order.paymentStatus === 'paid' ? 'Pago' : order.paymentStatus === 'partial' ? 'Parcial' : 'Pendente';
      
      // Check for installments
      let installmentInfo = '';
      if (order.payments && order.payments.length > 1) {
        const installmentEntries = order.payments.filter((p: any) => !p?.method || !p?.date);
        const qty = installmentEntries.length > 0 ? installmentEntries.length : order.payments.length;
        const value = (installmentEntries[0]?.amount ?? order.payments[0]?.amount ?? 0) as number;
        installmentInfo = `<span class="installment-info">Parcelado: ${qty}x de R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>`;
      }

      printWindow.document.write(`
        <div class="order-card">
          <div class="order-header">
            <div>
              <span class="order-id">#${order.id}</span>
              <span class="order-customer" style="margin-left: 15px;">${order.customerName}</span>
              <span class="order-date" style="margin-left: 15px;">${new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
            <span class="badge ${statusClass}">${statusText}</span>
          </div>
          <div class="order-items">
            ${order.items.slice(0, 5).map(item => `<span class="order-item">${item.quantity}x ${item.name}</span>`).join('')}
            ${order.items.length > 5 ? `<span class="order-item">+ ${order.items.length - 5} itens</span>` : ''}
          </div>
          <div class="order-values">
            <div><span>Total:</span> <strong>R$ ${order.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
            <div><span>Pago:</span> <strong class="text-success">R$ ${paid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
            ${remaining > 0 ? `<div><span>Restante:</span> <strong class="text-danger">R$ ${remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>` : ''}
            ${installmentInfo}
          </div>
        </div>
      `);
    });

    // Footer
    printWindow.document.write(`
      <div class="footer">
        <div class="footer-total">TOTAL: R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | PAGO: R$ ${totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | PENDENTE: R$ ${totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        <div class="print-date">Impresso em: ${new Date().toLocaleString("pt-BR")}</div>
      </div>
    `);

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  const handlePrintDoc = (order: ServiceOrder, type: 'receipt' | 'order' | 'production') => {
    setLastPrintedType(type);
    
    setTimeout(() => {
      const width = type === 'receipt' ? 400 : 800;
      const printWindow = window.open('', '', `height=600,width=${width}`);
      if (!printWindow) return;

      const title = type === 'order' ? 'PEDIDO' : type === 'production' ? 'ORDEM DE PRODUÇÃO' : 'RECIBO';
      const showPrices = type !== 'production';

      printWindow.document.write(`<html><head><title>${title} #${order.id}</title><style>body { font-family: 'Courier New', monospace; padding: 20px; font-size: ${type === 'receipt' ? '12px' : '14px'}; max-width: ${type === 'receipt' ? '300px' : '100%'}; margin: 0 auto; } .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; } .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); } .print-actions .btn-print { background: #22c55e; } .print-actions .btn-close { background: #ef4444; } .text-center { text-align: center; } .text-right { text-align: right; } .font-bold { font-weight: bold; } .border-b { border-bottom: 1px dashed #000; } table { width: 100%; border-collapse: collapse; margin-top: 10px; } th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f8f9fa; } .header-section { margin-bottom: 20px; text-align: center; } .info-section { margin-bottom: 20px; } .total-section { margin-top: 20px; text-align: right; font-size: 1.2em; font-weight: bold; } .box { border: 2px solid #000; padding: 15px; margin-top: 8px; font-size: 16px; font-weight: bold; background: #f8f9fa; } .finishing-box { border: 2px solid #333; padding: 8px 12px; margin-top: 8px; font-size: 15px; font-weight: bold; background: #eee; display: inline-block; } @media print { .print-actions { display: none !important; } }</style></head><body>`);
      printWindow.document.write(`<div class="print-actions"><button class="btn-print" onclick="window.print()">🖨️ Imprimir</button><button class="btn-close" onclick="window.close()">✕ Fechar</button></div>`);

      const orderPhones = [companySettings.phone, cloudSettings?.phone2].filter(Boolean).join(' | ');
      printWindow.document.write(`<div class="header-section"><div class="font-bold" style="font-size: 1.2em;">${companySettings.name}</div><div>${companySettings.address}</div><div>${orderPhones}</div><div style="margin-top: 10px; font-weight: bold; font-size: 1.5em;">${title}</div></div>`);
      printWindow.document.write(`<div class="info-section border-b" style="padding-bottom: 8px;"><div style="display: flex; justify-content: space-between;"><div><div><strong>Data:</strong> ${new Date(order.createdAt).toLocaleString()}</div><div><strong>Pedido:</strong> #${order.id}</div></div><div class="text-right"><div><strong>Cliente:</strong> ${order.customerName}</div>${order.sellerName ? `<div><strong>Vendedor:</strong> ${order.sellerName}</div>` : ''}</div></div></div>`);

      if (type === 'receipt') {
        printWindow.document.write('<div class="font-bold" style="margin-bottom: 8px;">ITENS</div>');
        order.items.forEach(item => {
          printWindow.document.write(`<div style="margin-bottom: 8px;"><div class="font-bold">${item.quantity}x ${item.name}</div>${item.variationName ? `<div style="font-size: 0.9em;">${item.variationName}</div>` : ''}${showPrices ? `<div class="text-right">R$ ${item.total.toFixed(2)}</div>` : ''}</div>`);
        });
      } else {
        printWindow.document.write(`<table><thead><tr><th style="width: 60%">Item / Detalhes</th><th style="width: 10%; text-align: center;">Qtd</th>${showPrices ? '<th style="width: 15%; text-align: right;">Unit.</th><th style="width: 15%; text-align: right;">Total</th>' : ''}</tr></thead><tbody>`);
        order.items.forEach(item => {
          const unitPrice = item.total / item.quantity;
          printWindow.document.write(`<tr><td style="padding-bottom: 20px;"><div class="font-bold" style="font-size: 1.2em;">${item.name}</div>${item.variationName ? `<div>${item.variationName}</div>` : ''}${item.dimensions ? `<div style="font-size: 0.9em;">Medidas: ${item.dimensions}</div>` : ''}${item.finishing ? `<div class="finishing-box">ACABAMENTO: ${item.finishing.toUpperCase()}</div>` : ''}${item.customDescription ? `<div class="box">OBS: ${item.customDescription.toUpperCase()}</div>` : ''}</td><td style="text-align: center; vertical-align: top; font-size: 1.2em; font-weight: bold;">${item.quantity}</td>${showPrices ? `<td style="text-align: right; vertical-align: top;">R$ ${unitPrice.toFixed(2)}</td><td style="text-align: right; vertical-align: top;">R$ ${item.total.toFixed(2)}</td>` : ''}</tr>`);
        });
        printWindow.document.write('</tbody></table>');
      }

      if (showPrices) {
        const paid = order.amountPaid ?? (order.paymentStatus === 'paid' ? order.total : 0);
        const remaining = order.remainingAmount ?? (order.total - paid);
        printWindow.document.write(`<div class="total-section"><div>TOTAL: R$ ${order.total.toFixed(2)}</div>${paid < order.total ? `<div style="font-size: 0.9em; color: #666; margin-top: 4px;">Valor Pago: R$ ${paid.toFixed(2)}</div><div style="font-size: 0.9em; font-weight: bold; margin-top: 4px;">Falta Pagar: R$ ${remaining.toFixed(2)}</div>` : `<div style="font-size: 0.9em; color: #666; margin-top: 4px;">PAGAMENTO TOTAL REALIZADO</div>`}</div>`);
      }

      if (type === 'production') {
        printWindow.document.write(`<div style="margin-top: 40px; border: 2px solid #000; padding: 10px;"><div style="font-weight: bold; margin-bottom: 40px;">OBSERVAÇÕES DE PRODUÇÃO:</div><div style="border-bottom: 1px dotted #999; margin-bottom: 20px;"></div><div style="border-bottom: 1px dotted #999; margin-bottom: 20px;"></div></div><div style="margin-top: 20px; display: flex; justify-content: space-between;"><div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Visto Produção</div><div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Visto Conferência</div></div>`);
      } else {
        printWindow.document.write(`<div class="text-center" style="margin-top: 20px; padding-top: 8px; border-top: 1px dashed #000;">Obrigado pela preferência!</div>`);
      }

      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
    }, 100);
  };

  const handleReceivePayment = (order: ServiceOrder) => {
    const remaining = order.remainingAmount || (order.total - (order.amountPaid || 0));
    updateOrder({
      id: order.id,
      data: {
        paymentStatus: 'paid',
        amountPaid: order.total,
        remainingAmount: 0,
        payments: [
          ...(order.payments || []),
          { id: Date.now().toString(), amount: remaining, date: new Date().toISOString(), method: 'cash' }
        ]
      }
    });
    toast.success("Pagamento recebido!");
  };

  const handlePrintDashboard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const today = new Date().toLocaleDateString('pt-BR');
    const paidOrdersTotal = accessibleOrders.filter(o => o.paymentStatus === 'paid').reduce((acc, curr) => acc + curr.total, 0);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Dashboard - ${companySettings.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
            .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            .print-actions .btn-print { background: #22c55e; }
            .print-actions .btn-close { background: #ef4444; }
            h1 { text-align: center; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
            .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #333; }
            .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .text-right { text-align: right; }
            .text-success { color: #22c55e; }
            .text-warning { color: #f59e0b; }
            .text-destructive { color: #ef4444; }
            @media print { .print-actions { display: none !important; } body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="print-actions">
            <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
            <button class="btn-close" onclick="window.close()">✕ Fechar</button>
          </div>
          <h1>${companySettings.name}</h1>
          <p class="subtitle">Relatório do Dashboard - ${today}</p>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-value text-success">R$ ${paidOrdersTotal.toFixed(2)}</div>
              <div class="stat-label">Total Vendas (Pagas)</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${accessibleOrders.length}</div>
              <div class="stat-label">Total de Pedidos</div>
            </div>
            <div class="stat-card">
              <div class="stat-value text-warning">R$ ${totalReceivable.toFixed(2)}</div>
              <div class="stat-label">Contas a Receber</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Últimas Ordens de Serviço</div>
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Itens</th>
                  <th class="text-right">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${accessibleOrders.slice(0, 10).map(order => `
                  <tr>
                    <td>#${order.id}</td>
                    <td>${order.customerName}</td>
                    <td>${order.items.length} itens</td>
                    <td class="text-right">R$ ${order.total.toFixed(2)}</td>
                    <td>${order.status === 'production' ? 'Produção' : order.status === 'finished' ? 'Pronto' : order.status === 'delivered' ? 'Entregue' : 'Pendente'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Contas a Receber</div>
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th class="text-right">Total</th>
                  <th class="text-right">Pago</th>
                  <th class="text-right">Restante</th>
                </tr>
              </thead>
              <tbody>
                ${receivables.slice(0, 10).map(order => {
                  const paid = order.amountPaid || 0;
                  const remaining = order.remainingAmount || (order.total - paid);
                  return `
                    <tr>
                      <td>#${order.id}</td>
                      <td>${order.customerName}</td>
                      <td class="text-right">R$ ${order.total.toFixed(2)}</td>
                      <td class="text-right text-success">R$ ${paid.toFixed(2)}</td>
                      <td class="text-right text-destructive">R$ ${remaining.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <MainLayout title="Visão Geral">
      {/* Header with Print Button */}
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={handlePrintDashboard} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir Dashboard
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 mb-4 lg:mb-8">
        {stats.map((stat, index) => (
          <Card
            key={index}
            role="button"
            tabIndex={0}
            className={`border-2 border-border/50 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/40 hover:bg-muted/30 active:bg-muted/50`}
            onClick={() => {
              playClickSound();
              navigate(stat.href);
            }}
          >
            <CardContent className="p-4 lg:p-6 flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                <h3 className="text-xl lg:text-2xl font-bold">{stat.value}</h3>
              </div>
              <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} shadow-md`}>
                <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-4 lg:mb-8">
        {/* Recent Orders */}
        <Card className="border-none shadow-soft">
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Últimas Ordens de Serviço</CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-0 lg:pt-0">
            <div className="space-y-2 lg:space-y-4">
              {accessibleOrders.slice(0, 5).map(order => (
                <button
                  key={order.id}
                  className="w-full flex items-center justify-between p-3 lg:p-4 bg-muted/20 rounded-lg border-2 border-border/50 hover:bg-hover/10 hover:border-hover/40 transition-all duration-200 cursor-pointer text-left shadow-sm hover:shadow-md active:bg-hover/20"
                  onClick={() => {
                    playClickSound();
                    setSelectedOrder(order);
                  }}
                >
                  <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-background flex items-center justify-center font-bold text-[10px] lg:text-xs border-2 border-border/50 shadow-sm shrink-0">
                      #{order.id}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm lg:text-base truncate">{order.customerName}</p>
                      <p className="text-xs lg:text-sm text-muted-foreground">{order.items.length} itens</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-bold text-sm lg:text-base">R$ {order.total.toFixed(2)}</p>
                    <Badge className={cn(
                      "text-[10px] lg:text-xs",
                      order.status === 'finished' ? 'bg-success/10 text-success' :
                      order.status === 'production' ? 'bg-info/10 text-info' :
                      'bg-warning/10 text-warning'
                    )}>
                      {order.status === 'production' ? 'Produção' :
                       order.status === 'finished' ? 'Pronto' :
                       order.status === 'delivered' ? 'Entregue' : 'Pendente'}
                    </Badge>
                  </div>
                </button>
              ))}
              {accessibleOrders.length === 0 && (
                <div className="text-center py-6 lg:py-8 text-muted-foreground text-sm">
                  Nenhum pedido encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-none shadow-soft">
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-0 lg:pt-0">
            <div className="grid grid-cols-2 gap-2 lg:gap-4">
              <button
                className="flex flex-col items-center justify-center p-3 lg:p-6 bg-success/10 hover:bg-success/30 border-2 border-success/30 hover:border-success/60 rounded-xl transition-all duration-200 gap-2 lg:gap-3 group shadow-md shadow-success/20 hover:shadow-lg hover:shadow-success/40 active:bg-success/40"
                onClick={() => {
                  playClickSound();
                  setReceivedDialogOpen(true);
                }}
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-success group-hover:bg-success/80 flex items-center justify-center text-success-foreground group-hover:scale-110 transition-all duration-200 shadow-md">
                  <DollarSign className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="text-center">
                  <span className="font-semibold text-success group-hover:text-success/80 block transition-colors text-xs lg:text-base">Recebido Hoje</span>
                </div>
              </button>

              <button
                className="flex flex-col items-center justify-center p-3 lg:p-6 bg-primary/10 hover:bg-primary/30 border-2 border-primary/30 hover:border-primary/60 rounded-xl transition-all duration-200 gap-2 lg:gap-3 group shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/40 active:bg-primary/40"
                onClick={() => {
                  playClickSound();
                  navigate('/vendas');
                }}
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-primary group-hover:bg-primary/80 flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-all duration-200 shadow-md">
                  <ShoppingCart className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <span className="font-semibold text-primary group-hover:text-primary/80 transition-colors text-xs lg:text-base">Nova Venda</span>
              </button>

              <button
                className="flex flex-col items-center justify-center p-3 lg:p-6 bg-warning/10 hover:bg-warning/30 border-2 border-warning/30 hover:border-warning/60 rounded-xl transition-all duration-200 gap-2 lg:gap-3 group shadow-md shadow-warning/20 hover:shadow-lg hover:shadow-warning/40 active:bg-warning/40"
                onClick={() => {
                  playClickSound();
                  setReceivablesDialogOpen(true);
                }}
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-warning group-hover:bg-warning/80 flex items-center justify-center text-warning-foreground group-hover:scale-110 transition-all duration-200 shadow-md">
                  <DollarSign className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <span className="font-semibold text-warning group-hover:text-warning/80 transition-colors text-xs lg:text-base">A Receber</span>
              </button>

              <button
                className="flex flex-col items-center justify-center p-3 lg:p-6 bg-info/10 hover:bg-info/30 border-2 border-info/30 hover:border-info/60 rounded-xl transition-all duration-200 gap-2 lg:gap-3 group shadow-md shadow-info/20 hover:shadow-lg hover:shadow-info/40 active:bg-info/40"
                onClick={() => {
                  playClickSound();
                  setOrdersDialogOpen(true);
                }}
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-info group-hover:bg-info/80 flex items-center justify-center text-info-foreground group-hover:scale-110 transition-all duration-200 shadow-md">
                  <ListFilter className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <span className="font-semibold text-info group-hover:text-info/80 transition-colors text-xs lg:text-base">Pedidos</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-4 lg:mt-8">
        {/* Sales Chart - Main */}
        <Card className="border-none shadow-soft lg:col-span-2">
          <CardHeader className="pb-2 p-4 lg:p-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm lg:text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                Faturamento
              </CardTitle>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <Button 
                  variant={chartPeriod === 'week' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-6 lg:h-7 text-[10px] lg:text-xs px-2 lg:px-3"
                  onClick={() => setChartPeriod('week')}
                >
                  7 dias
                </Button>
                <Button 
                  variant={chartPeriod === 'month' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-6 lg:h-7 text-[10px] lg:text-xs px-2 lg:px-3"
                  onClick={() => setChartPeriod('month')}
                >
                  Mês
                </Button>
                <Button 
                  variant={chartPeriod === 'year' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-6 lg:h-7 text-[10px] lg:text-xs px-2 lg:px-3"
                  onClick={() => setChartPeriod('year')}
                >
                  6 meses
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-0">
            <SalesChart period={chartPeriod} filteredOrders={accessibleOrders} />
          </CardContent>
        </Card>

        {/* Side Charts */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
          {/* Payment Methods */}
          <Card className="border-none shadow-soft">
            <CardHeader className="pb-2 p-3 lg:p-6">
              <CardTitle className="text-xs lg:text-sm flex items-center gap-2">
                <CreditCard className="w-3 h-3 lg:w-4 lg:h-4 text-info" />
                Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 lg:p-6 pt-0">
              <PaymentMethodsChart filteredOrders={accessibleOrders} />
            </CardContent>
          </Card>

          {/* Orders Status */}
          <Card className="border-none shadow-soft">
            <CardHeader className="pb-2 p-3 lg:p-6">
              <CardTitle className="text-xs lg:text-sm flex items-center gap-2">
                <BarChart3 className="w-3 h-3 lg:w-4 lg:h-4 text-warning" />
                Status Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 lg:p-6 pt-0">
              <OrdersStatusChart filteredOrders={accessibleOrders} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={receivedDialogOpen} onOpenChange={setReceivedDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Pedidos do Dia (Recebido Hoje)</DialogTitle>
          </DialogHeader>
          <DialogHeaderWithAction
            className="pr-12 mt-2"
            title="Pedidos do Dia (Recebido Hoje)"
            action={
              <PrintButton onClick={handlePrintReceivedToday} />
            }
          />

          <ScrollArea className="flex-1 max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaysOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Nenhum pedido feito hoje.
                    </TableCell>
                  </TableRow>
                ) : (
                  todaysOrders.map(order => {
                    const paidAmount = order.amountPaid ?? (order.paymentStatus === 'paid' ? order.total : 0);
                    return (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200" onClick={() => setSelectedOrder(order)}>
                        <TableCell className="font-mono font-medium">#{order.id}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            order.status === 'finished' ? "bg-success/10 text-success" :
                            order.status === 'production' ? "bg-info/10 text-info" :
                            "bg-warning/10 text-warning"
                          )}>
                            {order.status === 'finished' ? 'Finalizado' : order.status === 'production' ? 'Produção' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">R$ {order.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-success">R$ {paidAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="pt-4 border-t flex justify-end gap-6 items-center">
            <div className="text-right">
              <span className="block text-sm text-muted-foreground">Total em Pedidos</span>
              <span className="font-bold text-lg">R$ {todaysOrders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="block text-sm text-muted-foreground">Total Recebido</span>
              <span className="font-black text-xl text-success">
                R$ {todaysOrders.reduce((acc, o) => acc + (o.amountPaid ?? (o.paymentStatus === 'paid' ? o.total : 0)), 0).toFixed(2)}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receivables Dialog */}
      <Dialog open={receivablesDialogOpen} onOpenChange={setReceivablesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>Contas a Receber</DialogTitle>
          </DialogHeader>
          <div className="p-4 sm:p-6 pb-4 border-b mt-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pr-10">
              <div className="text-xl font-bold flex items-center gap-2 shrink-0">
                <div className="bg-warning/10 p-2 rounded-lg">
                  <DollarSign className="w-6 h-6 text-warning" />
                </div>
                Contas a Receber
              </div>
              <Card className="border-warning/20 bg-warning/5 shadow-none shrink-0 self-start sm:self-auto">
                <CardContent className="p-2 px-4">
                  <p className="text-[10px] text-warning font-bold uppercase tracking-wider">Total a Receber</p>
                  <p className="text-xl font-bold text-warning">R$ {totalReceivable.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar cliente ou pedido..." className="pl-9" value={receivablesSearchTerm} onChange={(e) => setReceivablesSearchTerm(e.target.value)} />
              </div>
              <PrintButton label="Relatório" onClick={handlePrintReceivablesReport} className="self-start sm:self-auto" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <div className="space-y-4">
              {receivables.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed">
                  Nenhuma conta a receber encontrada.
                </div>
              ) : (
                receivables.map(order => (
                  <div 
                    key={order.id} 
                    className="bg-card p-4 rounded-xl border border-border shadow-soft flex flex-col sm:flex-row justify-between gap-4 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => { setReceivablesDialogOpen(false); navigate(`/ordens-servico?tab=${order.status === 'pending' ? 'pending' : order.status === 'production' ? 'production' : 'finished'}&order=${order.id}`); }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg">#{order.id}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-semibold">{order.customerName}</span>
                        <span className="text-muted-foreground text-sm">•</span>
                        <span className="text-muted-foreground text-sm">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-medium border border-border">{item.quantity}x {item.name}</span>
                        ))}
                        {order.items.length > 3 && <span className="text-xs text-muted-foreground self-center">+ {order.items.length - 3} itens</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div><span className="text-muted-foreground">Total:</span> <span className="font-bold">R$ {order.total.toFixed(2)}</span></div>
                        <div><span className="text-muted-foreground">Pago:</span> <span className="font-semibold text-success">R$ {(order.amountPaid || 0).toFixed(2)}</span></div>
                        <div><span className="text-muted-foreground">Restante:</span> <span className="font-bold text-destructive">R$ {(order.remainingAmount || (order.total - (order.amountPaid || 0))).toFixed(2)}</span></div>
                        {order.payments && order.payments.length > 1 && (() => {
                          const installmentEntries = order.payments.filter((p) => {
                            const anyP = p as any;
                            return !anyP?.method || !anyP?.date;
                          });
                          const qty = installmentEntries.length > 0 ? installmentEntries.length : order.payments.length;
                          const value = (installmentEntries[0]?.amount ?? order.payments[0]?.amount ?? 0) as number;
                          return (
                            <div><span className="text-muted-foreground">Parcelado:</span> <span className="font-bold text-primary">{qty}x de R$ {value.toFixed(2)}</span></div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                      <Badge className={order.paymentStatus === 'partial' ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}>
                        {order.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}
                      </Badge>
                      <div className="flex gap-1 w-full">
                        <Button size="sm" variant="outline" className="flex-1 px-2 h-8" title="Imprimir Pedido" onClick={() => handlePrintDoc(order, 'order')}>
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 px-2 h-8" title="Imprimir O.S." onClick={() => handlePrintDoc(order, 'production')}>
                          <Printer className="w-4 h-4 text-info" />
                        </Button>
                      </div>
                      <Button size="sm" className="w-full font-bold bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleReceivePayment(order)}>
                        <Banknote className="w-4 h-4 mr-2" />
                        Receber (R$ {(order.remainingAmount || (order.total - (order.amountPaid || 0))).toFixed(2)})
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Orders Dialog */}
      <Dialog open={ordersDialogOpen} onOpenChange={setOrdersDialogOpen}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col p-0 gap-0" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>Pedidos e Pagamentos</DialogTitle>
          </DialogHeader>
          <DialogHeaderWithAction
            className="p-4 sm:p-6 pb-0 mt-2 pr-10"
            title="Pedidos & Pagamentos"
            action={
              <PrintButton onClick={handlePrintOrdersDialog} />
            }
          />
          <div className="px-4 sm:px-6 pb-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente ou #ID..." className="pl-9 h-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <div className="space-y-4">
              {accessibleOrders.filter(o => o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm)).map(order => (
                <div 
                  key={order.id} 
                  className="bg-card p-4 rounded-xl border border-border shadow-soft flex flex-col sm:flex-row justify-between gap-4 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => { setOrdersDialogOpen(false); navigate(`/ordens-servico?tab=${order.status === 'pending' ? 'pending' : order.status === 'production' ? 'production' : 'finished'}&order=${order.id}`); }}
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 pr-2">
                      <span className="font-bold text-lg">#{order.id}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-semibold min-w-0 truncate">{order.customerName}</span>
                      <span className="text-muted-foreground text-sm">•</span>
                      <span className="text-muted-foreground text-sm whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-medium border border-border">{item.quantity}x {item.name}</span>
                      ))}
                      {order.items.length > 3 && <span className="text-xs text-muted-foreground self-center">+ {order.items.length - 3} itens</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <div><span className="text-muted-foreground">Total:</span> <span className="font-bold">R$ {order.total.toFixed(2)}</span></div>
                      <div><span className="text-muted-foreground">Pago:</span> <span className="font-semibold text-success">R$ {(order.amountPaid || (order.paymentStatus === 'paid' ? order.total : 0)).toFixed(2)}</span></div>
                      {(order.remainingAmount || 0) > 0 && <div><span className="text-muted-foreground">Restante:</span> <span className="font-bold text-destructive">R$ {order.remainingAmount?.toFixed(2)}</span></div>}
                      {order.payments && order.payments.length > 1 && (() => {
                        const installmentEntries = order.payments.filter((p) => {
                          const anyP = p as any;
                          return !anyP?.method || !anyP?.date;
                        });
                        const qty = installmentEntries.length > 0 ? installmentEntries.length : order.payments.length;
                        const value = (installmentEntries[0]?.amount ?? order.payments[0]?.amount ?? 0) as number;
                        return (
                          <div><span className="text-muted-foreground">Parcelado:</span> <span className="font-bold text-primary">{qty}x de R$ {value.toFixed(2)}</span></div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                    <Badge className={cn(
                      order.paymentStatus === 'paid' ? "bg-success/10 text-success" :
                      order.paymentStatus === 'partial' ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                    )}>
                      {order.paymentStatus === 'paid' ? 'Pago' : order.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}
                    </Badge>
                    {(order.paymentStatus === 'partial' || order.paymentStatus === 'pending') && (
                      <Button size="sm" className="w-full font-bold bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleReceivePayment(order)}>
                        <Banknote className="w-4 h-4 mr-2" />
                        Receber
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setSelectedOrder(order)}>
                      <Printer className="w-3 h-3 mr-2" />
                      Imprimir
                    </Button>
                  </div>
                </div>
              ))}
              {accessibleOrders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum pedido registrado.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 pr-14 shrink-0 mt-2">
            <div className="text-2xl font-bold">Detalhes do Pedido</div>
          </DialogHeader>

          {selectedOrder && (
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
              {/* Status Buttons */}
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <span className="text-xs font-medium text-muted-foreground mb-2 block">Status:</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={selectedOrder.status === 'pending' ? 'default' : 'outline'} 
                    size="sm"
                    className={`w-full ${selectedOrder.status === 'pending' ? 'bg-warning text-warning-foreground hover:bg-warning/90' : ''}`}
                    onClick={() => handleStatusChangeWithNotification(selectedOrder, 'pending', '/ordens-servico?tab=pending')}
                  >
                    Aguardando
                  </Button>
                  <Button 
                    variant={selectedOrder.status === 'production' ? 'default' : 'outline'} 
                    size="sm"
                    className={`w-full ${selectedOrder.status === 'production' ? 'bg-info text-info-foreground hover:bg-info/90' : 'border-info text-info hover:bg-info/10'}`}
                    onClick={() => handleStatusChangeWithNotification(selectedOrder, 'production', '/ordens-servico?tab=production')}
                  >
                    Em Produção
                  </Button>
                  <Button 
                    variant={selectedOrder.status === 'finished' ? 'default' : 'outline'} 
                    size="sm"
                    className={`w-full ${selectedOrder.status === 'finished' ? 'bg-success text-success-foreground hover:bg-success/90' : 'border-success text-success hover:bg-success/10'}`}
                    onClick={() => handleStatusChangeWithNotification(selectedOrder, 'finished', '/ordens-servico?tab=finished')}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Finalizado
                  </Button>
                  <Button 
                    variant={selectedOrder.status === 'delivered' ? 'default' : 'outline'} 
                    size="sm"
                    className={`w-full ${selectedOrder.status === 'delivered' ? 'bg-muted text-muted-foreground' : ''}`}
                    onClick={() => handleStatusChangeWithNotification(selectedOrder, 'delivered')}
                  >
                    Entregue
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold mb-0.5">Nº do Pedido</span>
                  <span className="font-mono font-bold text-lg text-primary">#{selectedOrder.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold mb-0.5">Data e Hora</span>
                  <span className="font-medium block">{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                  <span className="text-xs text-muted-foreground">{new Date(selectedOrder.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold mb-0.5">Cliente</span>
                  <span className="font-bold text-base">{selectedOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold mb-0.5">Vendedor</span>
                  <span className="font-medium">{selectedOrder.sellerName || 'Não informado'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-3 text-xs uppercase tracking-wider text-muted-foreground border-b pb-1 flex items-center gap-2">
                  <ShoppingCart className="w-3 h-3" />
                  Itens do Pedido
                </h4>
                <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-lg p-3 shadow-soft hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm">{item.quantity}x {item.name}</span>
                        <span className="font-bold text-sm">R$ {item.total.toFixed(2)}</span>
                      </div>
                      {item.variationName && <div className="text-xs text-primary font-medium mb-1">{item.variationName}</div>}
                      {(item.dimensions || item.finishing || item.customDescription) && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-dashed border-border">
                          {item.dimensions && <div className="text-[10px] text-muted-foreground"><span className="font-semibold">Medidas:</span> {item.dimensions}</div>}
                          {item.finishing && <div className="text-[10px] text-muted-foreground"><span className="font-semibold">Acabamento:</span> {item.finishing}</div>}
                          {item.customDescription && <div className="text-[10px] text-muted-foreground bg-muted/50 p-1.5 rounded italic">"{item.customDescription}"</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg space-y-2 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Valor Total</span>
                  <span className="font-bold text-base">R$ {selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Valor Pago</span>
                  <span className="font-bold text-success">R$ {(selectedOrder.amountPaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t border-border mt-2">
                  <span className="font-bold">Valor em Aberto</span>
                  <span className="font-black text-warning text-xl">
                    R$ {(selectedOrder.remainingAmount ?? (selectedOrder.total - (selectedOrder.amountPaid || 0))).toFixed(2)}
                  </span>
                </div>
                {/* Installments info */}
                {selectedOrder.payments && selectedOrder.payments.length > 1 && (() => {
                  const installmentEntries = selectedOrder.payments.filter((p) => {
                    const anyP = p as any;
                    return !anyP?.method || !anyP?.date;
                  });
                  const qty = installmentEntries.length > 0 ? installmentEntries.length : selectedOrder.payments.length;
                  const value = (installmentEntries[0]?.amount ?? selectedOrder.payments[0]?.amount ?? 0) as number;
                  return (
                    <div className="flex justify-between text-sm pt-2 border-t border-border mt-2">
                      <span className="text-muted-foreground font-medium">Parcelamento</span>
                      <span className="font-bold text-primary">
                        {qty}x de R$ {value.toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <WhatsAppButton 
                  order={selectedOrder} 
                  companySettings={companySettings}
                  variant="outline"
                  size="sm"
                  showLabel
                  className="w-full"
                />
                <Button variant="outline" onClick={() => { setSelectedOrder(null); setLastPrintedType(null); }} size="sm" className="w-full">
                  Fechar
                </Button>
                <Button 
                  variant={lastPrintedType === 'production' ? 'default' : 'secondary'} 
                  className={`w-full ${lastPrintedType === 'production' ? 'bg-info hover:bg-info/90 gap-2' : 'gap-2'}`} 
                  onClick={() => selectedOrder && handlePrintDoc(selectedOrder, 'production')} 
                  size="sm"
                >
                  <Printer className="w-4 h-4" /> O.S.
                </Button>
                <Button 
                  variant={lastPrintedType === 'order' ? 'default' : 'secondary'} 
                  className={`w-full ${lastPrintedType === 'order' ? 'bg-primary hover:bg-primary/90 gap-2' : 'gap-2'}`} 
                  onClick={() => selectedOrder && handlePrintDoc(selectedOrder, 'order')} 
                  size="sm"
                >
                  <Printer className="w-4 h-4" /> Pedido
                </Button>
                <Button 
                  variant={lastPrintedType === 'receipt' ? 'default' : 'secondary'} 
                  className={`w-full col-span-2 ${lastPrintedType === 'receipt' ? 'bg-success hover:bg-success/90 gap-2' : 'gap-2'}`} 
                  onClick={() => selectedOrder && handlePrintDoc(selectedOrder, 'receipt')} 
                  size="sm"
                >
                  <Printer className="w-4 h-4" /> Recibo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Daily Tasks Dialog */}
      <DailyTasksDialog open={dailyTasksOpen} onOpenChange={setDailyTasksOpen} />

      {/* Floating Button to reopen Daily Tasks */}
      {authUser && (
        <Button
          onClick={() => setDailyTasksOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 z-50"
          size="icon"
        >
          <Bell className="w-6 h-6" />
        </Button>
      )}

      {/* Onboarding Dialog */}
      <OnboardingDialog 
        open={showOnboarding} 
        onOpenChange={setShowOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </MainLayout>
  );
}
