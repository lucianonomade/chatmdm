import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, User, Eye, Printer, ChevronDown } from "lucide-react";
import { ServiceOrder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { playClickSound } from "@/hooks/useClickSound";

interface OrderKanbanCardProps {
  order: ServiceOrder;
  onView: () => void;
  onPrint: (type: 'production' | 'receipt' | 'order' | 'quote') => void;
  onStatusChange: (status: 'pending' | 'production' | 'finished' | 'delivered') => void;
}

export function OrderKanbanCard({ order, onView, onPrint, onStatusChange }: OrderKanbanCardProps) {
  const getPaymentBadge = () => {
    if (order.paymentStatus === 'paid') {
      return <Badge className="bg-success/10 text-success text-xs">Pago</Badge>;
    }
    if (order.paymentStatus === 'partial') {
      return <Badge className="bg-warning/10 text-warning text-xs">Parcial</Badge>;
    }
    return <Badge className="bg-destructive/10 text-destructive text-xs">Pendente</Badge>;
  };

  const remaining = order.remainingAmount || (order.total - (order.amountPaid || 0));

  return (
    <Card
      role="button"
      tabIndex={0}
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => {
        playClickSound();
        onView();
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-sm font-bold">#{order.id}</span>
          {getPaymentBadge()}
        </div>
        <h4 className="font-semibold mb-1 truncate">{order.customerName}</h4>
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Calendar className="w-3 h-3" />
          {new Date(order.createdAt).toLocaleDateString()}
          {order.deadline && (
            <>
              <Clock className="w-3 h-3 ml-2" />
              {new Date(order.deadline).toLocaleDateString()}
            </>
          )}
        </div>
        {order.sellerName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <User className="w-3 h-3" />
            {order.sellerName}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2)}</p>
            {remaining > 0 && (
              <p className="text-xs text-warning">Falta: R$ {remaining.toFixed(2)}</p>
            )}
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={onView}>
              <Eye className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Printer className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPrint('receipt')}>
                  Recibo (Cupom)
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
