import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Lock, Unlock, ArrowUpCircle, ArrowDownCircle, Search, AlertTriangle, CalendarDays, Plus, Trash2, Edit2, Check, X, ShoppingCart, Printer } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DialogHeaderWithAction } from "@/components/ui/dialog-header-with-action";
import { PrintButton } from "@/components/ui/print-button";
import { useStore } from "@/lib/store";
import { useSyncedCompanySettings } from "@/hooks/useSyncedCompanySettings";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ServiceOrder, Expense } from "@/lib/types";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ExpenseDetailsDialog } from "@/components/caixa/ExpenseDetailsDialog";

export default function Caixa() {
  const [isOpen, setIsOpen] = useState(true);
  const { orders } = useSupabaseOrders();
  const { expenses, addExpense: addSupabaseExpense, supplierBalances, getSupplierBalance } = useSupabaseExpenses();
  const { suppliers, fixedExpenses, addFixedExpense, updateFixedExpense, removeFixedExpense, applyFixedExpenses, addExpense: addLocalExpense } = useStore();
  const { authUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [suprimentoValue, setSuprimentoValue] = useState("");
  const [suprimentoMotivo, setSuprimentoMotivo] = useState("");
  const [sangriaValue, setSangriaValue] = useState("");
  const [sangriaMotivo, setSangriaMotivo] = useState("");
  const [suprimentoOpen, setSuprimentoOpen] = useState(false);
  const [sangriaOpen, setSangriaOpen] = useState(false);
  const [entradasDialogOpen, setEntradasDialogOpen] = useState(false);
  const [saidasDialogOpen, setSaidasDialogOpen] = useState(false);
  const [resultadoDialogOpen, setResultadoDialogOpen] = useState(false);
  
  // Fixed expense dialog state
  const [fixedExpenseOpen, setFixedExpenseOpen] = useState(false);
  const [fixedExpenseName, setFixedExpenseName] = useState("");
  const [fixedExpenseAmount, setFixedExpenseAmount] = useState("");
  const [fixedExpenseDueDay, setFixedExpenseDueDay] = useState("1");
  const [fixedExpenseCategory, setFixedExpenseCategory] = useState("");
  const [editingFixedExpense, setEditingFixedExpense] = useState<string | null>(null);

  // Order details dialog state
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  
  // Expense details dialog state
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  
  const { settings: companySettings } = useSyncedCompanySettings();
  // Apply fixed expenses on mount
  useEffect(() => {
    applyFixedExpenses();
  }, []);

  // Access Control: Sellers cannot access Cash Register
  if (authUser?.role === 'seller') {
    return (
      <MainLayout title="Acesso Negado">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
           <div className="bg-destructive/10 p-6 rounded-full mb-4">
              <Lock className="w-12 h-12 text-destructive" />
           </div>
           <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
           <p className="text-muted-foreground max-w-md">
             Seu perfil de vendedor não tem permissão para acessar o fechamento de caixa.
             Solicite acesso ao gerente ou administrador.
           </p>
           <Button className="mt-6" variant="outline" onClick={() => window.location.href = "/"}>
             Voltar ao Início
           </Button>
        </div>
      </MainLayout>
    );
  }

  // Helper to safely format time
  const formatTime = (dateStr: string | undefined) => {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper to safely create date
  const safeDate = (dateStr: string | undefined) => {
    if (!dateStr) return new Date(0);
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date(0);
    return d;
  };

  // Calculate commission rate
  const commissionRate = companySettings?.usesCommission ? (companySettings?.commissionPercentage || 0) / 100 : 0;

  // Calculate total commission from paid orders
  const totalCommission = orders.reduce((acc, order) => {
    if (commissionRate > 0 && (order.amountPaid || 0) > 0) {
      return acc + (order.amountPaid || 0) * commissionRate;
    }
    return acc;
  }, 0);

  // Derive transactions from orders and expenses
  const transactions = [
     ...orders.flatMap(order => {
        if (order.payments && order.payments.length > 0) {
           // Filter only payments with valid dates (paid ones)
           return order.payments
             .filter(payment => payment.date && payment.date !== '')
             .map(payment => ({
              id: payment.id,
              orderId: order.id,
              customer: order.customerName,
              desc: `Pagamento Venda #${order.id}`,
              type: 'in' as const,
              value: payment.amount,
              time: formatTime(payment.date),
              date: safeDate(payment.date),
              totalOrder: order.total,
              paidOrder: order.amountPaid || 0,
              remainingOrder: order.remainingAmount || 0,
              status: order.paymentStatus
           }));
        }
        else if (order.paymentStatus === 'paid' || (order.amountPaid && order.amountPaid > 0)) {
           return [{
              id: order.id,
              orderId: order.id,
              customer: order.customerName,
              desc: `Venda #${order.id}`,
              type: 'in' as const,
              value: order.amountPaid || order.total,
              time: formatTime(order.createdAt),
              date: safeDate(order.createdAt),
              totalOrder: order.total,
              paidOrder: order.amountPaid || order.total,
              remainingOrder: order.remainingAmount || 0,
              status: order.paymentStatus
           }];
        }
        return [];
     }),
     ...expenses.map(expense => ({
        id: expense.id,
        orderId: '',
        customer: expense.supplierName,
        desc: expense.description,
        type: 'out' as const,
        value: expense.amount,
        time: formatTime(expense.date),
        date: safeDate(expense.date),
        totalOrder: 0,
        paidOrder: 0,
        remainingOrder: 0,
        status: 'paid' as const
     }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Calculate Balance (including commission as debit)
  const totalIn = transactions.filter(t => t.type === 'in').reduce((acc, curr) => acc + curr.value, 0);
  const totalOut = transactions.filter(t => t.type === 'out').reduce((acc, curr) => acc + curr.value, 0) + totalCommission;
  const initialFloat = 150.00;
  const currentBalance = initialFloat + totalIn - totalOut;

  const handleSuprimento = () => {
    const value = parseFloat(suprimentoValue);
    if (!value || value <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    // For suprimento (entrada), we don't add as expense, it's just cash in
    toast.success(`Suprimento de R$ ${value.toFixed(2)} registrado`);
    setSuprimentoValue("");
    setSuprimentoMotivo("");
    setSuprimentoOpen(false);
  };

  const handleSangria = () => {
    const value = parseFloat(sangriaValue);
    if (!value || value <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    
    addSupabaseExpense({
      supplierId: '',
      supplierName: 'Sangria de Caixa',
      description: sangriaMotivo || 'Sangria de caixa',
      amount: value,
      date: new Date().toISOString(),
      category: 'Sangria'
    });

    toast.success(`Sangria de R$ ${value.toFixed(2)} registrada`);
    setSangriaValue("");
    setSangriaMotivo("");
    setSangriaOpen(false);
  };

  const handleAddFixedExpense = () => {
    const amount = parseFloat(fixedExpenseAmount);
    const dueDay = parseInt(fixedExpenseDueDay);
    
    if (!fixedExpenseName.trim()) {
      toast.error("Informe o nome do gasto");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!dueDay || dueDay < 1 || dueDay > 31) {
      toast.error("Dia de vencimento deve ser entre 1 e 31");
      return;
    }

    if (editingFixedExpense) {
      updateFixedExpense(editingFixedExpense, {
        name: fixedExpenseName,
        amount,
        dueDay,
        category: fixedExpenseCategory || 'Geral'
      });
      toast.success("Gasto fixo atualizado");
    } else {
      addFixedExpense({
        name: fixedExpenseName,
        amount,
        dueDay,
        category: fixedExpenseCategory || 'Geral',
        active: true
      });
      toast.success("Gasto fixo cadastrado");
    }

    resetFixedExpenseForm();
  };

  const resetFixedExpenseForm = () => {
    setFixedExpenseName("");
    setFixedExpenseAmount("");
    setFixedExpenseDueDay("1");
    setFixedExpenseCategory("");
    setEditingFixedExpense(null);
    setFixedExpenseOpen(false);
  };

  const handleEditFixedExpense = (expense: typeof fixedExpenses[0]) => {
    setFixedExpenseName(expense.name);
    setFixedExpenseAmount(expense.amount.toString());
    setFixedExpenseDueDay(expense.dueDay.toString());
    setFixedExpenseCategory(expense.category);
    setEditingFixedExpense(expense.id);
    setFixedExpenseOpen(true);
  };

  const handleDeleteFixedExpense = (id: string) => {
    removeFixedExpense(id);
    toast.success("Gasto fixo removido");
  };

  const handleToggleFixedExpense = (id: string, active: boolean) => {
    updateFixedExpense(id, { active });
    toast.success(active ? "Gasto fixo ativado" : "Gasto fixo desativado");
  };

  // Calculate total fixed expenses
  const totalFixedExpenses = fixedExpenses.filter(e => e.active).reduce((acc, e) => acc + e.amount, 0);

  const filteredTransactions = transactions.filter(t =>
    t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.orderId.includes(searchTerm)
  );

  return (
    <MainLayout title="Controle de Caixa">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`border-l-4 ${isOpen ? 'border-l-success' : 'border-l-destructive'}`}>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Status do Caixa</p>
              <h3 className={`text-2xl font-bold flex items-center gap-2 ${isOpen ? 'text-success' : 'text-destructive'}`}>
                {isOpen ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                {isOpen ? "ABERTO" : "FECHADO"}
              </h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Saldo em Caixa</p>
              <h3 className="text-2xl font-bold text-primary">R$ {currentBalance.toFixed(2)}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                 Inclui fundo de troco: R$ {initialFloat.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex gap-3 items-center h-full">
              {isOpen ? (
                <Button variant="destructive" className="w-full h-full" onClick={() => { setIsOpen(false); toast.success("Caixa fechado com sucesso"); }}>
                  <Lock className="w-4 h-4 mr-2" />
                  Fechar Caixa
                </Button>
              ) : (
                <Button className="w-full h-full bg-success hover:bg-success/90 text-success-foreground" onClick={() => { setIsOpen(true); toast.success("Caixa aberto com sucesso"); }}>
                  <Unlock className="w-4 h-4 mr-2" />
                  Abrir Caixa
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="bg-success/5 border-success/20 cursor-pointer hover:shadow-lg hover:border-success/50 transition-all"
            onClick={() => setEntradasDialogOpen(true)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <ArrowUpCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <p className="text-xl font-bold text-success">+ R$ {totalIn.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-destructive/5 border-destructive/20 cursor-pointer hover:shadow-lg hover:border-destructive/50 transition-all"
            onClick={() => setSaidasDialogOpen(true)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <ArrowDownCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Saídas</p>
                <p className="text-xl font-bold text-destructive">- R$ {totalOut.toFixed(2)}</p>
                {totalCommission > 0 && (
                  <p className="text-xs text-muted-foreground">
                    (inclui comissões: R$ {totalCommission.toFixed(2)})
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-primary/5 border-primary/20 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
            onClick={() => setResultadoDialogOpen(true)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resultado</p>
                <p className={`text-xl font-bold ${totalIn - totalOut >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {(totalIn - totalOut).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Fluxo de Caixa</CardTitle>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                       placeholder="Buscar venda..."
                       className="pl-9 h-9"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Initial Float Entry */}
                  <div className="flex justify-between items-center p-3 hover:bg-success/10 rounded-lg border-2 border-success/20 hover:border-success/50 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-success/10 text-success">
                          <ArrowUpCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">Abertura de Caixa (Fundo)</p>
                          <p className="text-xs text-muted-foreground">08:00</p>
                        </div>
                      </div>
                      <span className="font-bold text-success">
                        + R$ {initialFloat.toFixed(2)}
                      </span>
                    </div>

                  {/* Commission Entry */}
                  {totalCommission > 0 && (
                    <div className="flex justify-between items-center p-3 hover:bg-orange-500/10 rounded-lg border-2 border-orange-500/30 hover:border-orange-500/50 transition-all duration-200 shadow-sm hover:shadow-md bg-orange-500/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-500/10 text-orange-500">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">Débito de Comissões ({companySettings?.commissionPercentage || 0}%)</p>
                          <p className="text-xs text-muted-foreground">Sobre vendas pagas</p>
                        </div>
                      </div>
                      <span className="font-bold text-orange-500">
                        - R$ {totalCommission.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {filteredTransactions.map((item, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg border-2 transition-all duration-200 bg-card shadow-md hover:shadow-lg gap-4 cursor-pointer ${item.type === 'in' ? 'border-success/20 hover:border-success/50 hover:bg-success/10' : 'border-destructive/20 hover:border-destructive/50 hover:bg-destructive/10'}`}
                      onClick={() => {
                        if (item.type === 'in' && item.orderId) {
                          const order = orders.find(o => o.id === item.orderId);
                          if (order) {
                            setSelectedOrder(order);
                            setOrderDialogOpen(true);
                          }
                        } else if (item.type === 'out') {
                          const expense = expenses.find(e => e.id === item.id);
                          if (expense) {
                            setSelectedExpense(expense);
                            setExpenseDialogOpen(true);
                          }
                        }
                      }}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.type === 'in' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {item.type === 'in' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                        </div>
                        <div className="w-full">
                          <div className="flex justify-between sm:justify-start sm:gap-4">
                             <p className="font-bold text-foreground">{item.desc}</p>
                             <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium self-start ml-4">
                                {item.time}
                             </span>
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">{item.customer}</p>

                          {item.type === 'in' && (
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border">
                               <div>
                                  Total Pedido: <span className="font-semibold text-foreground">R$ {item.totalOrder.toFixed(2)}</span>
                               </div>
                               <div>
                                  Total Pago: <span className="font-semibold text-success">R$ {item.paidOrder.toFixed(2)}</span>
                               </div>
                               {item.remainingOrder > 0 ? (
                                  <>
                                    <div>
                                       Restante: <span className="font-bold text-destructive">R$ {item.remainingOrder.toFixed(2)}</span>
                                    </div>
                                    {(() => {
                                      const order = orders.find(o => o.id === item.orderId);
                                      if (order?.payments && order.payments.length > 1) {
                                        const installmentEntries = order.payments.filter((p) => {
                                          const anyP = p as any;
                                          return !anyP?.method || !anyP?.date;
                                        });
                                        const qty = installmentEntries.length > 0 ? installmentEntries.length : order.payments.length;
                                        const value = (installmentEntries[0]?.amount ?? order.payments[0]?.amount ?? 0) as number;
                                        return (
                                          <div>
                                            Parcelado: <span className="font-bold text-primary">{qty}x de R$ {value.toFixed(2)}</span>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </>
                               ) : (
                                  <div className="text-success font-bold flex items-center gap-1">
                                     <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Quitada
                                  </div>
                               )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end min-w-[100px]">
                         <span className={`font-bold text-lg ${item.type === 'in' ? 'text-success' : 'text-destructive'}`}>
                           {item.type === 'in' ? '+' : '-'} R$ {Math.abs(item.value).toFixed(2)}
                         </span>
                         <span className="text-xs text-muted-foreground">{item.type === 'in' ? 'Entrada' : 'Saída'}</span>
                      </div>
                    </div>
                  ))}

                  {filteredTransactions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                       Nenhuma movimentação encontrada.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sangria / Suprimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={suprimentoOpen} onOpenChange={setSuprimentoOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2 h-12 border-success/30 hover:bg-success/10 text-success min-w-0">
                      <ArrowUpCircle className="w-5 h-5 shrink-0" />
                      <span className="truncate">Suprimento (Entrada)</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby={undefined}>
                    <DialogHeader><DialogTitle>Adicionar Dinheiro ao Caixa</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Valor (R$)</Label>
                        <Input 
                          type="number" 
                          placeholder="0,00" 
                          value={suprimentoValue}
                          onChange={(e) => setSuprimentoValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Motivo</Label>
                        <Input 
                          placeholder="Ex: Troco inicial" 
                          value={suprimentoMotivo}
                          onChange={(e) => setSuprimentoMotivo(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleSuprimento} className="w-full bg-success hover:bg-success/90 text-success-foreground">
                        Confirmar Entrada
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={sangriaOpen} onOpenChange={setSangriaOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2 h-12 border-destructive/30 hover:bg-destructive/10 text-destructive min-w-0">
                      <ArrowDownCircle className="w-5 h-5 shrink-0" />
                      <span className="truncate">Sangria (Retirada)</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby={undefined}>
                    <DialogHeader><DialogTitle>Retirar Dinheiro do Caixa</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Valor (R$)</Label>
                        <Input 
                          type="number" 
                          placeholder="0,00" 
                          value={sangriaValue}
                          onChange={(e) => setSangriaValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Motivo</Label>
                        <Input 
                          placeholder="Ex: Pagamento fornecedor" 
                          value={sangriaMotivo}
                          onChange={(e) => setSangriaMotivo(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleSangria} variant="destructive" className="w-full">
                        Confirmar Saída
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Fixed Expenses Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Gastos Fixos Mensais
                </CardTitle>
                <Dialog open={fixedExpenseOpen} onOpenChange={(open) => { if (!open) resetFixedExpenseForm(); else setFixedExpenseOpen(true); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Plus className="w-4 h-4" />
                      Novo
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>{editingFixedExpense ? 'Editar Gasto Fixo' : 'Cadastrar Gasto Fixo'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome do Gasto</Label>
                        <Input 
                          placeholder="Ex: Aluguel, Energia, Internet" 
                          value={fixedExpenseName}
                          onChange={(e) => setFixedExpenseName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Valor (R$)</Label>
                          <Input 
                            type="number" 
                            placeholder="0,00" 
                            value={fixedExpenseAmount}
                            onChange={(e) => setFixedExpenseAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dia Vencimento</Label>
                          <Input 
                            type="number" 
                            min="1"
                            max="31"
                            placeholder="1-31" 
                            value={fixedExpenseDueDay}
                            onChange={(e) => setFixedExpenseDueDay(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Input 
                          placeholder="Ex: Infraestrutura, Serviços" 
                          value={fixedExpenseCategory}
                          onChange={(e) => setFixedExpenseCategory(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddFixedExpense} className="w-full">
                        {editingFixedExpense ? 'Salvar Alterações' : 'Cadastrar Gasto'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {fixedExpenses.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Gasto</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-center">Dia</TableHead>
                            <TableHead className="text-center">Ativo</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fixedExpenses.map((expense) => (
                            <TableRow key={expense.id} className={!expense.active ? 'opacity-50' : ''}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{expense.name}</p>
                                  <p className="text-xs text-muted-foreground">{expense.category}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium text-destructive">
                                R$ {expense.amount.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="bg-muted px-2 py-1 rounded text-xs font-medium">
                                  Dia {expense.dueDay}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={expense.active}
                                  onCheckedChange={(checked) => handleToggleFixedExpense(expense.id, checked)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => handleEditFixedExpense(expense)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteFixedExpense(expense.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <span className="text-sm font-medium">Total Gastos Fixos:</span>
                      <span className="font-bold text-destructive">R$ {totalFixedExpenses.toFixed(2)}/mês</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum gasto fixo cadastrado</p>
                    <p className="text-xs">Cadastre seus gastos mensais recorrentes</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warning if balance is low */}
            {currentBalance < 50 && (
              <Card className="border-warning bg-warning/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning">Saldo Baixo</p>
                    <p className="text-sm text-muted-foreground">
                      O saldo em caixa está abaixo de R$ 50,00. Considere adicionar um suprimento.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de Entradas */}
      <Dialog open={entradasDialogOpen} onOpenChange={setEntradasDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeaderWithAction
            title="Pedidos com Entradas"
            action={
              <PrintButton
                onClick={() => {
                  const printContent = document.getElementById('entradas-print-content');
                  if (printContent) {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Entradas - ${new Date().toLocaleDateString()}</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; }
                              .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
                              .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
                              .print-actions .btn-print { background: #22c55e; }
                              .print-actions .btn-close { background: #ef4444; }
                              h1 { color: #16a34a; margin-bottom: 20px; }
                              .item { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
                              .item:last-child { border-bottom: none; }
                              .value { color: #16a34a; font-weight: bold; }
                              .total { margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; font-size: 1.2em; display: flex; justify-content: space-between; }
                              .header-info { margin-bottom: 10px; color: #666; }
                              @media print { .print-actions { display: none !important; } }
                            </style>
                          </head>
                          <body>
                            <div class="print-actions">
                              <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
                              <button class="btn-close" onclick="window.close()">✕ Fechar</button>
                            </div>
                            <h1>Pedidos com Entradas</h1>
                            <div class="header-info">Data: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}</div>
                            ${transactions.filter(t => t.type === 'in').map(item => `
                              <div class="item">
                                <div>
                                  <strong>${item.desc}</strong><br/>
                                  <span>${item.customer}</span><br/>
                                  <small>${item.time}</small>
                                </div>
                                <div class="value">+ R$ ${item.value.toFixed(2)}</div>
                              </div>
                            `).join('')}
                            <div class="total">
                              <span>Total de Entradas:</span>
                              <span class="value">R$ ${totalIn.toFixed(2)}</span>
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                    }
                  }
                }}
              />
            }
          />
          <div className="flex-1 overflow-y-auto space-y-2">
            {transactions.filter(t => t.type === 'in').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma entrada registrada</p>
              </div>
            ) : (
              transactions.filter(t => t.type === 'in').map((item, i) => (
                <div 
                  key={i} 
                  className="flex justify-between items-center p-3 rounded-lg border bg-card hover:bg-success/5 transition-colors cursor-pointer"
                  onClick={() => {
                    if (item.orderId) {
                      const order = orders.find(o => o.id === item.orderId);
                      if (order) {
                        setEntradasDialogOpen(false);
                        setSelectedOrder(order);
                        setOrderDialogOpen(true);
                      }
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.desc}</p>
                    <p className="text-sm text-muted-foreground">{item.customer}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-2">
                    <span className="font-bold text-success">+ R$ {item.value.toFixed(2)}</span>
                    {item.orderId && (
                      <Badge variant="outline" className="text-xs">#{item.orderId}</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t pt-3 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Total de Entradas:</span>
              <span className="text-xl font-bold text-success">R$ {totalIn.toFixed(2)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Saídas */}
      <Dialog open={saidasDialogOpen} onOpenChange={setSaidasDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeaderWithAction
            title="Todas as Saídas"
            action={
              <PrintButton
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Saídas - ${new Date().toLocaleDateString()}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            .print-actions { display: flex; gap: 10px; justify-content: center; margin: 0 0 16px; padding: 12px; background: #f0f0f0; border-radius: 10px; position: sticky; top: 0; }
                            .print-actions button { border: none; padding: 12px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
                            .print-actions .btn-print { background: #22c55e; }
                            .print-actions .btn-close { background: #ef4444; }
                            h1 { color: #dc2626; margin-bottom: 20px; }
                            .item { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
                            .item:last-child { border-bottom: none; }
                            .value { color: #dc2626; font-weight: bold; }
                            .total { margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; font-size: 1.2em; display: flex; justify-content: space-between; }
                            .header-info { margin-bottom: 10px; color: #666; }
                            @media print { .print-actions { display: none !important; } }
                          </style>
                        </head>
                        <body>
                          <div class="print-actions">
                            <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
                            <button class="btn-close" onclick="window.close()">✕ Fechar</button>
                          </div>
                          <h1>Todas as Saídas</h1>
                          <div class="header-info">Data: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}</div>
                          ${transactions.filter(t => t.type === 'out').map(item => `
                            <div class="item">
                              <div>
                                <strong>${item.desc}</strong><br/>
                                <span>${item.customer}</span><br/>
                                <small>${item.time}</small>
                              </div>
                              <div class="value">- R$ ${item.value.toFixed(2)}</div>
                            </div>
                          `).join('')}
                          <div class="total">
                            <span>Total de Saídas:</span>
                            <span class="value">R$ ${totalOut.toFixed(2)}</span>
                          </div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                  }
                }}
              />
            }
          />
          <div className="flex-1 overflow-y-auto space-y-2">
            {/* Commission entry if enabled */}
            {totalCommission > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg border bg-orange-500/10 border-orange-500/30">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">Débito de Comissões</p>
                  <p className="text-sm text-muted-foreground">Comissões sobre vendas ({companySettings?.commissionPercentage || 0}%)</p>
                </div>
                <div className="flex flex-col items-end shrink-0 ml-2">
                  <span className="font-bold text-orange-500">- R$ {totalCommission.toFixed(2)}</span>
                </div>
              </div>
            )}
            {transactions.filter(t => t.type === 'out').length === 0 && totalCommission === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma saída registrada</p>
              </div>
            ) : (
              transactions.filter(t => t.type === 'out').map((item, i) => (
                <div 
                  key={i} 
                  className="flex justify-between items-center p-3 rounded-lg border bg-card hover:bg-destructive/5 transition-colors cursor-pointer"
                  onClick={() => {
                    if (item.orderId) {
                      const order = orders.find(o => o.id === item.orderId);
                      if (order) {
                        setSaidasDialogOpen(false);
                        setSelectedOrder(order);
                        setOrderDialogOpen(true);
                      }
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.desc}</p>
                    <p className="text-sm text-muted-foreground">{item.customer}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-2">
                    <span className="font-bold text-destructive">- R$ {item.value.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t pt-3 mt-2 space-y-2">
            {totalCommission > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Débito Comissões:</span>
                <span className="font-medium text-orange-500">R$ {totalCommission.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Total de Saídas:</span>
              <span className="text-xl font-bold text-destructive">R$ {totalOut.toFixed(2)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Resultado */}
      <Dialog open={resultadoDialogOpen} onOpenChange={setResultadoDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Resumo do Caixa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="flex justify-between items-center p-3 rounded-lg border bg-success/5">
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-success" />
                  <span className="font-medium">Total Entradas</span>
                </div>
                <span className="font-bold text-success">+ R$ {totalIn.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border bg-destructive/5">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="w-5 h-5 text-destructive" />
                  <span className="font-medium">Total Saídas</span>
                </div>
                <span className="font-bold text-destructive">- R$ {totalOut.toFixed(2)}</span>
              </div>
              {totalCommission > 0 && (
                <div className="flex justify-between items-center p-3 rounded-lg border bg-orange-500/10 border-orange-500/30 ml-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-orange-500" />
                    <span className="font-medium text-sm">Débito Comissões ({companySettings?.commissionPercentage || 0}%)</span>
                  </div>
                  <span className="font-bold text-orange-500">R$ {totalCommission.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border-2 border-primary/20">
                <span className="font-semibold">Resultado</span>
                <span className={`text-2xl font-bold ${totalIn - totalOut >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {(totalIn - totalOut).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              Entradas: {transactions.filter(t => t.type === 'in').length} | Saídas: {transactions.filter(t => t.type === 'out').length}{totalCommission > 0 ? ' | Comissões incluídas' : ''}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold mb-0.5">Nº do Pedido</span>
                  <span className="font-mono font-bold text-lg text-primary">#{selectedOrder.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold mb-0.5">Data e Hora</span>
                  <span className="font-medium block">{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                  <span className="text-xs text-muted-foreground">{new Date(selectedOrder.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold mb-0.5">Cliente</span>
                  <span className="font-bold text-base">{selectedOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold mb-0.5">Vendedor</span>
                  <span className="font-medium">{selectedOrder.sellerName || 'Não informado'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-3 text-xs uppercase tracking-wider text-muted-foreground border-b pb-1 flex items-center gap-2">
                  <ShoppingCart className="w-3 h-3" />
                  Itens do Pedido
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm">{item.quantity}x {item.name}</span>
                        <span className="font-bold text-sm">R$ {item.total.toFixed(2)}</span>
                      </div>
                      {item.variationName && <div className="text-xs text-primary font-medium">{item.variationName}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg space-y-2 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Valor Total</span>
                  <span className="font-bold text-base">R$ {selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Valor Pago</span>
                  <span className="font-bold text-success">R$ {(selectedOrder.amountPaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t border-border mt-2">
                  <span className="font-bold">Valor em Aberto</span>
                  <span className="font-black text-warning text-xl">
                    R$ {(selectedOrder.remainingAmount ?? (selectedOrder.total - (selectedOrder.amountPaid || 0))).toFixed(2)}
                  </span>
                </div>
                {/* Installments info */}
                {selectedOrder.payments && selectedOrder.payments.length > 1 && (() => {
                  const installmentEntries = selectedOrder.payments.filter((p) => {
                    const anyP = p as any;
                    return !anyP?.method || !anyP?.date;
                  });
                  const qty = installmentEntries.length > 0 ? installmentEntries.length : selectedOrder.payments.length;
                  const value = (installmentEntries[0]?.amount ?? selectedOrder.payments[0]?.amount ?? 0) as number;
                  return (
                    <div className="flex justify-between text-sm pt-2 border-t border-border mt-2">
                      <span className="text-muted-foreground font-medium">Parcelamento</span>
                      <span className="font-bold text-primary">
                        {qty}x de R$ {value.toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <WhatsAppButton 
                  order={selectedOrder} 
                  companySettings={companySettings}
                  variant="outline"
                  size="sm"
                  showLabel
                  className="w-full"
                />
                <Button variant="outline" onClick={() => setOrderDialogOpen(false)} size="sm" className="w-full">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Expense Details Dialog */}
      <ExpenseDetailsDialog 
        expense={selectedExpense}
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
      />
    </MainLayout>
  );
}
