import { useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "@/components/ui/masked-input";
import { Plus, Search, Edit, Trash2, User, Phone, Loader2, Users, Download, Upload } from "lucide-react";
import { useSupabaseCustomers } from "@/hooks/useSupabaseCustomers";
import { Customer } from "@/lib/types";
import { toast } from "sonner";
import { exportCustomersToExcel, generateCustomerTemplate, parseCustomersExcel } from "@/lib/excelUtils";

export default function Clientes() {
  const {
    customers,
    isLoading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    isAdding,
    isUpdating,
    isDeleting
  } = useSupabaseCustomers();

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    doc: "",
    phone: "",
    email: "",
    notes: "",
  });

  const filteredClients = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.doc.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: "", doc: "", phone: "", email: "", notes: "" });
    setEditingCustomer(null);
  };

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        doc: customer.doc,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.phone) {
      toast.error("Preencha nome e telefone");
      return;
    }

    if (editingCustomer) {
      updateCustomer({ id: editingCustomer.id, data: formData });
    } else {
      addCustomer(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (customerToDelete) {
      deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    }
  };

  // Export customers to Excel
  const handleExport = () => {
    if (customers.length === 0) {
      toast.error("Nenhum cliente para exportar");
      return;
    }
    exportCustomersToExcel(customers);
    toast.success(`${customers.length} cliente(s) exportado(s)`);
  };

  // Download template
  const handleDownloadTemplate = () => {
    generateCustomerTemplate();
    toast.success("Template baixado");
  };

  // Import customers from Excel
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedCustomers = await parseCustomersExcel(file);

      if (importedCustomers.length === 0) {
        toast.error("Nenhum cliente encontrado no arquivo");
        return;
      }

      let imported = 0;
      for (const c of importedCustomers) {
        await addCustomer({
          name: c.nome,
          phone: c.telefone,
          doc: c.cpf_cnpj || "",
          email: c.email || "",
          notes: c.observacoes || "",
        });
        imported++;
      }

      toast.success(`${imported} cliente(s) importado(s) com sucesso`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar arquivo");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Loading skeleton
  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <MainLayout title="Clientes">
      <div className="space-y-4 lg:space-y-6">
        {/* Top Banner/Alert from screenshot */}
        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-3.5 text-sm text-amber-800 dark:text-amber-400 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-800/40 p-1.5 rounded-lg">
              <Search className="h-4 w-4" />
            </div>
            <p className="font-medium">
              Seu período de teste está ativo. Aproveite todos os recursos usando o sistema.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, CPF ou contato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 text-sm bg-card/50 border-border/50 rounded-xl focus-visible:ring-primary/20 transition-all font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".xlsx,.xls"
              className="hidden"
            />

            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/50 shadow-inner">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-[11px] font-semibold bg-background hover:bg-muted border-border/40 shadow-sm rounded-lg"
                onClick={handleExport}
              >
                <Download className="h-3.5 w-3.5 text-primary/70" />
                Exportar
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-[11px] font-semibold bg-background hover:bg-muted border-border/40 shadow-sm rounded-lg"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-3.5 w-3.5 text-primary/70" />
                Template
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-[11px] font-semibold bg-background hover:bg-muted border-border/40 shadow-sm rounded-lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-primary/70" />}
                {isImporting ? "Importando..." : "Importar"}
              </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-11 px-6 font-bold shadow-lg shadow-primary/20 rounded-xl ml-auto sm:ml-0 transition-all active:scale-95" onClick={() => handleOpenDialog()}>
                  <Plus className="h-5 w-5" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle className="text-base lg:text-lg">{editingCustomer ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
                </DialogHeader>
                <form className="space-y-3 lg:space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div className="space-y-2">
                    <Label className="text-sm">Nome Completo *</Label>
                    <Input
                      placeholder="Ex: Maria da Silva"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">CPF/CNPJ</Label>
                      <MaskedInput
                        mask="document"
                        placeholder="000.000.000-00"
                        value={formData.doc}
                        onChange={(value) => setFormData({ ...formData, doc: value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Telefone *</Label>
                      <MaskedInput
                        mask="phone"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(value) => setFormData({ ...formData, phone: value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">E-mail</Label>
                    <Input
                      type="email"
                      placeholder="cliente@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Observações</Label>
                    <Input
                      placeholder="Observações sobre o cliente"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-3 lg:pt-4">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="h-10 text-sm">
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="gradient-primary text-primary-foreground h-10 text-sm"
                      disabled={isAdding || isUpdating}
                    >
                      {(isAdding || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingCustomer ? "Salvar" : "Salvar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">Nenhum cliente encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Tente ajustar sua busca" : "Clique em 'Novo' para começar"}
              </p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-card rounded-xl border border-border p-3 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{client.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span className="truncate">{client.phone || "-"}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setCustomerToDelete(client)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {(client.doc || client.email) && (
                  <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {client.doc && <span className="font-mono">{client.doc}</span>}
                    {client.email && <span className="truncate">{client.email}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-card/30 rounded-xl border border-border/50 shadow-soft overflow-hidden backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                <TableHead className="font-bold text-foreground/90">Cliente</TableHead>
                <TableHead className="font-bold text-foreground/90">CPF/CNPJ</TableHead>
                <TableHead className="font-bold text-foreground/90">Contato</TableHead>
                <TableHead className="font-bold text-foreground/90">Status</TableHead>
                <TableHead className="font-bold text-foreground/90 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Nenhum cliente encontrado</p>
                        <p className="text-sm text-muted-foreground">
                          {search ? "Tente ajustar sua busca" : "Clique em 'Novo Cliente' para começar"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/40 border-b border-border/30 transition-all duration-200 group">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.email || "-"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{client.doc || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {client.phone || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-success/10 text-success border-success/20 font-medium">
                        Ativo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleOpenDialog(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setCustomerToDelete(client)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{customerToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
