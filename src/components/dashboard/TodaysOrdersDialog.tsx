import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogHeaderWithAction } from "@/components/ui/dialog-header-with-action";
import { PrintButton } from "@/components/ui/print-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ServiceOrder } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TodaysOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: ServiceOrder[];
  onOrderSelect: (order: ServiceOrder) => void;
  onPrint: () => void;
}

export function TodaysOrdersDialog({
  open,
  onOpenChange,
  orders,
  onOrderSelect,
  onPrint,
}: TodaysOrdersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>Pedidos do Dia (Recebido Hoje)</DialogTitle>
        </DialogHeader>
        <DialogHeaderWithAction
          className="pr-12 mt-2"
          title="Pedidos do Dia (Recebido Hoje)"
          action={
            <PrintButton onClick={onPrint} />
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
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Nenhum pedido feito hoje.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map(order => {
                  const paidAmount = order.amountPaid ?? (order.paymentStatus === 'paid' ? order.total : 0);
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200"
                      onClick={() => onOrderSelect(order)}
                    >
                      <TableCell className="font-mono font-medium">#{order.id}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          order.status === 'finished' ? "bg-success/10 text-success" :
                          order.status === 'production' ? "bg-info/10 text-info" :
                          "bg-warning/10 text-warning"
                        )}>
                          {order.status === 'finished' ? 'Finalizado' :
                           order.status === 'production' ? 'Produção' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        R$ {order.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-success">
                        R$ {paidAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
