import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useStore } from "@/lib/store";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { ServiceOrder } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, User, FileText, CheckCircle2, Eye, ArrowRight, ChevronDown, ClipboardList, Trash2, Pencil, Loader2, Printer } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import { toast } from "sonner";
import { useAutoNotifications } from "@/hooks/useAutoNotifications";
import { KanbanCardSkeleton, EmptyState } from "@/components/ui/loading-skeleton";

export default function OrdensServico() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabFromUrl = searchParams.get('tab') || 'production';
  const orderIdFromUrl = searchParams.get('order');
  const { companySettings, clearCart } = useStore();
  const { settings: cloudSettings } = useCompanySettings();
  const { orders, updateOrderStatus, deleteOrder, isLoading } = useSupabaseOrders();
  const { authUser } = useAuth();
  const { notifyOrderStatusChange } = useAutoNotifications();
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentTab, setCurrentTab] = useState(tabFromUrl);

  // Permission checks
  const canDelete = authUser?.role === 'admin';
  const canEdit = authUser?.role === 'admin' || authUser?.role === 'manager';

  // Filter orders based on user role
  const accessibleOrders = authUser?.role === 'seller'
    ? orders.filter(o => o.sellerId === authUser.id)
    : orders;

  // Open order from URL parameter
  useEffect(() => {
    if (orderIdFromUrl) {
      const order = accessibleOrders.find(o => o.id === orderIdFromUrl);
      if (order) {
        setSelectedOrder(order);
      }
    }
  }, [orderIdFromUrl, accessibleOrders]);

  const handlePrintOrder = (order: ServiceOrder, type: 'production' | 'receipt' | 'order' | 'quote') => {
    const width = type === 'receipt' ? 400 : 800;
    const printWindow = window.open('', '', `height=600,width=${width}`);
    if (!printWindow) return;

    const titles = {
      production: 'ORDEM DE PRODUÇÃO',
      receipt: 'RECIBO',
      order: 'PEDIDO',
      quote: 'ORÇAMENTO'
    };
    const title = titles[type];
    const showPrices = type !== 'production';

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} #${order.id}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              font-size: ${type === 'receipt' ? '12px' : '14px'};
              max-width: ${type === 'receipt' ? '300px' : '100%'};
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .border-b { border-bottom: 1px dashed #000; }
            .border-t { border-top: 1px dashed #000; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .w-full { width: 100%; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; }
            .header-section { margin-bottom: 20px; text-align: center; }
            .info-section { margin-bottom: 20px; }
            .total-section { margin-top: 20px; text-align: right; font-size: 1.2em; font-weight: bold; }
            .box { border: 2px solid #000; padding: 15px; margin-top: 8px; font-size: 16px; font-weight: bold; background: #f8f9fa; }
            .finishing-box { border: 2px solid #333; padding: 8px 12px; margin-top: 8px; font-size: 15px; font-weight: bold; background: #eee; display: inline-block; }
            .action-bar { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; padding: 15px; background: #f0f0f0; border-radius: 10px; }
            .action-btn { background: #3b82f6; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            .action-btn.print { background: #22c55e; }
            .action-btn.close { background: #ef4444; }
            @media print { .action-bar { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="action-bar">
            <button class="action-btn print" onclick="window.print()">🖨️ Imprimir</button>
            <button class="action-btn close" onclick="window.close()">✕ Fechar</button>
          </div>
    `);

    // Combine phones
    const phones = [companySettings.phone, cloudSettings?.phone2].filter(Boolean).join(' | ');
    
    printWindow.document.write(`
      <div class="header-section">
        ${companySettings.logoUrl 
          ? `<img src="${companySettings.logoUrl}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px;" />` 
          : `<div class="font-bold" style="font-size: 1.2em;">${companySettings.name}</div>`}
        ${companySettings.cnpj ? `<div style="font-size: 0.9em;">CNPJ: ${companySettings.cnpj}</div>` : ''}
        <div>${companySettings.address || ''}</div>
        <div>${phones}</div>
        <div style="margin-top: 10px; font-weight: bold; font-size: 1.5em;">${title}</div>
      </div>
    `);

    // Info
    printWindow.document.write(`
      <div class="info-section border-b" style="padding-bottom: 8px;">
        <div style="display: flex; justify-content: space-between;">
          <div>
            <div><strong>Data:</strong> ${new Date(order.createdAt).toLocaleString('pt-BR')}</div>
            <div><strong>Referência:</strong> #${order.id}</div>
            ${type === 'quote' ? '<div style="font-size: 0.8em; margin-top: 5px;">Válido por 7 dias</div>' : ''}
          </div>
          <div class="text-right">
            <div><strong>Cliente:</strong> ${order.customerName}</div>
          </div>
        </div>
      </div>
    `);

    // Content
    if (type === 'receipt') {
      printWindow.document.write('<div class="font-bold mb-2">ITENS</div>');
      order.items.forEach(item => {
        printWindow.document.write(`
          <div class="mb-2">
            <div class="font-bold">${item.quantity}x ${item.name}</div>
            ${item.variationName ? `<div style="font-size: 0.9em;">${item.variationName}</div>` : ''}
            ${showPrices ? `<div class="text-right">R$ ${item.total.toFixed(2)}</div>` : ''}
          </div>
        `);
      });
    } else {
      printWindow.document.write(`
        <table>
          <thead>
            <tr>
              <th style="width: 60%">Item / Detalhes</th>
              <th style="width: 10%; text-align: center;">Qtd</th>
              ${showPrices ? '<th style="width: 15%; text-align: right;">Unit.</th><th style="width: 15%; text-align: right;">Total</th>' : ''}
            </tr>
          </thead>
          <tbody>
      `);

      order.items.forEach(item => {
        const unitPrice = item.total / item.quantity;
        printWindow.document.write(`
          <tr>
            <td style="padding-bottom: 20px;">
              <div class="font-bold" style="font-size: 1.2em;">${item.name}</div>
              ${item.variationName ? `<div>${item.variationName}</div>` : ''}
              ${item.dimensions ? `<div style="font-size: 0.9em;">Medidas: ${item.dimensions}</div>` : ''}
              ${item.finishing ? `<div class="finishing-box">ACABAMENTO: ${item.finishing.toUpperCase()}</div>` : ''}
              ${item.customDescription ? `<div class="box">OBS: ${item.customDescription.toUpperCase()}</div>` : ''}
            </td>
            <td style="text-align: center; vertical-align: top; font-size: 1.2em; font-weight: bold;">${item.quantity}</td>
            ${showPrices ? `
              <td style="text-align: right; vertical-align: top;">R$ ${unitPrice.toFixed(2)}</td>
              <td style="text-align: right; vertical-align: top;">R$ ${item.total.toFixed(2)}</td>
            ` : ''}
          </tr>
        `);
      });

      printWindow.document.write('</tbody></table>');
    }

    // Totals
    if (showPrices) {
      const getPaymentMethodLabel = (method: string | null | undefined): string => {
        const labels: Record<string, string> = { cash: 'Dinheiro', pix: 'PIX', card: 'Cartão' };
        return method ? labels[method] || method : 'Não informado';
      };
      
      const paid = order.amountPaid || 0;
      const remaining = order.remainingAmount || (order.total - paid);
      // Check if order has installment info in payments array
      const payments = order.payments || [];
      const installments = payments.length > 0 ? payments.length : (remaining > 0 ? 1 : 0);
      const installmentValue = remaining > 0 && installments > 1 ? remaining / installments : 0;
      
      printWindow.document.write(`
        <div class="total-section">
          <div>TOTAL: R$ ${order.total.toFixed(2)}</div>
          
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc;">
            <div style="font-size: 0.9em; margin-bottom: 4px;">
              <strong>Forma de Pagamento:</strong> ${getPaymentMethodLabel(order.paymentMethod)}
            </div>
            
            ${paid > 0 ? `
              <div style="font-size: 0.9em; color: #28a745; margin-top: 4px;">
                <strong>Valor Pago:</strong> R$ ${paid.toFixed(2)}
              </div>
            ` : ''}
            
            ${remaining > 0 ? `
              <div style="font-size: 0.9em; color: #dc3545; margin-top: 4px;">
                <strong>Falta Pagar:</strong> R$ ${remaining.toFixed(2)}
              </div>
              ${installments > 1 ? `
                <div style="font-size: 0.9em; color: #fd7e14; margin-top: 4px; padding: 6px; background: #fff8e1; border-radius: 4px;">
                  <strong>Parcelamento:</strong> ${installments}x de R$ ${installmentValue.toFixed(2)}
                </div>
              ` : ''}
            ` : `
              <div style="font-size: 0.9em; color: #28a745; margin-top: 4px;">
                <strong>PAGAMENTO TOTAL REALIZADO</strong>
              </div>
            `}
          </div>
        </div>
      `);
    }

    // Production fields or footer
    if (type === 'production') {
      printWindow.document.write(`
        <div style="margin-top: 40px; border: 2px solid #000; padding: 10px;">
          <div style="font-weight: bold; margin-bottom: 40px;">OBSERVAÇÕES DE PRODUÇÃO:</div>
          <div style="border-bottom: 1px dotted #999; margin-bottom: 20px;"></div>
          <div style="border-bottom: 1px dotted #999; margin-bottom: 20px;"></div>
        </div>
        <div style="margin-top: 20px; display: flex; justify-content: space-between;">
          <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Visto Produção</div>
          <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Visto Conferência</div>
        </div>
      `);
    } else {
      printWindow.document.write(`
        <div class="text-center py-2" style="margin-top: 20px; border-top: 1px dashed #000;">
          Obrigado pela preferência!
        </div>
      `);
    }

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  const handlePrintCurrentTabReport = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    // Filter orders by current tab
    const filteredOrders = accessibleOrders.filter(o => {
      if (currentTab === 'production') return o.status === 'production';
      if (currentTab === 'pending') return o.status === 'pending';
      if (currentTab === 'finished') return o.status === 'finished';
      return true;
    });

    const tabTitles: Record<string, string> = {
      'production': 'EM PRODUÇÃO',
      'pending': 'AGUARDANDO',
      'finished': 'PRONTOS'
    };

    const reportTitle = `RELATÓRIO - ${tabTitles[currentTab] || 'PEDIDOS'}`;

    printWindow.document.write('<html><head><title>' + reportTitle + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: monospace; padding: 20px; }
      h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
      th { font-weight: bold; }
      .text-right { text-align: right; }
      .total { margin-top: 20px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
      .status-tag { font-size: 10px; padding: 2px 4px; border-radius: 4px; border: 1px solid #ddd; }
    `);
    printWindow.document.write('</style></head><body>');

    const reportPhones = [companySettings.phone, cloudSettings?.phone2].filter(Boolean).join(' | ');
    printWindow.document.write(`
      <div class="header">
        ${companySettings.logoUrl 
          ? `<img src="${companySettings.logoUrl}" alt="Logo" style="max-height: 50px; max-width: 120px; margin-bottom: 8px;" />` 
          : `<div style="font-weight: bold; font-size: 16px;">${companySettings.name}</div>`}
        ${companySettings.cnpj ? `<div style="font-size: 12px;">CNPJ: ${companySettings.cnpj}</div>` : ''}
        <div>${companySettings.address || ''}</div>
        <div>${reportPhones}</div>
        <div style="margin-top: 10px;">${reportTitle}</div>
        <div>${new Date().toLocaleDateString()}</div>
      </div>
    `);

    printWindow.document.write('<table>');
    printWindow.document.write('<thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Status</th><th class="text-right">Total</th></tr></thead>');
    printWindow.document.write('<tbody>');

    const sortedOrders = [...filteredOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    let grandTotal = 0;

    sortedOrders.forEach(order => {
      grandTotal += order.total;
      const statusLabel = getStatusLabel(order.status);

      printWindow.document.write(`
        <tr>
          <td>#${order.id}</td>
          <td>${order.customerName}</td>
          <td>${new Date(order.createdAt).toLocaleDateString()}</td>
          <td><span class="status-tag">${statusLabel}</span></td>
          <td class="text-right">R$ ${order.total.toFixed(2)}</td>
        </tr>
      `);
    });

    printWindow.document.write('</tbody></table>');
    printWindow.document.write(`
      <div class="total">
        TOTAL DE PEDIDOS (${sortedOrders.length}): R$ ${grandTotal.toFixed(2)}
      </div>
    `);

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  const getStatusColor = (status: ServiceOrder['status']) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'production': return 'bg-info text-info-foreground border-info shadow-md shadow-info/20';
      case 'finished': return 'bg-success text-success-foreground border-success shadow-md shadow-success/20';
      case 'delivered': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: ServiceOrder['status']) => {
    switch (status) {
      case 'pending': return 'AGUARDANDO';
      case 'production': return 'EM PRODUÇÃO';
      case 'finished': return 'FINALIZADO';
      case 'delivered': return 'ENTREGUE';
      default: return status;
    }
  };

  const handleStatusChange = (orderId: string, newStatus: ServiceOrder['status']) => {
    const order = orders.find(o => o.id === orderId);
    const oldStatus = order?.status || 'pending';
    
    updateOrderStatus({ id: orderId, status: newStatus });
    toast.success(`Status atualizado para: ${getStatusLabel(newStatus)}`);
    
    // Send notification
    if (order) {
      notifyOrderStatusChange(orderId, order.customerName, oldStatus, newStatus, order.sellerId);
    }
  };

  const handleDeleteOrder = () => {
    if (selectedOrder) {
      deleteOrder(selectedOrder.id);
      setShowDeleteConfirm(false);
      setSelectedOrder(null);
    }
  };

  const handleEditOrder = () => {
    if (selectedOrder) {
      // Store order data for editing and navigate to sales page
      sessionStorage.setItem('editingOrder', JSON.stringify(selectedOrder));
      clearCart();
      navigate('/vendas?editOrder=' + selectedOrder.id);
    }
  };

  const ProductionCard = ({ order, large = false }: { order: ServiceOrder, large?: boolean }) => (
    <Card
      className={`mb-3 transition-all duration-200 hover:scale-[1.01] border-2 overflow-hidden cursor-pointer shadow-md hover:shadow-lg ${
        order.status === 'production' ? 'border-info/30 hover:border-info/60 hover:bg-info/10' :
        order.status === 'finished' ? 'border-success/30 hover:border-success/60 hover:bg-success/10' :
        'border-warning/30 hover:border-warning/60 hover:bg-warning/10'
      }`}
      onClick={() => setSelectedOrder(order)}
    >
      {/* Status Bar */}
      <div className={`h-1 w-full ${
         order.status === 'production' ? 'bg-info' :
         order.status === 'finished' ? 'bg-success' :
         'bg-warning'
      }`} />

      <CardContent className="p-3">
        {/* Header Row: ID, Date, Status */}
        <div className="flex justify-between items-center mb-2">
           <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded border border-border text-foreground">
                #{order.id}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium bg-background px-1.5 py-0.5 rounded border">
                <Calendar className="w-3 h-3" />
                {new Date(order.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
              </span>
           </div>

           <Badge className={`text-[10px] px-1.5 py-0 font-bold rounded h-5 ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
           </Badge>
        </div>

        {/* Customer Name */}
        <h3 className={`font-bold text-foreground tracking-tight leading-tight mb-2 truncate ${large ? 'text-lg' : 'text-sm'}`}>
          {order.customerName}
        </h3>

        {/* Compact Items List */}
        <div className="space-y-1 mb-2 bg-muted/50 p-2 rounded border border-border">
          {order.items.slice(0, 3).map(item => (
            <div key={item.id} className="text-xs flex items-start gap-1.5">
              <span className="bg-muted text-muted-foreground px-1 rounded-[3px] text-[10px] font-bold min-w-[18px] text-center mt-0.5">
                {item.quantity}x
              </span>
              <div className="flex-1 min-w-0">
                 <div className="truncate font-medium text-foreground leading-tight">{item.name}</div>
                 {(item.finishing || item.customDescription) && (
                    <div className="flex gap-1 mt-0.5">
                       {item.finishing && <span className="text-[9px] bg-muted text-muted-foreground px-1 rounded border border-border truncate max-w-[100px]">{item.finishing}</span>}
                       {item.customDescription && <span className="text-[9px] bg-warning/10 text-warning px-1 rounded border border-warning/20 truncate max-w-[80px]">OBS</span>}
                    </div>
                 )}
              </div>
            </div>
          ))}
          {order.items.length > 3 && (
             <div className="text-[10px] text-muted-foreground pl-7 italic">
                + {order.items.length - 3} itens...
             </div>
          )}
        </div>

        {/* Footer: Deadline & Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 min-h-[20px]">
             {order.deadline && (
              <div className="flex items-center gap-1 text-warning font-bold bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20 text-[10px]">
                <Clock className="w-3 h-3" />
                <span>{new Date(order.deadline).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}</span>
              </div>
            )}
          </div>

          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
              onClick={() => setSelectedOrder(order)}
            >
                <Eye className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout title="Controle de Produção">
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex gap-2">
            <PrintButton 
              label="Relatório"
              onClick={handlePrintCurrentTabReport} 
              size="sm"
              className="h-9 text-xs lg:text-sm [&>span]:hidden lg:[&>span]:inline"
            />
          </div>
        </div>

        <Tabs defaultValue={tabFromUrl} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="w-full p-1 h-auto bg-muted border border-border rounded-xl overflow-x-auto flex">
            <TabsTrigger value="production" className="flex-1 py-2 lg:py-3 px-2 lg:px-6 text-xs lg:text-base font-bold data-[state=active]:bg-background data-[state=active]:text-info data-[state=active]:shadow-sm rounded-lg whitespace-nowrap">
              <span className="hidden sm:inline">EM PRODUÇÃO</span>
              <span className="sm:hidden">PRODUÇÃO</span>
              <span className="ml-1">({accessibleOrders.filter(o => o.status === 'production').length})</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 py-2 lg:py-3 px-2 lg:px-6 text-xs lg:text-base font-bold data-[state=active]:bg-background data-[state=active]:text-warning data-[state=active]:shadow-sm rounded-lg whitespace-nowrap">
              <span className="hidden sm:inline">AGUARDANDO</span>
              <span className="sm:hidden">AGUARD.</span>
              <span className="ml-1">({accessibleOrders.filter(o => o.status === 'pending').length})</span>
            </TabsTrigger>
            <TabsTrigger value="finished" className="flex-1 py-2 lg:py-3 px-2 lg:px-6 text-xs lg:text-base font-bold data-[state=active]:bg-background data-[state=active]:text-success data-[state=active]:shadow-sm rounded-lg whitespace-nowrap">
              PRONTOS
              <span className="ml-1">({accessibleOrders.filter(o => o.status === 'finished').length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 lg:mt-6 animate-in fade-in-50 slide-in-from-bottom-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6">
              {accessibleOrders.filter(o => o.status === 'pending').map(order => (
                <ProductionCard key={order.id} order={order} />
              ))}
              {accessibleOrders.filter(o => o.status === 'pending').length === 0 && (
                <div className="col-span-full py-12 lg:py-20 text-center text-muted-foreground bg-muted/50 rounded-2xl border-2 border-dashed border-border">
                  <CheckCircle2 className="w-12 h-12 lg:w-20 lg:h-20 mx-auto mb-3 lg:mb-4 opacity-10" />
                  <h3 className="text-base lg:text-xl font-bold opacity-50">Tudo limpo!</h3>
                  <p className="text-sm">Nenhuma ordem aguardando.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="production" className="mt-4 lg:mt-6 animate-in fade-in-50 slide-in-from-bottom-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-6">
              {accessibleOrders.filter(o => o.status === 'production').map(order => (
                <ProductionCard key={order.id} order={order} />
              ))}
              {accessibleOrders.filter(o => o.status === 'production').length === 0 && (
                <div className="col-span-full py-12 lg:py-20 text-center text-muted-foreground bg-muted/50 rounded-2xl border-2 border-dashed border-border">
                  <Printer className="w-12 h-12 lg:w-20 lg:h-20 mx-auto mb-3 lg:mb-4 opacity-10" />
                  <h3 className="text-base lg:text-xl font-bold opacity-50">Produção parada</h3>
                  <p className="text-sm">Nenhum serviço em execução.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="finished" className="mt-4 lg:mt-6 animate-in fade-in-50 slide-in-from-bottom-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-6">
              {accessibleOrders.filter(o => o.status === 'finished').map(order => (
                <ProductionCard key={order.id} order={order} />
              ))}
              {accessibleOrders.filter(o => o.status === 'finished').length === 0 && (
                <div className="col-span-full py-12 lg:py-20 text-center text-muted-foreground bg-muted/50 rounded-2xl border-2 border-dashed border-border">
                  <CheckCircle2 className="w-12 h-12 lg:w-20 lg:h-20 mx-auto mb-3 lg:mb-4 opacity-10" />
                  <h3 className="text-base lg:text-xl font-bold opacity-50">Nenhum pedido pronto</h3>
                  <p className="text-sm">Finalizados aparecerão aqui.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="border-b pb-3 pr-12 shrink-0 mt-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <DialogTitle className="text-base sm:text-xl font-bold flex flex-wrap items-center gap-2">
                  <span className="bg-muted px-2 py-0.5 rounded border border-border text-foreground text-sm sm:text-base">
                    #{selectedOrder?.id}
                  </span>
                  <span className="truncate">{selectedOrder?.customerName}</span>
                </DialogTitle>
                <DialogDescription className="mt-1 flex items-center gap-2 text-xs sm:text-sm">
                  <Calendar className="w-3 h-3" />
                  {selectedOrder && new Date(selectedOrder.createdAt).toLocaleString()}
                </DialogDescription>
              </div>
              {selectedOrder && (
                <Badge className={`text-xs sm:text-sm px-2 sm:px-3 py-1 font-bold rounded w-fit ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusLabel(selectedOrder.status)}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="py-3 flex-1 overflow-y-auto">
              {/* Status Actions */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 p-2 sm:p-3 bg-muted/50 rounded-lg border border-border">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground mr-1 sm:mr-2 self-center w-full sm:w-auto mb-1 sm:mb-0">Mudar Status:</span>
                {selectedOrder.status !== 'pending' && (
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs sm:text-sm" onClick={() => handleStatusChange(selectedOrder.id, 'pending')}>
                    <ArrowRight className="w-3 h-3 mr-1" /> <span className="hidden xs:inline">Aguardando</span><span className="xs:hidden">Aguard.</span>
                  </Button>
                )}
                {selectedOrder.status !== 'production' && (
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs sm:text-sm border-info text-info hover:bg-info/10" onClick={() => handleStatusChange(selectedOrder.id, 'production')}>
                    <ArrowRight className="w-3 h-3 mr-1" /> <span className="hidden xs:inline">Em Produção</span><span className="xs:hidden">Produção</span>
                  </Button>
                )}
                {selectedOrder.status !== 'finished' && (
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs sm:text-sm border-success text-success hover:bg-success/10" onClick={() => handleStatusChange(selectedOrder.id, 'finished')}>
                    <ArrowRight className="w-3 h-3 mr-1" /> <span className="hidden xs:inline">Finalizado</span><span className="xs:hidden">Pronto</span>
                  </Button>
                )}
                {selectedOrder.status !== 'delivered' && (
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs sm:text-sm" onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}>
                    <ArrowRight className="w-3 h-3 mr-1" /> Entregue
                  </Button>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2 bg-muted/30 p-3 sm:p-4 rounded-lg border border-border max-h-[35vh] overflow-y-auto">
                {selectedOrder.items.map(item => (
                  <div key={item.id} className="border-b border-dashed border-border last:border-0 pb-3 last:pb-0">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <span className="bg-muted text-muted-foreground px-1.5 sm:px-2 py-0.5 rounded text-xs sm:text-sm min-w-[28px] sm:min-w-[32px] text-center font-bold">
                        {item.quantity}x
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-foreground text-sm sm:text-base">{item.name}</span>
                        {item.variationName && (
                          <span className="text-xs sm:text-sm text-muted-foreground ml-2">{item.variationName}</span>
                        )}
                        {item.dimensions && (
                          <div className="text-xs sm:text-sm text-foreground">
                            <span className="font-medium">Medidas:</span> {item.dimensions}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                          {item.finishing && (
                            <span className="text-xs sm:text-sm font-medium text-foreground bg-muted px-1.5 sm:px-2 py-0.5 rounded border border-border">
                              <span className="text-muted-foreground text-[10px] sm:text-xs uppercase mr-1">Acab:</span>
                              {item.finishing}
                            </span>
                          )}
                          {item.customDescription && (
                            <span className="text-xs sm:text-sm font-medium bg-warning/10 text-warning px-1.5 sm:px-2 py-0.5 rounded border-l-2 border-warning">
                              <span className="text-[10px] sm:text-xs uppercase mr-1">Obs:</span>
                              <span className="break-words">{item.customDescription}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedOrder.deadline && (
                <div className="mt-3 flex items-center gap-2 text-warning font-medium bg-warning/10 px-2 py-1.5 rounded-lg border border-warning/20 text-xs sm:text-sm w-fit ml-auto">
                  <Clock className="w-3 h-3" />
                  <span>Prazo: {new Date(selectedOrder.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center border-t pt-4 gap-2 sm:gap-4 shrink-0">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setSelectedOrder(null)}>
                Fechar
              </Button>
              {canEdit && selectedOrder && (
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleEditOrder}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              {canDelete && selectedOrder && (
                <Button variant="destructive" className="flex-1 sm:flex-none" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
            {selectedOrder && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2 gradient-primary text-primary-foreground w-full sm:w-auto">
                    <Printer className="w-4 h-4" />
                    IMPRIMIR
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
                  <DropdownMenuItem onClick={() => handlePrintOrder(selectedOrder, 'production')}>
                    <FileText className="w-4 h-4 mr-2" />
                    O.S.
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePrintOrder(selectedOrder, 'receipt')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Recibo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePrintOrder(selectedOrder, 'order')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Pedido
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePrintOrder(selectedOrder, 'quote')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Orçamento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pedido #{selectedOrder?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pedido será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
