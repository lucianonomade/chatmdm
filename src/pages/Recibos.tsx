import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { PrintButton, PrintIconButton } from "@/components/ui/print-button";
import { Plus, Search, Eye, Receipt } from "lucide-react";
import { useStore, ServiceOrder } from "@/lib/store";
import { toast } from "sonner";

export default function Recibos() {
  const { orders, companySettings } = useStore();
  const [search, setSearch] = useState("");
  const [viewOrder, setViewOrder] = useState<ServiceOrder | null>(null);

  // Filter orders that have payments (recibos are for paid orders)
  const recibos = orders.filter(o => o.paymentStatus === 'paid' || (o.payments && o.payments.length > 0));

  const filteredRecibos = recibos.filter(
    (r) =>
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase())
  );

  const pagamentoConfig: Record<string, { className: string }> = {
    pix: { className: "bg-info/10 text-info border-info/20" },
    card: { className: "bg-primary/10 text-primary border-primary/20" },
    cash: { className: "bg-success/10 text-success border-success/20" },
  };

  const getPaymentLabel = (method?: string) => {
    switch (method) {
      case 'pix': return 'Pix';
      case 'card': return 'Cartão';
      case 'cash': return 'Dinheiro';
      default: return '-';
    }
  };

  const handlePrint = (order: ServiceOrder) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>RECIBO - REC-${order.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 80mm; margin: 0 auto; font-size: 12px; }
            .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 12px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
            .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            .print-actions .btn-print { background: #22c55e; }
            .print-actions .btn-close { background: #ef4444; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; }
            .header h1 { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .header .doc-number { font-size: 14px; font-weight: bold; }
            .header .date { font-size: 11px; color: #666; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 8px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .info-label { color: #666; }
            .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0; }
            .item { margin-bottom: 5px; display: flex; justify-content: space-between; }
            .total-section { background: #d1fae5; padding: 10px; border-radius: 4px; margin: 15px 0; text-align: center; }
            .total-label { font-size: 11px; color: #065f46; }
            .total-value { font-size: 20px; font-weight: bold; color: #065f46; }
            .payment-badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; background: #dbeafe; color: #1e40af; }
            .footer { text-align: center; font-size: 10px; color: #666; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #000; }
            @media print { body { max-width: 100%; } .print-actions { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="print-actions">
            <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
            <button class="btn-close" onclick="window.close()">✕ Fechar</button>
          </div>
          <div class="header">
            ${companySettings.logoUrl 
              ? `<img src="${companySettings.logoUrl}" alt="Logo" style="max-height: 50px; max-width: 120px; margin-bottom: 8px;" />` 
              : `<div style="font-weight: bold; margin-bottom: 3px;">${companySettings.name}</div>`}
            ${companySettings.cnpj ? `<div style="font-size: 11px; margin-bottom: 3px;">CNPJ: ${companySettings.cnpj}</div>` : ''}
            <h1>RECIBO</h1>
            <div class="doc-number">REC-${order.id}</div>
            <div class="date">${new Date(order.createdAt).toLocaleDateString('pt-BR')} às ${new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Dados do Cliente</div>
            <div class="info-row">
              <span class="info-label">Cliente:</span>
              <span>${order.customerName}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Forma de Pagamento</div>
            <div style="text-align: center; margin-top: 5px;">
              <span class="payment-badge">${getPaymentLabel(order.paymentMethod)}</span>
            </div>
          </div>
          
          <div class="items">
            <div class="section-title">Itens</div>
            ${order.items.map(item => `
              <div class="item">
                <span>${item.quantity}x ${item.name}</span>
                <span>R$ ${item.total.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="total-section">
            <div class="total-label">VALOR PAGO</div>
            <div class="total-value">R$ ${(order.amountPaid || order.total).toFixed(2)}</div>
          </div>
          
          <div class="footer">
            <p>Obrigado pela preferência!</p>
            <p style="margin-top: 5px;">Documento gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
    }
    toast.success("Documento aberto (use Imprimir ou Fechar no topo)");
  };

  return (
    <MainLayout title="Recibos">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => toast.info("Recibos são gerados automaticamente ao finalizar vendas no PDV")}>
            <Plus className="h-4 w-4" />
            Novo Recibo
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Número</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Vendedor</TableHead>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold text-right">Valor</TableHead>
                <TableHead className="font-semibold">Pagamento</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecibos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum recibo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecibos.map((rec) => (
                  <TableRow key={rec.id} className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer">
                    <TableCell className="font-mono text-sm">REC-{rec.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{rec.customerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rec.sellerName || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(rec.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {(rec.amountPaid || rec.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge className={pagamentoConfig[rec.paymentMethod || 'cash']?.className || pagamentoConfig.cash.className}>
                        {getPaymentLabel(rec.paymentMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewOrder(rec)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <PrintIconButton onClick={() => handlePrint(rec)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Recibo Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Recibo #REC-{viewOrder?.id}</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              <div className="text-center p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">Valor Pago</p>
                <p className="text-3xl font-bold text-success">
                  R$ {(viewOrder.amountPaid || viewOrder.total).toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{viewOrder.customerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">{new Date(viewOrder.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vendedor</Label>
                  <p className="font-medium">{viewOrder.sellerName || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Forma de Pagamento</Label>
                  <p className="font-medium">{getPaymentLabel(viewOrder.paymentMethod)}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Itens</Label>
                <div className="mt-2 space-y-1 text-sm">
                  {viewOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <PrintButton 
                label="Imprimir Recibo" 
                onClick={() => handlePrint(viewOrder)} 
                variant="default"
                size="default"
                className="w-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}