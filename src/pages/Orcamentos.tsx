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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PrintButton, PrintIconButton } from "@/components/ui/print-button";
import { Plus, Search, Eye, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { useStore, ServiceOrder } from "@/lib/store";
import { toast } from "sonner";

export default function Orcamentos() {
  const { orders, customers, updateOrder, companySettings } = useStore();

  const [search, setSearch] = useState("");
  const [viewOrder, setViewOrder] = useState<ServiceOrder | null>(null);

  // Filter orders that can be considered "orçamentos" (budgets)
  const orcamentos = orders.filter(o => o.status === 'pending' || o.paymentStatus === 'pending');

  const filteredOrcamentos = orcamentos.filter(
    (o) =>
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
  );

  const statusConfig = {
    pending: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20", icon: Clock },
    approved: { label: "Aprovado", className: "bg-success/10 text-success border-success/20", icon: CheckCircle },
    rejected: { label: "Reprovado", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  };

  const handleApprove = (order: ServiceOrder) => {
    updateOrder(order.id, { status: 'production' });
    toast.success("Orçamento aprovado! Enviado para produção.");
  };

  const handleReject = (order: ServiceOrder) => {
    updateOrder(order.id, { status: 'delivered', paymentStatus: 'pending' });
    toast.info("Orçamento marcado como reprovado.");
  };

  const handlePrint = (order: ServiceOrder) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ORÇAMENTO - ORC-${order.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 80mm; margin: 0 auto; font-size: 12px; }
            .action-bar { display: flex; gap: 10px; justify-content: center; margin-bottom: 15px; padding: 12px; background: #f0f0f0; border-radius: 10px; }
            .action-btn { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            .action-btn.print { background: #22c55e; }
            .action-btn.close { background: #ef4444; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; }
            .header h1 { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .header .doc-number { font-size: 14px; font-weight: bold; }
            .header .date { font-size: 11px; color: #666; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 8px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .info-label { color: #666; }
            .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0; }
            .item { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dotted #ddd; }
            .item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
            .item-name { font-weight: bold; }
            .item-price { display: flex; justify-content: space-between; margin-top: 3px; }
            .total-section { background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 15px 0; }
            .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; }
            .footer { text-align: center; font-size: 10px; color: #666; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #000; }
            .validity { text-align: center; font-size: 11px; margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 4px; }
            @media print { body { max-width: 100%; } .action-bar { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="action-bar">
            <button class="action-btn print" onclick="window.print()">🖨️ Imprimir</button>
            <button class="action-btn close" onclick="window.close()">✕ Fechar</button>
          </div>
          <div class="header">
            ${companySettings.logoUrl 
              ? `<img src="${companySettings.logoUrl}" alt="Logo" style="max-height: 50px; max-width: 120px; margin-bottom: 8px;" />` 
              : `<div style="font-weight: bold; margin-bottom: 3px;">${companySettings.name}</div>`}
            ${companySettings.cnpj ? `<div style="font-size: 11px; margin-bottom: 3px;">CNPJ: ${companySettings.cnpj}</div>` : ''}
            <h1>ORÇAMENTO</h1>
            <div class="doc-number">ORC-${order.id}</div>
            <div class="date">${new Date(order.createdAt).toLocaleDateString('pt-BR')}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Dados do Cliente</div>
            <div class="info-row">
              <span class="info-label">Cliente:</span>
              <span>${order.customerName}</span>
            </div>
          </div>
          
          <div class="items">
            <div class="section-title">Itens do Orçamento</div>
            ${order.items.map(item => `
              <div class="item">
                <div class="item-name">${item.name}</div>
                ${item.variationName ? `<div style="font-size: 11px; color: #666;">${item.variationName}</div>` : ''}
                <div class="item-price">
                  <span>${item.quantity}x R$ ${item.price.toFixed(2)}</span>
                  <span>R$ ${item.total.toFixed(2)}</span>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="total-section">
            <div class="total-row">
              <span>TOTAL</span>
              <span>R$ ${order.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="validity">
            <strong>Validade:</strong> 15 dias a partir da data de emissão
          </div>
          
          <div class="footer">
            <p>Este orçamento não representa compromisso de venda</p>
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
    <MainLayout title="Orçamentos">
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
          <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => toast.info("Use o PDV para criar novos orçamentos")}>
            <Plus className="h-4 w-4" />
            Novo Orçamento
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Número</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold text-right">Valor</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrcamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum orçamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrcamentos.map((orc) => (
                  <TableRow key={orc.id} className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer">
                    <TableCell className="font-mono text-sm">ORC-{orc.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{orc.customerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(orc.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {orc.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.pending.className}>
                        {statusConfig.pending.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewOrder(orc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <PrintIconButton onClick={() => handlePrint(orc)} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => handleApprove(orc)}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleReject(orc)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Order Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Orçamento #{viewOrder?.id}</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{viewOrder.customerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">{new Date(viewOrder.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Itens</Label>
                <div className="mt-2 space-y-2">
                  {viewOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-muted/50 rounded">
                      <span>{item.name} {item.variationName && `(${item.variationName})`}</span>
                      <span className="font-medium">R$ {item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <span className="text-lg font-medium">Total</span>
                <span className="text-lg font-bold text-primary">R$ {viewOrder.total.toFixed(2)}</span>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={() => { handleApprove(viewOrder); setViewOrder(null); }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
                <PrintButton onClick={() => handlePrint(viewOrder)} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}