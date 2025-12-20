import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Search } from "lucide-react";
import { ServiceOrder } from "@/lib/types";
import { cn } from "@/lib/utils";

interface OrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: ServiceOrder[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onOrderSelect: (order: ServiceOrder) => void;
  onPrint: () => void;
  title: string;
}

export function OrdersDialog({
  open,
  onOpenChange,
  orders,
  searchTerm,
  setSearchTerm,
  onOrderSelect,
  onPrint,
  title,
}: OrdersDialogProps) {
  const filteredOrders = orders.filter(o =>
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.includes(searchTerm)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogHeaderWithAction
          className="pr-12 mt-2"
          title={title}
          action={
            <PrintButton onClick={onPrint} />
          }
        />

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Restante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map(order => {
                  const paid = order.amountPaid || 0;
                  const remaining = order.remainingAmount || (order.total - paid);
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200"
                      onClick={() => onOrderSelect(order)}
                    >
                      <TableCell className="font-mono font-medium">#{order.id}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          order.paymentStatus === 'paid' ? "bg-success/10 text-success" :
                          order.paymentStatus === 'partial' ? "bg-warning/10 text-warning" :
                          "bg-destructive/10 text-destructive"
                        )}>
                          {order.paymentStatus === 'paid' ? 'Pago' :
                           order.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">R$ {order.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-success">R$ {paid.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-warning">
                        R$ {remaining.toFixed(2)}
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
