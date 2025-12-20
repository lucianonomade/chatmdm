import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Receipt,
  Trash2,
  Lock,
  Eye,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { ServiceOrder, Expense } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TableSkeleton, EmptyState } from "@/components/ui/loading-skeleton";
import { OrderDetailsDialog } from "@/components/ordens/OrderDetailsDialog";
import { ExpenseDetailsDialog } from "@/components/caixa/ExpenseDetailsDialog";

export default function Financeiro() {
  const { orders, updateOrder } = useSupabaseOrders();
  const { expenses, addExpense, suppliers, clearAllData } = useStore();
  const { authUser, user } = useAuth();
  const [isEntradaOpen, setIsEntradaOpen] = useState(false);
  const [isSaidaOpen, setIsSaidaOpen] = useState(false);
  const [isZerarDialogOpen, setIsZerarDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [expenseData, setExpenseData] = useState({
    supplierId: "",
    description: "",
    amount: "",
    category: "",
  });
  
  // Order details dialog state
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  
  // Expense details dialog state
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  // List dialogs state
  const [entradasListOpen, setEntradasListOpen] = useState(false);
  const [saidasListOpen, setSaidasListOpen] = useState(false);
  const [aReceberListOpen, setAReceberListOpen] = useState(false);

  const handleOpenOrder = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setOrderDialogOpen(true);
  };

  const handleOpenExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseDialogOpen(true);
  };

  // Check if user is admin or manager
  const isAdminOrManager = authUser?.role === 'admin' || authUser?.role === 'manager';

  // Calculate totals from real data
  const totalEntradas = orders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
  const totalSaidas = expenses.reduce((sum, e) => sum + e.amount, 0);
  const saldo = totalEntradas - totalSaidas;
  
  // Pending payments
  const pendingOrders = orders.filter(o => o.paymentStatus !== 'paid' && o.remainingAmount && o.remainingAmount > 0);
  const totalPendente = pendingOrders.reduce((sum, o) => sum + (o.remainingAmount || o.total), 0);

  // Recent transactions (combine orders and expenses)
  const transactions = [
    ...orders.map(o => ({
      id: o.id,
      orderId: o.id,
      descricao: `Venda #${o.id}`,
      tipo: 'entrada' as const,
      valor: o.amountPaid || o.total,
      data: o.createdAt,
      cliente: o.customerName,
    })),
    ...expenses.map(e => ({
      id: e.id,
      orderId: null as string | null,
      descricao: e.description,
      tipo: 'saida' as const,
      valor: e.amount,
      data: e.date,
      cliente: e.supplierName,
    }))
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 10);

  const handleDarBaixa = (order: ServiceOrder) => {
    updateOrder({
      id: order.id,
      data: {
        paymentStatus: 'paid',
        amountPaid: order.total,
        remainingAmount: 0,
      }
    });
    toast.success("Pagamento registrado com sucesso!");
  };

  const handleAddExpense = () => {
    if (!expenseData.description || !expenseData.amount) {
      toast.error("Preencha descrição e valor");
      return;
    }

    const supplier = suppliers.find(s => s.id === expenseData.supplierId);
    
    addExpense({
      supplierId: expenseData.supplierId || '',
      supplierName: supplier?.name || 'Despesa Avulsa',
      description: expenseData.description,
      amount: parseFloat(expenseData.amount),
      date: new Date().toISOString(),
      category: expenseData.category || 'Outros',
    });

    toast.success("Saída registrada com sucesso!");
    setIsSaidaOpen(false);
    setExpenseData({ supplierId: "", description: "", amount: "", category: "" });
  };

  const handleZerar = async () => {
    if (!adminPassword) {
      toast.error("Digite a senha do administrador");
      return;
    }

    setIsVerifying(true);
    try {
      // Try to sign in with the current admin user's email and provided password
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: adminPassword,
      });

      if (error) {
        toast.error("Senha incorreta");
        setIsVerifying(false);
        return;
      }

      // Password is correct, proceed with clearing
      toast.message("Limpando dados locais…");
      clearAllData();
      setIsZerarDialogOpen(false);
      setAdminPassword("");
    } catch (error) {
      toast.error("Erro ao verificar senha");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <MainLayout title="Financeiro">
      <div className="space-y-6">
        {/* Stats Cards - Redesigned */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Saldo Card - Highlighted */}
          <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Saldo Atual</span>
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>
              R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-muted-foreground">Atualizado agora</span>
          </div>

          {/* Entradas Card */}
          <div 
            className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-md transition-shadow cursor-pointer hover:border-success/50"
            onClick={() => setEntradasListOpen(true)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Entradas</span>
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-success">
              + R$ {totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-muted-foreground">{orders.length} vendas</span>
          </div>

          {/* Saídas Card */}
          <div 
            className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-md transition-shadow cursor-pointer hover:border-destructive/50"
            onClick={() => setSaidasListOpen(true)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Saídas</span>
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-destructive">
              - R$ {totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-muted-foreground">{expenses.length} despesas</span>
          </div>

          {/* Pendente Card */}
          <div 
            className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-md transition-shadow cursor-pointer hover:border-warning/50"
            onClick={() => setAReceberListOpen(true)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">A Receber</span>
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-warning">
              R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-muted-foreground">{pendingOrders.length} pendentes</span>
          </div>
        </div>

        {/* Tabs - Redesigned */}
        <Tabs defaultValue="movimentacoes" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <TabsList className="w-full sm:w-auto bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="movimentacoes" className="flex-1 sm:flex-none data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-4">
                <Receipt className="h-4 w-4 mr-2 hidden sm:inline" />
                Movimentações
              </TabsTrigger>
              <TabsTrigger value="areceber" className="flex-1 sm:flex-none data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-4">
                <ArrowUpRight className="h-4 w-4 mr-2 hidden sm:inline text-success" />
                A Receber
              </TabsTrigger>
              <TabsTrigger value="apagar" className="flex-1 sm:flex-none data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-4">
                <ArrowDownRight className="h-4 w-4 mr-2 hidden sm:inline text-destructive" />
                A Pagar
              </TabsTrigger>
            </TabsList>
            
            {/* Action Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              {isAdminOrManager && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => setIsZerarDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Zerar</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none border-success/30 text-success hover:bg-success/10"
                onClick={() => setIsEntradaOpen(true)}
              >
                <ArrowUpRight className="h-4 w-4 mr-1.5" />
                Entrada
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => setIsSaidaOpen(true)}
              >
                <ArrowDownRight className="h-4 w-4 mr-1.5" />
                Saída
              </Button>
            </div>
          </div>

          <TabsContent value="movimentacoes" className="mt-4">
            <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-border">
                {transactions.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      icon={Receipt}
                      title="Nenhuma movimentação"
                      description="As movimentações financeiras aparecerão aqui"
                    />
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div 
                      key={tx.id + tx.tipo} 
                      className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        if (tx.orderId) {
                          const order = orders.find(o => o.id === tx.orderId);
                          if (order) handleOpenOrder(order);
                        } else if (tx.tipo === 'saida') {
                          const expense = expenses.find(e => e.id === tx.id);
                          if (expense) handleOpenExpense(expense);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{tx.descricao}</p>
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">{tx.cliente}</p>
                        </div>
                        <Badge className={`shrink-0 ${
                          tx.tipo === "entrada"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}>
                          {tx.tipo === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.data).toLocaleDateString("pt-BR")}
                        </span>
                        <span className={`font-bold ${
                          tx.tipo === "entrada" ? "text-success" : "text-destructive"
                        }`}>
                          {tx.tipo === "entrada" ? "+" : "-"} R$ {tx.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Data</TableHead>
                      <TableHead className="font-semibold">Descrição</TableHead>
                      <TableHead className="font-semibold">Cliente/Fornecedor</TableHead>
                      <TableHead className="font-semibold">Tipo</TableHead>
                      <TableHead className="font-semibold text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState
                            icon={Receipt}
                            title="Nenhuma movimentação"
                            description="As movimentações financeiras aparecerão aqui"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow 
                          key={tx.id + tx.tipo} 
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => {
                            if (tx.orderId) {
                              const order = orders.find(o => o.id === tx.orderId);
                              if (order) handleOpenOrder(order);
                            } else if (tx.tipo === 'saida') {
                              const expense = expenses.find(e => e.id === tx.id);
                              if (expense) handleOpenExpense(expense);
                            }
                          }}
                        >
                          <TableCell className="text-muted-foreground">
                            {new Date(tx.data).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {tx.descricao}
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{tx.cliente}</TableCell>
                          <TableCell>
                            <Badge className={
                              tx.tipo === "entrada"
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }>
                              {tx.tipo === "entrada" ? "Entrada" : "Saída"}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            tx.tipo === "entrada" ? "text-success" : "text-destructive"
                          }`}>
                            {tx.tipo === "entrada" ? "+" : "-"} R$ {tx.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="areceber" className="mt-4">
            <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-border">
                {pendingOrders.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      icon={Wallet}
                      title="Nenhum pagamento pendente"
                      description="Todos os pagamentos estão em dia"
                    />
                  </div>
                ) : (
                  pendingOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleOpenOrder(order)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-xs text-muted-foreground">OS-{order.id}</p>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-bold text-warning">
                          R$ {(order.remainingAmount || order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDarBaixa(order);
                          }}
                        >
                          Dar Baixa
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Cliente</TableHead>
                      <TableHead className="font-semibold">Referência</TableHead>
                      <TableHead className="font-semibold">Data</TableHead>
                      <TableHead className="font-semibold text-right">Valor Pendente</TableHead>
                      <TableHead className="font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState
                            icon={Wallet}
                            title="Nenhum pagamento pendente"
                            description="Todos os pagamentos estão em dia"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingOrders.map((order) => (
                        <TableRow 
                          key={order.id} 
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => handleOpenOrder(order)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {order.customerName}
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">OS-{order.id}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-warning">
                            R$ {(order.remainingAmount || order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDarBaixa(order);
                              }}
                            >
                              Dar Baixa
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

          <TabsContent value="apagar" className="mt-4">
            <div className="flex flex-col items-center justify-center h-48 bg-card rounded-xl border border-border">
              <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">Nenhuma conta a pagar</p>
              <p className="text-sm text-muted-foreground/70">As contas cadastradas aparecerão aqui</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Nova Entrada Dialog */}
      <Dialog open={isEntradaOpen} onOpenChange={setIsEntradaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Entrada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              As entradas são registradas automaticamente ao finalizar vendas no PDV.
              Para registrar entradas manuais, utilize o módulo de vendas.
            </p>
            <Button onClick={() => setIsEntradaOpen(false)}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nova Saída Dialog */}
      <Dialog open={isSaidaOpen} onOpenChange={setIsSaidaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Saída / Despesa</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleAddExpense(); }}>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={expenseData.supplierId} onValueChange={(v) => setExpenseData({ ...expenseData, supplierId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fornecedor (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input 
                placeholder="Ex: Compra de papel" 
                value={expenseData.description}
                onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0,00" 
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={expenseData.category} onValueChange={(v) => setExpenseData({ ...expenseData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Material">Material</SelectItem>
                    <SelectItem value="Equipamento">Equipamento</SelectItem>
                    <SelectItem value="Aluguel">Aluguel</SelectItem>
                    <SelectItem value="Energia">Energia</SelectItem>
                    <SelectItem value="Internet">Internet</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsSaidaOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Registrar Saída
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Zerar Dialog with Admin Password */}
      <Dialog open={isZerarDialogOpen} onOpenChange={setIsZerarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              Zerar dados desta instalação
            </DialogTitle>
            <DialogDescription>
              Isso apaga os dados salvos neste navegador (cache/local) e recarrega a página.
              Para confirmar, digite sua senha de administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Senha do Administrador</Label>
              <Input
                type="password"
                placeholder="Digite sua senha"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleZerar()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsZerarDialogOpen(false);
                setAdminPassword("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleZerar}
              disabled={isVerifying || !adminPassword}
            >
              {isVerifying ? "Verificando..." : "Confirmar e Zerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        onStatusChange={() => {}}
        onPrint={() => {}}
        onDelete={() => {}}
        onEdit={() => {}}
      />

      {/* Expense Details Dialog */}
      <ExpenseDetailsDialog 
        expense={selectedExpense}
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
      />

      {/* Entradas List Dialog */}
      <Dialog open={entradasListOpen} onOpenChange={setEntradasListOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Todas as Entradas
            </DialogTitle>
            <DialogDescription>
              Total: R$ {totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({orders.length} vendas)
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma entrada registrada</p>
            ) : (
              orders.map((order) => (
                <div 
                  key={order.id}
                  className="p-4 bg-card border rounded-xl cursor-pointer hover:border-success/50 hover:bg-success/5 transition-all"
                  onClick={() => {
                    setEntradasListOpen(false);
                    handleOpenOrder(order);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">#{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                    </div>
                    <Badge className="bg-success/10 text-success border-success/20">
                      + R$ {(order.amountPaid || order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Saídas List Dialog */}
      <Dialog open={saidasListOpen} onOpenChange={setSaidasListOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Todas as Saídas
            </DialogTitle>
            <DialogDescription>
              Total: R$ {totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({expenses.length} despesas)
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {expenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma saída registrada</p>
            ) : (
              expenses.map((expense) => (
                <div 
                  key={expense.id}
                  className="p-4 bg-card border rounded-xl cursor-pointer hover:border-destructive/50 hover:bg-destructive/5 transition-all"
                  onClick={() => {
                    setSaidasListOpen(false);
                    handleOpenExpense(expense);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">{expense.supplierName || 'Sem fornecedor'}</p>
                    </div>
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                      - R$ {expense.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      {expense.date ? new Date(expense.date).toLocaleDateString("pt-BR") : '--/--/----'}
                    </p>
                    {expense.category && (
                      <Badge variant="secondary" className="text-xs">{expense.category}</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* A Receber List Dialog */}
      <Dialog open={aReceberListOpen} onOpenChange={setAReceberListOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Pedidos A Receber
            </DialogTitle>
            <DialogDescription>
              Total pendente: R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({pendingOrders.length} pedidos)
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {pendingOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum pagamento pendente</p>
            ) : (
              pendingOrders.map((order) => (
                <div 
                  key={order.id}
                  className="p-4 bg-card border rounded-xl cursor-pointer hover:border-warning/50 hover:bg-warning/5 transition-all"
                  onClick={() => {
                    setAReceberListOpen(false);
                    handleOpenOrder(order);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">#{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                    </div>
                    <Badge className="bg-warning/10 text-warning border-warning/20">
                      R$ {(order.remainingAmount || order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Total: R$ {order.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | 
                      Pago: R$ {(order.amountPaid || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}