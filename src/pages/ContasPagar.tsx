import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Truck,
  DollarSign,
  AlertCircle,
  ArrowDownCircle,
  Printer,
  FileText,
  Lock,
} from "lucide-react";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { useAuth } from "@/hooks/useAuth";
import { useSyncedCompanySettings } from "@/hooks/useSyncedCompanySettings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ContasPagar() {
  const { suppliers, isLoading: suppliersLoading } = useSupabaseSuppliers();
  const { expenses, supplierBalances, getSupplierBalance, isLoading: expensesLoading } = useSupabaseExpenses();
  const { authUser } = useAuth();
  const { settings: companySettings } = useSyncedCompanySettings();
  
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isLoading = suppliersLoading || expensesLoading;

  // Access Control: Sellers cannot access
  if (authUser?.role === 'seller') {
    return (
      <MainLayout title="Acesso Negado">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="bg-destructive/10 p-6 rounded-full mb-4">
            <Lock className="w-12 h-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Seu perfil de vendedor não tem permissão para acessar as contas a pagar.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => window.location.href = "/"}>
            Voltar ao Início
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Calculate supplier balances with supplier info
  const suppliersWithBalance = suppliers.map(supplier => ({
    ...supplier,
    balance: getSupplierBalance(supplier.id),
    expenseCount: expenses.filter(e => e.supplierId === supplier.id).length,
  })).filter(s => s.balance > 0);

  const filteredSuppliers = suppliersWithBalance.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact && s.contact.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPayable = suppliersWithBalance.reduce((sum, s) => sum + s.balance, 0);

  const selectedSupplierData = selectedSupplier 
    ? suppliers.find(s => s.id === selectedSupplier) 
    : null;
  
  const selectedSupplierExpenses = selectedSupplier
    ? expenses.filter(e => e.supplierId === selectedSupplier)
    : [];

  const handleViewDetails = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    setDetailsOpen(true);
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Contas a Pagar - ${companySettings?.name || 'Empresa'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 10px; }
            h2 { text-align: center; color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; }
            .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>${companySettings?.name || 'Empresa'}</h1>
          <h2>Relatório de Contas a Pagar</h2>
          <p>Data: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          
          <table>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Contato</th>
                <th>Telefone</th>
                <th>Compras</th>
                <th>Saldo Devedor</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSuppliers.map(s => `
                <tr>
                  <td>${s.name}</td>
                  <td>${s.contact || '-'}</td>
                  <td>${s.phone || '-'}</td>
                  <td>${s.expenseCount}</td>
                  <td style="color: #dc2626; font-weight: bold;">R$ ${s.balance.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <p class="total">Total a Pagar: R$ ${totalPayable.toFixed(2)}</p>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Loading skeleton
  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <MainLayout title="Contas a Pagar">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-warning">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total a Pagar</p>
                  <p className="text-2xl font-bold text-warning">
                    R$ {totalPayable.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedores com Saldo</p>
                  <p className="text-2xl font-bold text-foreground">
                    {suppliersWithBalance.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <ArrowDownCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Compras</p>
                  <p className="text-2xl font-bold text-foreground">
                    {expenses.filter(e => e.supplierId).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Relatório
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Fornecedor</TableHead>
                <TableHead className="font-semibold">Contato</TableHead>
                <TableHead className="font-semibold">Telefone</TableHead>
                <TableHead className="font-semibold">Compras</TableHead>
                <TableHead className="font-semibold">Saldo Devedor</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                        <DollarSign className="h-8 w-8 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Nenhuma conta a pagar</p>
                        <p className="text-sm text-muted-foreground">
                          Todos os fornecedores estão em dia!
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((fornecedor) => (
                  <TableRow 
                    key={fornecedor.id} 
                    className="hover:bg-hover/10 transition-all cursor-pointer"
                    onClick={() => handleViewDetails(fornecedor.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                          <Truck className="h-5 w-5 text-warning" />
                        </div>
                        <span className="font-medium">{fornecedor.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fornecedor.contact || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{fornecedor.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{fornecedor.expenseCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-warning font-bold">
                        <AlertCircle className="h-4 w-4" />
                        R$ {fornecedor.balance.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(fornecedor.id);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Supplier Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Detalhes - {selectedSupplierData?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Supplier Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-muted-foreground text-xs">Contato</Label>
                  <p className="font-medium">{selectedSupplierData?.contact || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Telefone</Label>
                  <p className="font-medium">{selectedSupplierData?.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium">{selectedSupplierData?.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Saldo Devedor</Label>
                  <p className="font-bold text-warning text-lg">
                    R$ {selectedSupplier ? getSupplierBalance(selectedSupplier).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              {/* Expenses List */}
              <div>
                <h4 className="font-semibold mb-3">Histórico de Compras</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {selectedSupplierExpenses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhuma compra registrada
                    </p>
                  ) : (
                    selectedSupplierExpenses.map((expense) => (
                      <div 
                        key={expense.id} 
                        className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(expense.date), "dd/MM/yyyy", { locale: ptBR })}
                            {expense.category && ` • ${expense.category}`}
                          </p>
                        </div>
                        <p className="font-bold text-destructive">
                          R$ {expense.amount.toFixed(2)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
