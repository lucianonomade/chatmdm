import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/ui/print-button";
import { Expense } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExpenseDetailsDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseDetailsDialog({ expense, open, onOpenChange }: ExpenseDetailsDialogProps) {
  if (!expense) return null;

  const formattedDate = expense.date 
    ? format(new Date(expense.date), "dd/MM/yyyy", { locale: ptBR })
    : '--/--/----';

  const formattedTime = expense.date
    ? format(new Date(expense.date), "HH:mm", { locale: ptBR })
    : '--:--';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da Compra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Card com detalhes */}
          <div className="bg-card border rounded-xl p-4 space-y-3 shadow-sm">
            {/* Header com ID e Fornecedor */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg">#{expense.id.slice(0, 6)}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold text-foreground">{expense.supplierName || 'Sem fornecedor'}</span>
            </div>

            {/* Data */}
            <p className="text-muted-foreground text-sm">{formattedDate} às {formattedTime}</p>

            {/* Descrição como badge */}
            <Badge variant="secondary" className="text-sm font-medium px-3 py-1.5">
              {expense.description}
            </Badge>

            {/* Categoria */}
            {expense.category && (
              <div className="text-sm">
                <span className="text-muted-foreground">Categoria: </span>
                <span className="font-medium text-foreground">{expense.category}</span>
              </div>
            )}

            {/* Valor */}
            <div className="flex items-center gap-4 pt-2">
              <div>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold text-lg text-foreground">R$ {expense.amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-end pt-2">
              <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-medium">
                Saída
              </Badge>
            </div>

            {/* Botão Imprimir */}
            <PrintButton 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => {
                const contentEl = document.getElementById('expense-print-content');
                if (!contentEl) return;

                const printWindow = window.open('', '_blank');
                if (!printWindow) return;

                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Comprovante de Compra</title>
                      <meta name="viewport" content="width=device-width, initial-scale=1" />
                      <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
                        .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
                        .print-actions .btn-print { background: #22c55e; }
                        .print-actions .btn-close { background: #ef4444; }
                        @media print { .print-actions { display: none !important; } }
                      </style>
                    </head>
                    <body>
                      <div class="print-actions">
                        <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
                        <button class="btn-close" onclick="window.close()">✕ Fechar</button>
                      </div>
                      ${contentEl.innerHTML}
                    </body>
                  </html>
                `);

                printWindow.document.close();
                printWindow.focus();
              }}
            />
          </div>

          {/* Conteúdo para impressão (hidden) */}
          <div id="expense-print-content" className="hidden print:block">
            <div className="p-4 space-y-2">
              <h2 className="text-xl font-bold">Comprovante de Compra</h2>
              <p><strong>ID:</strong> #{expense.id.slice(0, 6)}</p>
              <p><strong>Fornecedor:</strong> {expense.supplierName || 'N/A'}</p>
              <p><strong>Data:</strong> {formattedDate} às {formattedTime}</p>
              <p><strong>Descrição:</strong> {expense.description}</p>
              <p><strong>Categoria:</strong> {expense.category || 'N/A'}</p>
              <p><strong>Valor:</strong> R$ {expense.amount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
