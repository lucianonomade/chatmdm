import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, Delete } from "lucide-react";

interface QuickSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: string;
  setCustomer: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  quantity: string;
  setQuantity: (value: string) => void;
  onAdd: () => void;
}

export function QuickSaleDialog({
  open,
  onOpenChange,
  customer,
  setCustomer,
  description,
  setDescription,
  amount,
  setAmount,
  quantity,
  setQuantity,
  onAdd,
}: QuickSaleDialogProps) {
  const handleNumpadPress = (val: string) => {
    if (val === 'C') {
      setAmount("");
      return;
    }
    if (val === 'back') {
      setAmount(amount.slice(0, -1));
      return;
    }
    if (val === '.' && amount.includes('.')) return;
    if (amount.includes('.')) {
      const parts = amount.split('.');
      if (parts[1] && parts[1].length >= 2) return;
    }
    setAmount(amount + val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Venda Rápida</DialogTitle>
          <DialogDescription>Adicione um item avulso ao pedido.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Nome do cliente (opcional)"
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição do Item</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Impressão Colorida A4"
            />
          </div>
          <div className="flex gap-4">
            <div className="w-1/3 space-y-2">
              <Label>Qtd.</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-center font-bold h-14 text-xl"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Valor Unit. (R$)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-2xl font-bold h-14 text-right"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14"
                  onClick={() => handleNumpadPress('back')}
                >
                  <Delete className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-12 text-xl font-bold"
                onClick={() => handleNumpadPress(num.toString())}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="destructive"
              className="h-12 text-lg font-bold"
              onClick={() => handleNumpadPress('C')}
            >
              C
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onAdd} className="bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4 mr-2" />
            ADICIONAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
