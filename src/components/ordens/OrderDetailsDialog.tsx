import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Calendar, Clock, User, FileText, Printer, ChevronDown, Trash2, Pencil, MessageCircle, CreditCard, Banknote, Wallet } from "lucide-react";
import { ServiceOrder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/lib/store";
import { sendOrderViaWhatsApp } from "@/lib/whatsappUtils";
import { useSupabaseCustomers } from "@/hooks/useSupabaseCustomers";

interface OrderDetailsDialogProps {
  order: ServiceOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: 'pending' | 'production' | 'finished' | 'delivered') => void;
  onPrint: (type: 'production' | 'receipt' | 'order' | 'quote') => void;
  onDelete?: (orderId: string) => void;
  onEdit?: (order: ServiceOrder) => void;
}

export function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
  onStatusChange,
  onPrint,
  onDelete,
  onEdit,
}: OrderDetailsDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { authUser } = useAuth();
  const { companySettings } = useStore();
  const { customers } = useSupabaseCustomers();

  if (!order) return null;

  // Get customer phone
  const customer = customers.find(c => c.id === order.customerId);
  const customerPhone = customer?.phone;

  const paid = order.amountPaid ?? (order.paymentStatus === 'paid' ? order.total : 0);
  const remaining = order.remainingAmount ?? (order.total - paid);

  // Only admins can delete orders
  const canDelete = authUser?.role === 'admin';
  // Admins and managers can edit orders
  const canEdit = authUser?.role === 'admin' || authUser?.role === 'manager';

  const getStatusBadge = () => {
    switch (order.status) {
      case 'pending':
        return <Badge className="bg-warning/10 text-warning">Aguardando</Badge>;
      case 'production':
        return <Badge className="bg-info/10 text-info">Em Produção</Badge>;
      case 'finished':
        return <Badge className="bg-success/10 text-success">Finalizado</Badge>;
      case 'delivered':
        return <Badge className="bg-muted text-muted-foreground">Entregue</Badge>;
      default:
        return null;
    }
  };

  const getPaymentBadge = () => {
    switch (order.paymentStatus) {
      case 'paid':
        return <Badge className="bg-success/10 text-success">Pago</Badge>;
      case 'partial':
        return <Badge className="bg-warning/10 text-warning">Parcial</Badge>;
      default:
        return <Badge className="bg-destructive/10 text-destructive">Pendente</Badge>;
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(order.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(order);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader className="pb-2 pr-12 mt-2">
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base">#{order.id}</span>
              <span className="font-semibold">{order.customerName}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {getStatusBadge()}
              {getPaymentBadge()}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Buttons */}
            <div className="border rounded-lg p-3 space-y-2">
              <span className="text-xs text-muted-foreground">Mudar Status:</span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={order.status === 'pending' ? 'default' : 'outline'}
                  className={cn("text-xs h-8 px-3", order.status === 'pending' && 'bg-warning hover:bg-warning/90')}
                  onClick={() => onStatusChange('pending')}
                >
                  Aguardando
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'production' ? 'default' : 'outline'}
                  className={cn("text-xs h-8 px-3", order.status === 'production' && 'bg-info hover:bg-info/90')}
                  onClick={() => onStatusChange('production')}
                >
                  Em Produção
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'finished' ? 'default' : 'outline'}
                  className={cn("text-xs h-8 px-3", order.status === 'finished' && 'bg-success hover:bg-success/90')}
                  onClick={() => onStatusChange('finished')}
                >
                  Finalizado
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'delivered' ? 'default' : 'outline'}
                  className={cn("text-xs h-8 px-3", order.status === 'delivered' && 'bg-muted')}
                  onClick={() => onStatusChange('delivered')}
                >
                  Entregue
                </Button>
              </div>
            </div>

            {/* Payment Info */}
            <div className="border rounded-lg p-3 space-y-2">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Informações de Pagamento
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Payment Method */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Forma de Pagamento</span>
                  <div className="flex items-center gap-1.5">
                    {order.paymentMethod === 'cash' && <Banknote className="w-4 h-4 text-success" />}
                    {order.paymentMethod === 'pix' && <Wallet className="w-4 h-4 text-info" />}
                    {order.paymentMethod === 'card' && <CreditCard className="w-4 h-4 text-primary" />}
                    {!order.paymentMethod && <Wallet className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm font-medium">
                      {order.paymentMethod === 'cash' && 'Dinheiro'}
                      {order.paymentMethod === 'pix' && 'PIX'}
                      {order.paymentMethod === 'card' && (order.payments && order.payments.length > 1 ? 'Parcelado' : 'Cartão')}
                      {!order.paymentMethod && 'Não informado'}
                    </span>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Status do Pagamento</span>
                  <div>{getPaymentBadge()}</div>
                </div>
              </div>

              {/* Amounts */}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total do Pedido</span>
                  <span className="font-semibold">R$ {order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor Pago</span>
                  <span className="font-semibold text-success">R$ {paid.toFixed(2)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Restante</span>
                    <span className="font-semibold text-destructive">R$ {remaining.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Installments info - summary only */}
                {order.payments && order.payments.length > 1 && (() => {
                  const installmentEntries = order.payments.filter((p) => {
                    const anyP = p as any;
                    return !anyP?.method || !anyP?.date;
                  });

                  const qty = installmentEntries.length > 0 ? installmentEntries.length : order.payments.length;
                  const value = (installmentEntries[0]?.amount ?? order.payments[0]?.amount ?? 0) as number;

                  return (
                    <div className="flex justify-between text-sm border-t pt-2 mt-2">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Parcelamento
                      </span>
                      <span className="font-semibold text-primary">
                        {qty}x de R$ {value.toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Items - Clickable to edit */}
            <div 
              className={cn(
                "border rounded-lg p-3 space-y-2 transition-colors",
                canEdit && onEdit && "cursor-pointer hover:bg-muted/50 hover:border-primary/50"
              )}
              onClick={() => {
                if (canEdit && onEdit) {
                  handleEdit();
                }
              }}
              title={canEdit && onEdit ? "Clique para editar este pedido" : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Itens do Pedido</span>
                {canEdit && onEdit && (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <Pencil className="w-3 h-3" />
                    Clique para editar
                  </span>
                )}
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{item.quantity}x</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    {item.variationName && (
                      <div className="text-xs text-muted-foreground">{item.variationName}</div>
                    )}
                    {item.dimensions && (
                      <div className="text-xs text-muted-foreground">Medidas: {item.dimensions}</div>
                    )}
                    {item.finishing && (
                      <div className="text-xs text-primary">Acabamento: {item.finishing}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full" size="lg">
                    <Printer className="w-4 h-4 mr-2" />
                    IMPRIMIR
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56">
                  <DropdownMenuItem onClick={() => onPrint('receipt')}>
                    Recibo (Cupom 80mm)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPrint('order')}>
                    Pedido (A4)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPrint('production')}>
                    Ordem de Produção
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPrint('quote')}>
                    Orçamento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600" size="lg">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WHATSAPP
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56">
                  <DropdownMenuItem onClick={() => sendOrderViaWhatsApp(order, 'receipt', companySettings, customerPhone)}>
                    Enviar Recibo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => sendOrderViaWhatsApp(order, 'order', companySettings, customerPhone)}>
                    Enviar Pedido
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => sendOrderViaWhatsApp(order, 'quote', companySettings, customerPhone)}>
                    Enviar Orçamento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {canEdit && onEdit && (
              <Button variant="outline" className="flex-1" onClick={handleEdit}>
                <Pencil className="w-4 h-4 mr-1" />
                Editar
              </Button>
            )}
            {canDelete && onDelete && (
              <Button variant="destructive" className="flex-1" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pedido #{order.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pedido será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}