import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
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
import {
  Search,
  Truck,
  DollarSign,
  AlertCircle,
  ArrowDownCircle,
  Printer,
  FileText,
  Lock,
  Percent,
  User,
  ShoppingCart,
  Eye,
  Calendar,
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useSupabaseFixedExpenses, FixedExpense } from "@/hooks/useSupabaseFixedExpenses";
import { useAuth } from "@/hooks/useAuth";
import { useSyncedCompanySettings } from "@/hooks/useSyncedCompanySettings";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceOrder } from "@/lib/types";

interface SellerCommission {
  sellerId: string;
  sellerName: string;
  totalSales: number;
  commissionAmount: number;
  ordersCount: number;
  orders: ServiceOrder[];
}

export default function ContasPagar() {
  const { suppliers, isLoading: suppliersLoading } = useSupabaseSuppliers();
  const { expenses, supplierBalances, getSupplierBalance, isLoading: expensesLoading } = useSupabaseExpenses();
  const { orders, isLoading: ordersLoading } = useSupabaseOrders();
  const { fixedExpenses, totalFixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense, isLoading: fixedLoading } = useSupabaseFixedExpenses();
  const { authUser } = useAuth();
  const { settings: companySettings } = useSyncedCompanySettings();
  
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [selectedSeller, setSelectedSeller] = useState<SellerCommission | null>(null);
  const [sellerDetailsOpen, setSellerDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  
  // Fixed expense form state
  const [fixedExpenseOpen, setFixedExpenseOpen] = useState(false);
  const [editingFixedExpense, setEditingFixedExpense] = useState<FixedExpense | null>(null);
  const [fixedExpenseName, setFixedExpenseName] = useState("");
  const [fixedExpenseAmount, setFixedExpenseAmount] = useState("");
  const [fixedExpenseDueDay, setFixedExpenseDueDay] = useState("1");
  const [fixedExpenseCategory, setFixedExpenseCategory] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const isLoading = suppliersLoading || expensesLoading || ordersLoading || fixedLoading;

  const usesCommission = companySettings?.usesCommission || false;
  const commissionPercentage = companySettings?.commissionPercentage || 0;

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

  // Calculate seller commissions for selected month
  const sellerCommissions = useMemo((): SellerCommission[] => {
    if (!usesCommission || !orders) return [];
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const commissionRate = commissionPercentage / 100;
    
    const commissionMap = new Map<string, SellerCommission>();
    
    orders.forEach(order => {
      const orderDate = parseISO(order.createdAt);
      const isInMonth = isWithinInterval(orderDate, { start: monthStart, end: monthEnd });
      const hasPaidAmount = (order.amountPaid || 0) > 0;
      
      if (isInMonth && hasPaidAmount && order.sellerId) {
        const existing = commissionMap.get(order.sellerId) || {
          sellerId: order.sellerId,
          sellerName: order.sellerName || 'Desconhecido',
          totalSales: 0,
          commissionAmount: 0,
          ordersCount: 0,
          orders: [],
        };
        
        const amountPaid = order.amountPaid || 0;
        existing.totalSales += amountPaid;
        existing.commissionAmount += amountPaid * commissionRate;
        existing.ordersCount += 1;
        existing.orders.push(order);
        
        commissionMap.set(order.sellerId, existing);
      }
    });
    
    return Array.from(commissionMap.values()).sort((a, b) => b.commissionAmount - a.commissionAmount);
  }, [orders, selectedMonth, commissionPercentage, usesCommission]);

  const totalCommissionPayable = sellerCommissions.reduce((sum, s) => sum + s.commissionAmount, 0);

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

  const handleViewSellerDetails = (seller: SellerCommission) => {
    setSelectedSeller(seller);
    setSellerDetailsOpen(true);
  };

  const handleViewOrderDetails = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };

  // Fixed Expense Handlers
  const resetFixedExpenseForm = () => {
    setFixedExpenseName("");
    setFixedExpenseAmount("");
    setFixedExpenseDueDay("1");
    setFixedExpenseCategory("");
    setEditingFixedExpense(null);
    setFixedExpenseOpen(false);
  };

  const handleOpenFixedExpenseForm = (expense?: FixedExpense) => {
    if (expense) {
      setEditingFixedExpense(expense);
      setFixedExpenseName(expense.name);
      setFixedExpenseAmount(expense.amount.toString());
      setFixedExpenseDueDay(expense.dueDay.toString());
      setFixedExpenseCategory(expense.category);
    } else {
      resetFixedExpenseForm();
    }
    setFixedExpenseOpen(true);
  };

  const handleSaveFixedExpense = () => {
    const amount = parseFloat(fixedExpenseAmount);
    const dueDay = parseInt(fixedExpenseDueDay);

    if (!fixedExpenseName.trim()) {
      return;
    }
    if (!amount || amount <= 0) {
      return;
    }
    if (!dueDay || dueDay < 1 || dueDay > 31) {
      return;
    }

    if (editingFixedExpense) {
      updateFixedExpense({
        id: editingFixedExpense.id,
        name: fixedExpenseName,
        amount,
        dueDay,
        category: fixedExpenseCategory || 'Geral',
        active: editingFixedExpense.active,
      });
    } else {
      addFixedExpense({
        name: fixedExpenseName,
        amount,
        dueDay,
        category: fixedExpenseCategory || 'Geral',
        active: true,
      });
    }
    resetFixedExpenseForm();
  };

  const handleDeleteFixedExpense = () => {
    if (expenseToDelete) {
      deleteFixedExpense(expenseToDelete);
      setExpenseToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleToggleFixedExpense = (id: string, active: boolean) => {
    updateFixedExpense({ id, active });
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
          
          <h3>Fornecedores</h3>
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
          <p class="total">Total Fornecedores: R$ ${totalPayable.toFixed(2)}</p>
          
          ${usesCommission ? `
            <h3 style="margin-top: 40px;">Comissões de Vendedores - ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: ptBR })}</h3>
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Vendas</th>
                  <th>Total Vendido</th>
                  <th>Comissão (${commissionPercentage}%)</th>
                </tr>
              </thead>
              <tbody>
                ${sellerCommissions.map(s => `
                  <tr>
                    <td>${s.sellerName}</td>
                    <td>${s.ordersCount}</td>
                    <td>R$ ${s.totalSales.toFixed(2)}</td>
                    <td style="color: #16a34a; font-weight: bold;">R$ ${s.commissionAmount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <p class="total">Total Comissões: R$ ${totalCommissionPayable.toFixed(2)}</p>
          ` : ''}
          
          <p class="total" style="margin-top: 40px; font-size: 20px;">
            TOTAL GERAL A PAGAR: R$ ${(totalPayable + totalCommissionPayable).toFixed(2)}
          </p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-warning">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total a Pagar</p>
                  <p className="text-2xl font-bold text-warning">
                    R$ {(totalPayable + totalCommissionPayable).toFixed(2)}
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
                  <p className="text-sm text-muted-foreground">Fornecedores</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {totalPayable.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {usesCommission && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Percent className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comissões</p>
                    <p className="text-2xl font-bold text-green-500">
                      R$ {totalCommissionPayable.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <ArrowDownCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Compras</p>
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

        {/* Tabs */}
        <Tabs defaultValue="despesas">
          <TabsList className="flex-wrap">
            <TabsTrigger value="despesas" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Todas Despesas
            </TabsTrigger>
            <TabsTrigger value="gastos-fixos" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Gastos Fixos
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="gap-2">
              <Truck className="h-4 w-4" />
              Por Fornecedor
            </TabsTrigger>
            {usesCommission && (
              <TabsTrigger value="comissoes" className="gap-2">
                <Percent className="h-4 w-4" />
                Comissões
              </TabsTrigger>
            )}
          </TabsList>

          {/* All Expenses Tab */}
          <TabsContent value="despesas">
            <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Descrição</TableHead>
                    <TableHead className="font-semibold">Fornecedor</TableHead>
                    <TableHead className="font-semibold">Categoria</TableHead>
                    <TableHead className="font-semibold text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Nenhuma despesa registrada</p>
                            <p className="text-sm text-muted-foreground">
                              Registre compras pelo PDV para vê-las aqui
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses
                      .filter(e => 
                        e.description.toLowerCase().includes(search.toLowerCase()) ||
                        e.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
                        e.category?.toLowerCase().includes(search.toLowerCase())
                      )
                      .map((expense) => (
                        <TableRow 
                          key={expense.id}
                          className="hover:bg-hover/10 transition-all"
                        >
                          <TableCell className="text-muted-foreground">
                            {expense.date ? format(parseISO(expense.date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {expense.supplierId ? (
                                <>
                                  <Truck className="h-4 w-4 text-primary" />
                                  <span>{expense.supplierName}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Compra Avulsa</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category || "Outros"}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-warning">
                            R$ {expense.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
              {expenses.length > 0 && (
                <div className="p-4 border-t bg-muted/30 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total de {expenses.length} despesas
                  </span>
                  <span className="font-bold text-lg">
                    Total: R$ {expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Fixed Expenses Tab */}
          <TabsContent value="gastos-fixos">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Gastos Fixos Mensais</h3>
                  <p className="text-sm text-muted-foreground">
                    Total mensal: R$ {totalFixedExpenses.toFixed(2)}
                  </p>
                </div>
                <Button onClick={() => handleOpenFixedExpenseForm()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Gasto Fixo
                </Button>
              </div>
              
              <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Nome</TableHead>
                      <TableHead className="font-semibold">Categoria</TableHead>
                      <TableHead className="font-semibold text-center">Dia Venc.</TableHead>
                      <TableHead className="font-semibold text-right">Valor</TableHead>
                      <TableHead className="font-semibold text-center">Ativo</TableHead>
                      <TableHead className="font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton />
                    ) : fixedExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                              <CalendarDays className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Nenhum gasto fixo cadastrado</p>
                              <p className="text-sm text-muted-foreground">
                                Cadastre aluguel, contas fixas e outras despesas mensais
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      fixedExpenses.map((expense) => (
                        <TableRow 
                          key={expense.id}
                          className={`hover:bg-hover/10 transition-all ${!expense.active ? 'opacity-50' : ''}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <CalendarDays className="h-5 w-5 text-primary" />
                              </div>
                              <span className="font-medium">{expense.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">Dia {expense.dueDay}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-warning">
                            R$ {expense.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={expense.active}
                              onCheckedChange={(checked) => handleToggleFixedExpense(expense.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenFixedExpenseForm(expense)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => {
                                  setExpenseToDelete(expense.id);
                                  setDeleteConfirmOpen(true);
                                }}
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
                {fixedExpenses.length > 0 && (
                  <div className="p-4 border-t bg-muted/30 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {fixedExpenses.filter(e => e.active).length} gastos ativos de {fixedExpenses.length} total
                    </span>
                    <span className="font-bold text-lg">
                      Total Ativo: R$ {totalFixedExpenses.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Fornecedores Tab */}
          <TabsContent value="fornecedores">
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
          </TabsContent>

          {/* Comissões Tab */}
          {usesCommission && (
            <TabsContent value="comissoes">
              <div className="space-y-4">
                {/* Month Filter */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Período:</span>
                  </div>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-48"
                  />
                </div>

                <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Vendedor</TableHead>
                        <TableHead className="font-semibold text-center">Vendas</TableHead>
                        <TableHead className="font-semibold text-right">Total Vendido</TableHead>
                        <TableHead className="font-semibold text-right">Comissão ({commissionPercentage}%)</TableHead>
                        <TableHead className="font-semibold text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableSkeleton />
                      ) : sellerCommissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <div className="flex flex-col items-center gap-3">
                              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                                <Percent className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">Nenhuma comissão a pagar</p>
                                <p className="text-sm text-muted-foreground">
                                  Não há vendas com comissão no período selecionado.
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sellerCommissions.map((seller) => (
                          <TableRow 
                            key={seller.sellerId} 
                            className="hover:bg-hover/10 transition-all cursor-pointer"
                            onClick={() => handleViewSellerDetails(seller)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                  <User className="h-5 w-5 text-green-500" />
                                </div>
                                <span className="font-medium">{seller.sellerName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{seller.ordersCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {seller.totalSales.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-bold text-green-500">
                                R$ {seller.commissionAmount.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewSellerDetails(seller);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Vendas
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

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

        {/* Seller Commission Details Dialog */}
        <Dialog open={sellerDetailsOpen} onOpenChange={setSellerDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-500" />
                Comissões - {selectedSeller?.sellerName}
              </DialogTitle>
            </DialogHeader>

            {selectedSeller && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground text-xs">Total em Vendas</Label>
                    <p className="font-bold text-lg">
                      R$ {selectedSeller.totalSales.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Número de Vendas</Label>
                    <p className="font-bold text-lg">{selectedSeller.ordersCount}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Comissão a Pagar ({commissionPercentage}%)</Label>
                    <p className="font-bold text-lg text-green-500">
                      R$ {selectedSeller.commissionAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Orders List */}
                <div>
                  <h4 className="font-semibold mb-3">Vendas do Período</h4>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {selectedSeller.orders.map((order) => {
                      const commission = (order.amountPaid || 0) * (commissionPercentage / 100);
                      return (
                        <div 
                          key={order.id} 
                          className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleViewOrderDetails(order)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <ShoppingCart className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">Venda #{order.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(parseISO(order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                {' • '}{order.customerName}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Valor: R$ {(order.amountPaid || 0).toFixed(2)}
                            </p>
                            <p className="font-bold text-green-500">
                              Comissão: R$ {commission.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSellerDetailsOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Details Dialog */}
        <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Detalhes da Venda #{selectedOrder?.id}
              </DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground text-xs">Cliente</Label>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Data</Label>
                    <p className="font-medium">
                      {format(parseISO(selectedOrder.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Vendedor</Label>
                    <p className="font-medium">{selectedOrder.sellerName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <Badge variant={selectedOrder.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                      {selectedOrder.paymentStatus === 'paid' ? 'Pago' : 
                       selectedOrder.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}
                    </Badge>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-semibold mb-3">Itens</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qtd: {item.quantity} x R$ {item.price.toFixed(2)}
                          </p>
                        </div>
                        <p className="font-medium">R$ {item.total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total da Venda</span>
                    <span className="font-medium">R$ {selectedOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Pago</span>
                    <span className="font-medium">R$ {(selectedOrder.amountPaid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-green-500">
                    <span>Comissão ({commissionPercentage}%)</span>
                    <span>R$ {((selectedOrder.amountPaid || 0) * (commissionPercentage / 100)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOrderDetailsOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fixed Expense Form Dialog */}
        <Dialog open={fixedExpenseOpen} onOpenChange={setFixedExpenseOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingFixedExpense ? "Editar Gasto Fixo" : "Novo Gasto Fixo"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fixedExpenseName">Nome *</Label>
                <Input
                  id="fixedExpenseName"
                  placeholder="Ex: Aluguel, Internet, Luz..."
                  value={fixedExpenseName}
                  onChange={(e) => setFixedExpenseName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fixedExpenseAmount">Valor (R$) *</Label>
                  <Input
                    id="fixedExpenseAmount"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={fixedExpenseAmount}
                    onChange={(e) => setFixedExpenseAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fixedExpenseDueDay">Dia Vencimento *</Label>
                  <Input
                    id="fixedExpenseDueDay"
                    type="number"
                    min="1"
                    max="31"
                    value={fixedExpenseDueDay}
                    onChange={(e) => setFixedExpenseDueDay(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixedExpenseCategory">Categoria</Label>
                <Input
                  id="fixedExpenseCategory"
                  placeholder="Ex: Aluguel, Serviços, Utilidades..."
                  value={fixedExpenseCategory}
                  onChange={(e) => setFixedExpenseCategory(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetFixedExpenseForm}>
                Cancelar
              </Button>
              <Button onClick={handleSaveFixedExpense}>
                {editingFixedExpense ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este gasto fixo? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteFixedExpense} className="bg-destructive hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
