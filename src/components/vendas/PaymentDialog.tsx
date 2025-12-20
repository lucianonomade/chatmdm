import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Banknote, QrCode, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentMethod = 'cash' | 'pix' | 'card';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartTotal: number;
  paymentMethod: PaymentMethod | null;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  amountPaid: string;
  setAmountPaid: (value: string) => void;
  onFinishSale: (method: PaymentMethod) => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  cartTotal,
  paymentMethod,
  setPaymentMethod,
  amountPaid,
  setAmountPaid,
  onFinishSale,
}: PaymentDialogProps) {
  const paidValue = amountPaid === "" ? cartTotal : parseFloat(amountPaid.replace(',', '.'));
  const remaining = Math.max(0, cartTotal - (isNaN(paidValue) ? 0 : paidValue));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="p-6 pb-4 pr-12 mt-2">
          <DialogTitle className="text-2xl font-bold text-center">Pagamento</DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6 space-y-5">
          {/* Total da Venda */}
          <div className="bg-muted/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-semibold">Total da Venda</span>
              <span className="text-2xl font-bold text-foreground">R$ {cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Entrada / Restante */}
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-4">
              <Label className="text-sm text-muted-foreground">Valor de Entrada (R$)</Label>
              <Label className="text-sm font-medium text-muted-foreground">Restante a Pagar</Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={cartTotal.toFixed(2)}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="pl-10 h-12 text-base font-semibold bg-background"
                />
              </div>

              <div className="h-12 rounded-md border bg-muted/30 flex items-center justify-center">
                <span
                  className={cn(
                    "text-lg font-bold",
                    remaining > 0 ? "text-warning" : "text-success"
                  )}
                >
                  R$ {remaining.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">Forma de Pagamento</Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={cn(
                  "w-full rounded-2xl border-2 bg-background px-4 py-3 transition-all",
                  "flex flex-col items-center justify-center gap-2",
                  paymentMethod === 'cash'
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "rounded-xl border bg-card px-2.5 py-1.5",
                    paymentMethod === 'cash' ? "border-primary/30" : "border-border"
                  )}
                >
                  <Banknote className={cn("h-5 w-5", paymentMethod === 'cash' ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold underline underline-offset-4",
                    paymentMethod === 'cash' ? "text-primary" : "text-foreground"
                  )}
                >
                  Dinheiro
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={cn(
                  "w-full rounded-2xl border-2 bg-background px-4 py-3 transition-all",
                  "flex flex-col items-center justify-center gap-2",
                  paymentMethod === 'pix'
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "rounded-xl border bg-card px-2.5 py-1.5",
                    paymentMethod === 'pix' ? "border-primary/30" : "border-border"
                  )}
                >
                  <QrCode className={cn("h-5 w-5", paymentMethod === 'pix' ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold underline underline-offset-4",
                    paymentMethod === 'pix' ? "text-primary" : "text-foreground"
                  )}
                >
                  PIX
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={cn(
                  "w-full rounded-2xl border-2 bg-background px-4 py-3 transition-all",
                  "flex flex-col items-center justify-center gap-2",
                  paymentMethod === 'card'
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "rounded-xl border bg-card px-2.5 py-1.5",
                    paymentMethod === 'card' ? "border-primary/30" : "border-border"
                  )}
                >
                  <CreditCard className={cn("h-5 w-5", paymentMethod === 'card' ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold underline underline-offset-4",
                    paymentMethod === 'card' ? "text-primary" : "text-foreground"
                  )}
                >
                  Cartão
                </span>
              </button>
            </div>
          </div>

          {/* Botão Confirmar */}
          <Button
            onClick={() => paymentMethod && onFinishSale(paymentMethod)}
            disabled={!paymentMethod}
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
          >
            <Check className="w-5 h-5 mr-2" />
            CONFIRMAR PAGAMENTO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
