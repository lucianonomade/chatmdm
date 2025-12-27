import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useSupabaseFixedExpenses } from "@/hooks/useSupabaseFixedExpenses";
import { useSyncedCompanySettings } from "@/hooks/useSyncedCompanySettings";
import { escapeHtml, sanitizeUrl } from "@/lib/printUtils";
import { ServiceOrder } from "@/lib/types";
import { ClipboardList, DollarSign, Wallet, CheckCircle2, Clock, ChevronDown, Printer } from "lucide-react";

interface DailyTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyTasksDialog({ open, onOpenChange }: DailyTasksDialogProps) {
  const navigate = useNavigate();
  const { orders } = useSupabaseOrders();
  const { fixedExpenses } = useSupabaseFixedExpenses();
  const { settings: companySettings } = useSyncedCompanySettings();
  const { authUser } = useAuth();

  const accessibleOrders = authUser?.role === 'seller'
    ? orders.filter(o => o.sellerId === authUser.id)
    : orders;

  const pendingTasks = accessibleOrders.filter(o => o.status === 'production' || o.status === 'pending');
  const receivables = accessibleOrders.filter(o => 
    o.paymentStatus === 'pending' || o.paymentStatus === 'partial'
  );
  const totalReceivable = receivables.reduce((acc, curr) => 
    acc + (curr.remainingAmount || (curr.total - (curr.amountPaid || 0))), 0
  );

