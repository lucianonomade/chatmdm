import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CreditCard, Banknote, QrCode, Check, CalendarIcon, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

type PaymentMethod = 'cash' | 'pix' | 'card';

export interface PaymentData {
  method: PaymentMethod;
  paymentDate: Date;
  installments: { date: Date; amount: number }[];
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartTotal: number;
  paymentMethod: PaymentMethod | null;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  amountPaid: string;
  setAmountPaid: (value: string) => void;
  onFinishSale: (method: PaymentMethod, paymentData?: PaymentData) => void;
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

  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [installmentDates, setInstallmentDates] = useState<Date[]>([]);

  // Reset states when dialog opens
  useEffect(() => {
    if (open) {
      setPaymentDate(new Date());
      setInstallmentsCount(2);
    }
  }, [open]);

  // Update installment dates when count changes
  useEffect(() => {
    if (remaining > 0) {
      const dates: Date[] = [];
      for (let i = 0; i < installmentsCount; i++) {
        dates.push(addMonths(new Date(), i + 1));
      }
      setInstallmentDates(dates);
    }
  }, [installmentsCount, remaining]);

  const installmentValue = remaining > 0 ? remaining / installmentsCount : 0;

  const handleConfirm = () => {
    if (!paymentMethod) return;

    const paymentData: PaymentData = {
      method: paymentMethod,
      paymentDate,
      installments: remaining > 0 
        ? installmentDates.map(date => ({ date, amount: installmentValue }))
        : []
    };

    onFinishSale(paymentMethod, paymentData);
  };

  const updateInstallmentDate = (index: number, date: Date | undefined) => {
    if (!date) return;
    const newDates = [...installmentDates];
    newDates[index] = date;
    setInstallmentDates(newDates);
  };

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

          {/* Data de Pagamento da Entrada */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Data do Pagamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-12"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(paymentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Parcelamento do Restante */}
          {remaining > 0 && (
            <div className="space-y-3 p-4 bg-warning/10 rounded-xl border border-warning/20">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-warning">
                  Parcelar Restante (R$ {remaining.toFixed(2)})
                </Label>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setInstallmentsCount(Math.max(1, installmentsCount - 1))}
                    disabled={installmentsCount <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-bold text-lg">{installmentsCount}x</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setInstallmentsCount(Math.min(12, installmentsCount + 1))}
                    disabled={installmentsCount >= 12}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 text-right">
                  <span className="text-sm text-muted-foreground">Parcela: </span>
                  <span className="font-bold text-warning">R$ {installmentValue.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {installmentsCount}x de R$ {installmentValue.toFixed(2)} = R$ {remaining.toFixed(2)} restante
              </p>

              {/* Datas das Parcelas */}
              <div className="space-y-2 mt-3">
                <Label className="text-xs font-medium text-muted-foreground">Datas das Parcelas</Label>
                <div className="grid grid-cols-2 gap-2">
                  {installmentDates.map((date, index) => (
                    <Popover key={index}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="justify-start text-left font-normal h-9 text-xs"
                        >
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          <span className="font-semibold mr-1">{index + 1}ª</span>
                          {format(date, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(d) => updateInstallmentDate(index, d)}
                          initialFocus
                          className="pointer-events-auto"
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Botão Confirmar */}
          <Button
            onClick={handleConfirm}
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
