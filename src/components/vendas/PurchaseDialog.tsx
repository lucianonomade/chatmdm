import { useState } from "react";
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
import {
  ShoppingBag,
  Plus,
  Package,
  Building2,
  Phone,
  Mail,
  User,
  Check,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
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
  const { addExpense } = useStore();
  const { suppliers, addSupplier, isAdding: isAddingSupplier } = useSupabaseSuppliers();
  
  // Purchase form state
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
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
    setNewSupplierName("");
    setNewSupplierPhone("");
    setNewSupplierEmail("");
    setNewSupplierContact("");
  };

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

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);

    addExpense({
      supplierId: selectedSupplier || "",
      supplierName: supplier?.name || "Compra Avulsa",
      description: description.trim(),
      amount: parsedAmount,
      date: new Date().toISOString(),
      category: category || "Compras",
    });

    toast.success("Compra registrada com sucesso!", {
      description: `${description} - R$ ${parsedAmount.toFixed(2)}`,
    });

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Nova Compra
          </DialogTitle>
          <DialogDescription>
            Registre uma compra de materiais ou insumos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Supplier Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Fornecedor
            </Label>
            
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">Buscar</TabsTrigger>
                <TabsTrigger value="new">Novo Fornecedor</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="space-y-3 mt-3">
                <Input
                  placeholder="Buscar fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-2">
                  {/* Option for no supplier */}
                  <div
                    className={`p-3 rounded-lg cursor-pointer flex justify-between items-center border transition-colors ${
                      selectedSupplier === "" 
                        ? "bg-primary/10 border-primary" 
                        : "hover:bg-muted"
                    }`}
                    onClick={() => handleSelectSupplier("")}
                  >
                    <div>
                      <p className="font-medium text-muted-foreground">Sem fornecedor</p>
                      <p className="text-sm text-muted-foreground">Compra avulsa</p>
                    </div>
                    {selectedSupplier === "" && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  
                  {filteredSuppliers.length === 0 && searchTerm && (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhum fornecedor encontrado
                    </p>
                  )}
                  
                  {filteredSuppliers.map(supplier => (
                    <div
                      key={supplier.id}
                      className={`p-3 rounded-lg cursor-pointer flex justify-between items-center border transition-colors ${
                        selectedSupplier === supplier.id 
                          ? "bg-primary/10 border-primary" 
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleSelectSupplier(supplier.id)}
                    >
                      <div>
                        <p className="font-semibold">{supplier.name}</p>
                        {supplier.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </p>
                        )}
                      </div>
                      {selectedSupplier === supplier.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="new" className="space-y-4 mt-3">
                <div className="space-y-2">
                  <Label>Nome do Fornecedor *</Label>
                  <Input
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Ex: Distribuidora ABC"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contato</Label>
                    <Input
                      value={newSupplierContact}
                      onChange={(e) => setNewSupplierContact(e.target.value)}
                      placeholder="Nome do contato"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    placeholder="email@fornecedor.com"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
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
          <div className="space-y-4 border-t pt-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Detalhes da Compra
            </Label>
            
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Papel couche 115g - 500 folhas"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitPurchase}
            disabled={!description.trim() || !amount}
            className="bg-primary"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Registrar Compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