  const today = new Date();
  const currentDay = today.getDate();
  const pendingFixedExpenses = fixedExpenses.filter(fe => fe.active && fe.dueDay >= currentDay);
  const totalToPay = pendingFixedExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const printSection = (type: 'all' | 'orders' | 'receivables' | 'payables') => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Tarefas do Dia</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
      .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
      .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
      .print-actions .btn-print { background: #22c55e; }
      .print-actions .btn-close { background: #ef4444; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
      .section { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; }
      .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dashed #ccc; }
      .item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #eee; }
      .item-name { font-weight: 500; }
      .item-details { color: #666; font-size: 11px; }
      .total { text-align: right; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 1px solid #000; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; background: #eee; }
      @media print { .print-actions { display: none !important; } }
    `);
    printWindow.document.write('</style></head><body>');

    printWindow.document.write(`
      <div class="print-actions">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
        <button class="btn-close" onclick="window.close()">✕ Fechar</button>
      </div>
    `);

    printWindow.document.write(`
      <div class="header">
        ${sanitizeUrl(companySettings.logoUrl) 
          ? `<img src="${sanitizeUrl(companySettings.logoUrl)}" alt="Logo" style="max-height: 50px; max-width: 120px; margin-bottom: 8px;" />` 
          : `<div style="font-size: 16px; font-weight: bold;">${escapeHtml(companySettings.name)}</div>`}
        ${companySettings.cnpj ? `<div style="font-size: 12px;">CNPJ: ${escapeHtml(companySettings.cnpj)}</div>` : ''}
        <div>TAREFAS DO DIA - ${today.toLocaleDateString()}</div>
      </div>
    `);

    if (type === 'all' || type === 'orders') {
      printWindow.document.write(`
        <div class="section">
          <div class="section-title">PEDIDOS EM ABERTO (${pendingTasks.length})</div>
          ${pendingTasks.length === 0 ? '<div>Nenhum pedido pendente</div>' : ''}
          ${pendingTasks.map(order => `
            <div class="item">
              <div>
                <div class="item-name">${escapeHtml(order.customerName)}</div>
                <div class="item-details">${order.items.map(i => escapeHtml(i.name)).join(', ').slice(0, 50)}</div>
              </div>
              <div><span class="badge">${order.status === 'production' ? 'Produção' : 'Aguardando'}</span></div>
            </div>
          `).join('')}
        </div>
      `);
    }

    if (type === 'all' || type === 'receivables') {
      printWindow.document.write(`
        <div class="section">
          <div class="section-title">CONTAS A RECEBER</div>
          ${receivables.length === 0 ? '<div>Nenhuma conta pendente</div>' : ''}
          ${receivables.map(order => {
            const remaining = order.remainingAmount || (order.total - (order.amountPaid || 0));
            return `
              <div class="item">
                <div>
                  <div class="item-name">${escapeHtml(order.customerName)}</div>
                  <div class="item-details">Pedido #${escapeHtml(order.id.slice(-6))}</div>
                </div>
                <div>R$ ${remaining.toFixed(2)}</div>
              </div>
            `;
          }).join('')}
          <div class="total">Total: R$ ${totalReceivable.toFixed(2)}</div>
        </div>
      `);
    }

    if (type === 'all' || type === 'payables') {
      printWindow.document.write(`
        <div class="section">
          <div class="section-title">CONTAS A PAGAR (MÊS)</div>
          ${pendingFixedExpenses.length === 0 ? '<div>Todas as contas pagas</div>' : ''}
          ${pendingFixedExpenses.map(expense => `
            <div class="item">
              <div>
                <div class="item-name">${escapeHtml(expense.name)}</div>
                <div class="item-details">Venc. dia ${expense.dueDay}</div>
              </div>
              <div>R$ ${expense.amount.toFixed(2)}</div>
            </div>
          `).join('')}
          <div class="total">Total: R$ ${totalToPay.toFixed(2)}</div>
        </div>
      `);
    }

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  const printOrder = (order: ServiceOrder) => {
    const printWindow = window.open('', '', 'height=600,width=400');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Pedido</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: 'Courier New', monospace; padding: 15px; font-size: 12px; width: 380px; }
      .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 12px; padding: 10px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
      .print-actions button { border: none; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
      .print-actions .btn-print { background: #22c55e; }
      .print-actions .btn-close { background: #ef4444; }
      .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
      .info { margin-bottom: 10px; }
      .item { padding: 5px 0; border-bottom: 1px dotted #ccc; }
      .total { font-weight: bold; text-align: right; margin-top: 10px; padding-top: 10px; border-top: 1px solid #000; }
      @media print { .print-actions { display: none !important; } }
    `);
    printWindow.document.write('</style></head><body>');

    printWindow.document.write(`
      <div class="print-actions">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
        <button class="btn-close" onclick="window.close()">✕ Fechar</button>
      </div>
    `);

    printWindow.document.write(`
      <div class="header">
        ${sanitizeUrl(companySettings.logoUrl) 
          ? `<img src="${sanitizeUrl(companySettings.logoUrl)}" alt="Logo" style="max-height: 40px; max-width: 100px; margin-bottom: 5px;" />` 
          : `<div style="font-weight: bold;">${escapeHtml(companySettings.name)}</div>`}
        ${companySettings.cnpj ? `<div style="font-size: 11px;">CNPJ: ${escapeHtml(companySettings.cnpj)}</div>` : ''}
        <div>Pedido #${escapeHtml(order.id)}</div>
      </div>
      <div class="info">
        <div><strong>Cliente:</strong> ${escapeHtml(order.customerName)}</div>
        <div><strong>Data:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
        <div><strong>Status:</strong> ${order.status === 'production' ? 'Em Produção' : order.status === 'pending' ? 'Aguardando' : escapeHtml(order.status)}</div>
      </div>
      <div style="margin-top: 10px;">
        <strong>Itens:</strong>
        ${order.items.map(item => `
          <div class="item">
            ${item.quantity}x ${escapeHtml(item.name)} - R$ ${item.total.toFixed(2)}
          </div>
        `).join('')}
      </div>
      <div class="total">Total: R$ ${order.total.toFixed(2)}</div>
    `);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[85vh] flex flex-col p-0 pt-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="p-3 pb-2 border-b shrink-0 mt-1">
          <div className="flex items-center justify-between gap-3 pr-10">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <ClipboardList className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{authUser?.role === 'seller' ? 'Minhas Tarefas' : 'Tarefas do Dia'}</span>
            </DialogTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs shrink-0">
                  <Printer className="w-3 h-3" />
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-[100]">
                <DropdownMenuItem onClick={() => printSection('all')}>Imprimir Tudo</DropdownMenuItem>
                <DropdownMenuItem onClick={() => printSection('orders')}>Só Pedidos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => printSection('receivables')}>Só Receber</DropdownMenuItem>
                {authUser?.role !== 'seller' && (
                  <DropdownMenuItem onClick={() => printSection('payables')}>Só Pagar</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2 sm:p-3 min-h-0">
          <div className="space-y-2">
            {/* Orders in Production/Pending */}
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="py-1.5 px-2">
                <CardTitle className="text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-warning" />
                    Pedidos em Aberto
                  </span>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs h-5">
                    {pendingTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                {pendingTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Nenhum pedido pendente
                  </p>
                ) : (
                  <div className="space-y-1">
                    {pendingTasks.slice(0, 4).map(order => (
                      <div 
                        key={order.id} 
                        className="flex items-center justify-between p-1.5 rounded bg-background/60 hover:bg-background cursor-pointer"
                        onClick={() => handleNavigate(`/ordens-servico?tab=${order.status}&order=${order.id}`)}
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-xs font-medium truncate">{order.customerName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {order.items.map(i => i.name).join(', ')}
                          </p>
                        </div>
                        <Badge variant={order.status === 'production' ? 'default' : 'secondary'} className="text-[10px] h-5 shrink-0">
                          {order.status === 'production' ? 'Produção' : 'Aguard.'}
                        </Badge>
                      </div>
                    ))}
                    {pendingTasks.length > 4 && (
                      <p className="text-[10px] text-muted-foreground text-center py-0.5">
                        +{pendingTasks.length - 4} mais
                      </p>
                    )}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-1.5 text-warning hover:text-warning h-7 text-xs"
                  onClick={() => handleNavigate('/ordens-servico')}
                >
                  Ver Todos os Pedidos
                </Button>
              </CardContent>
            </Card>

            {/* Accounts Receivable */}
            <Card className="border-info/30 bg-info/5">
              <CardHeader className="py-1.5 px-2">
                <CardTitle className="text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-info" />
                    Contas a Receber
                  </span>
                  <Badge variant="outline" className="bg-info/10 text-info border-info/30 text-xs h-5">
                    R$ {totalReceivable.toFixed(2)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                {receivables.length === 0 ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Nenhuma conta pendente
                  </p>
                ) : (
                  <div className="space-y-1">
                    {receivables.slice(0, 4).map(order => {
                      const remaining = order.remainingAmount || (order.total - (order.amountPaid || 0));
                      return (
                        <div 
                          key={order.id} 
                          className="flex items-center justify-between p-1.5 rounded bg-background/60 hover:bg-background cursor-pointer"
                          onClick={() => handleNavigate(`/ordens-servico?tab=${order.status === 'pending' ? 'pending' : order.status === 'production' ? 'production' : 'completed'}&order=${order.id}`)}
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-xs font-medium truncate">{order.customerName}</p>
                            <p className="text-[10px] text-muted-foreground">Pedido #{order.id.slice(-6)}</p>
                          </div>
                          <span className="text-xs font-semibold text-info whitespace-nowrap shrink-0">
                            R$ {remaining.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    {receivables.length > 4 && (
                      <p className="text-[10px] text-muted-foreground text-center py-0.5">
                        +{receivables.length - 4} mais
                      </p>
                    )}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-1.5 text-info hover:text-info h-7 text-xs"
                  onClick={() => handleNavigate('/contas-receber')}
                >
                  Ver Contas a Receber
                </Button>
              </CardContent>
            </Card>

            {/* Fixed Expenses - only for admin/manager */}
            {authUser?.role !== 'seller' && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="py-1.5 px-2">
                  <CardTitle className="text-xs font-medium flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-destructive" />
                      Contas a Pagar
                    </span>
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs h-5">
                      R$ {totalToPay.toFixed(2)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  {pendingFixedExpenses.length === 0 ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Todas as contas pagas
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {pendingFixedExpenses.slice(0, 3).map(expense => (
                        <div 
                          key={expense.id} 
                          className="flex items-center justify-between p-1.5 rounded bg-background/60 hover:bg-background"
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-xs font-medium truncate">{expense.name}</p>
                            <p className="text-[10px] text-muted-foreground">Venc. dia {expense.dueDay}</p>
                          </div>
                          <span className="text-xs font-semibold text-destructive whitespace-nowrap shrink-0">
                            R$ {expense.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {pendingFixedExpenses.length > 3 && (
                        <p className="text-[10px] text-muted-foreground text-center py-0.5">
                          +{pendingFixedExpenses.length - 3} mais
                        </p>
                      )}
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-1.5 text-destructive hover:text-destructive h-7 text-xs"
                    onClick={() => handleNavigate('/caixa')}
                  >
                    Ver Caixa
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-end p-2 border-t">
          <Button onClick={() => onOpenChange(false)} size="sm" className="h-8">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
