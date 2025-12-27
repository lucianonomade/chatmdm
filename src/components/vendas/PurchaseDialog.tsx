import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ShoppingBag,
  Plus,
  Package,
  Building2,
  Phone,
  Mail,
  User,
  Check,
  AlertCircle,
  CreditCard,
  CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { useSupabasePendingInstallments } from "@/hooks/useSupabasePendingInstallments";
import { toast } from "sonner";

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXPENSE_CATEGORIES = [
  "Material",
  "Equipamento",
  "Insumos",
  "Embalagem",
  "Transporte",
  "Manutenção",
  "Outros",
];

export function PurchaseDialog({ open, onOpenChange }: PurchaseDialogProps) {
  const { suppliers, addSupplier, isAdding: isAddingSupplier } = useSupabaseSuppliers();
  const { addExpense, isAdding: isAddingExpense } = useSupabaseExpenses();
  const { addInstallments, isAdding: isAddingInstallments } = useSupabasePendingInstallments();
  
  // Purchase form state
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Payment/Installment state
  const [enableInstallments, setEnableInstallments] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("2");
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [installmentDates, setInstallmentDates] = useState<Date[]>(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      dates.push(date);
    }
    return dates;
  });
  
  // New supplier form state
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");

  const resetForm = () => {
    setSelectedSupplier("");
    setDescription("");
    setAmount("");
    setCategory("");
    setNotes("");
    setSearchTerm("");
    setEnableInstallments(false);
    setPaidAmount("");
    setInstallmentsCount("2");
    setEntryDate(new Date());
    const dates: Date[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      dates.push(date);
    }
    setInstallmentDates(dates);
    setNewSupplierName("");
    setNewSupplierPhone("");
    setNewSupplierEmail("");
    setNewSupplierContact("");
  };

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPaidAmount = parseFloat(paidAmount) || 0;
  const remainingAmount = parsedAmount - parsedPaidAmount;
  const installments = parseInt(installmentsCount) || 2;
  const installmentValue = remainingAmount > 0 ? remainingAmount / installments : 0;

  const handleSelectSupplier = (supplierId: string) => {
    setSelectedSupplier(supplierId);
  };

  const handleAddNewSupplier = () => {
    if (!newSupplierName.trim()) {
      toast.error("Digite o nome do fornecedor");
      return;
    }

    addSupplier({
      name: newSupplierName.trim(),
      phone: newSupplierPhone.trim(),
      email: newSupplierEmail.trim() || undefined,
      contact: newSupplierContact.trim(),
    });

    // Reset new supplier fields
    setNewSupplierName("");
    setNewSupplierPhone("");
    setNewSupplierEmail("");
    setNewSupplierContact("");
  };

  const handleSubmitPurchase = () => {
    if (!description.trim()) {
      toast.error("Digite a descrição da compra");
      return;
    }

    if (parsedAmount <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    if (enableInstallments && parsedPaidAmount > parsedAmount) {
      toast.error("Valor pago não pode ser maior que o total");
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    const supplierName = supplier?.name || "Compra Avulsa";

    // If paying something now, register that as expense
    if (!enableInstallments || parsedPaidAmount > 0) {
      const expenseAmount = enableInstallments ? parsedPaidAmount : parsedAmount;
      
      if (expenseAmount > 0) {
        addExpense({
          supplierId: selectedSupplier || "",
          supplierName: supplierName,
          description: enableInstallments 
            ? `${description.trim()} (Entrada)` 
            : description.trim(),
          amount: expenseAmount,
          date: entryDate.toISOString(),
          category: category || "Compras",
        });
      }
    }

    // If there are remaining installments to create
    if (enableInstallments && remainingAmount > 0) {
      addInstallments({
        supplierId: selectedSupplier || undefined,
        supplierName: supplierName,
        description: description.trim(),
        totalAmount: parsedAmount,
        installments: installments,
        amountPerInstallment: installmentValue,
        installmentDates: installmentDates.slice(0, installments),
        category: category || "Compras",
        notes: notes.trim() || undefined,
      });

      toast.success("Compra registrada com parcelas!", {
        description: `${description} - ${installments}x de R$ ${installmentValue.toFixed(2)}`,
      });
    } else {
      toast.success("Compra registrada com sucesso!", {
        description: `${description} - R$ ${parsedAmount.toFixed(2)}`,
      });
    }

    resetForm();
    onOpenChange(false);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone && s.phone.includes(searchTerm))
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Nova Compra
          </DialogTitle>
          <DialogDescription className="text-sm">
            Registre uma compra de materiais ou insumos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Fornecedor
            </Label>
            
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="list" className="text-xs">Buscar</TabsTrigger>
                <TabsTrigger value="new" className="text-xs">Novo Fornecedor</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="space-y-2 mt-2">
                <Input
                  placeholder="Buscar fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9"
                />
                <div className="max-h-[150px] overflow-y-auto space-y-1 border rounded-lg p-2">
                  {/* Option for no supplier */}
                  <div
                    className={`p-2 rounded-lg cursor-pointer flex justify-between items-center border transition-colors ${
                      selectedSupplier === "" 
                        ? "bg-primary/10 border-primary" 
                        : "hover:bg-muted"
                    }`}
                    onClick={() => handleSelectSupplier("")}
                  >
                    <div>
                      <p className="font-medium text-muted-foreground text-sm">Sem fornecedor</p>
                      <p className="text-xs text-muted-foreground">Compra avulsa</p>
                    </div>
                    {selectedSupplier === "" && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  
                  {filteredSuppliers.length === 0 && searchTerm && (
                    <p className="text-center text-muted-foreground py-2 text-sm">
                      Nenhum fornecedor encontrado
                    </p>
                  )}
                  
                  {filteredSuppliers.map(supplier => (
                      <div
                        key={supplier.id}
                        className={`p-2 rounded-lg cursor-pointer flex justify-between items-center border transition-colors ${
                          selectedSupplier === supplier.id 
                            ? "bg-primary/10 border-primary" 
                            : "hover:bg-muted"
                        }`}
                        onClick={() => handleSelectSupplier(supplier.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{supplier.name}</p>
                          {supplier.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{supplier.phone}</span>
                            </p>
                          )}
                        </div>
                        {selectedSupplier === supplier.id && (
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    ))}
                </div>
              </TabsContent>
              
              <TabsContent value="new" className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do Fornecedor *</Label>
                  <Input
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Ex: Distribuidora ABC"
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone</Label>
                    <Input
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Contato</Label>
                    <Input
                      value={newSupplierContact}
                      onChange={(e) => setNewSupplierContact(e.target.value)}
                      placeholder="Nome do contato"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">E-mail</Label>
                  <Input
                    type="email"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    placeholder="email@fornecedor.com"
                    className="h-9"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full h-9"
                  onClick={handleAddNewSupplier}
                  disabled={isAddingSupplier || !newSupplierName.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isAddingSupplier ? "Adicionando..." : "Adicionar Fornecedor"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {/* Purchase Details */}
          <div className="space-y-3 border-t pt-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Detalhes da Compra
            </Label>
            
            <div className="space-y-1">
              <Label className="text-xs">Descrição *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Papel couche 115g - 500 folhas"
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Installment Section */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Parcelar Pagamento
                </Label>
                <Switch
                  checked={enableInstallments}
                  onCheckedChange={setEnableInstallments}
                />
              </div>

              {enableInstallments && (
                <div className="space-y-3 bg-muted/50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Pago Agora (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={parsedAmount}
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="0,00"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nº de Parcelas</Label>
                      <Select value={installmentsCount} onValueChange={setInstallmentsCount}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Date pickers */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Data da Entrada</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal",
                              !entryDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {entryDate ? format(entryDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={entryDate}
                            onSelect={(date) => date && setEntryDate(date)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* Individual installment date pickers */}
                    {Array.from({ length: installments }).map((_, index) => (
                      <div key={index} className="space-y-1">
                        <Label className="text-xs">{index + 1}ª Parcela</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-9 justify-start text-left font-normal",
                                !installmentDates[index] && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {installmentDates[index] 
                                ? format(installmentDates[index], "dd/MM/yyyy", { locale: ptBR }) 
                                : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={installmentDates[index]}
                              onSelect={(date) => {
                                if (date) {
                                  const newDates = [...installmentDates];
                                  newDates[index] = date;
                                  setInstallmentDates(newDates);
                                }
                              }}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    ))}
                  </div>

                  {remainingAmount > 0 && (
                    <div className="bg-background rounded-lg p-2 border">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor restante:</span>
                        <span className="font-semibold text-destructive">R$ {remainingAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Parcelas:</span>
                        <span className="font-semibold">{installments}x de R$ {installmentValue.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-4 py-3 flex-shrink-0 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitPurchase}
            disabled={!description.trim() || !amount}
            className="bg-primary h-9"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
