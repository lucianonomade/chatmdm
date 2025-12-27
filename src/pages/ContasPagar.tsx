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
  CreditCard,
  Wallet,
} from "lucide-react";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useSupabaseFixedExpenses, FixedExpense } from "@/hooks/useSupabaseFixedExpenses";
import { useSupabasePendingInstallments, PendingInstallment } from "@/hooks/useSupabasePendingInstallments";
import { useAuth } from "@/hooks/useAuth";
import { useSyncedCompanySettings } from "@/hooks/useSyncedCompanySettings";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addMonths } from "date-fns";
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
  const { expenses, supplierBalances, getSupplierBalance, isLoading: expensesLoading, addExpense, updateExpense, deleteExpense, isUpdating: isUpdatingExpense, isDeleting: isDeletingExpense } = useSupabaseExpenses();
  const { orders, isLoading: ordersLoading } = useSupabaseOrders();
  const { fixedExpenses, totalFixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense, isLoading: fixedLoading } = useSupabaseFixedExpenses();
  const { pendingInstallments, totalPendingAmount, payInstallment, updatePurchase, deletePurchase, isLoading: installmentsLoading, isPaying: isPayingInstallment, isUpdating: isUpdatingPurchase, isDeleting: isDeletingPurchase } = useSupabasePendingInstallments();
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
  const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
  
  // Installment details dialog state
  const [selectedInstallment, setSelectedInstallment] = useState<PendingInstallment | null>(null);
  const [installmentDetailsOpen, setInstallmentDetailsOpen] = useState(false);
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);

  // Grouped installments dialog state
  const [selectedGroupedInstallments, setSelectedGroupedInstallments] = useState<PendingInstallment[]>([]);
  const [groupedInstallmentsOpen, setGroupedInstallmentsOpen] = useState(false);

  // Edit purchase dialog state
  const [editPurchaseOpen, setEditPurchaseOpen] = useState(false);
  const [editPurchaseInstallments, setEditPurchaseInstallments] = useState<PendingInstallment[]>([]);
  const [editPurchaseDescription, setEditPurchaseDescription] = useState("");
  const [editPurchaseSupplier, setEditPurchaseSupplier] = useState("");
  const [editPurchaseCategory, setEditPurchaseCategory] = useState("");
  const [editPurchaseNotes, setEditPurchaseNotes] = useState("");
  const [editPurchaseTotalAmount, setEditPurchaseTotalAmount] = useState("");
  const [editPurchaseInstallmentsCount, setEditPurchaseInstallmentsCount] = useState("");
  const [editInstallmentDates, setEditInstallmentDates] = useState<string[]>([]);
  const [deletePurchaseConfirmOpen, setDeletePurchaseConfirmOpen] = useState(false);

  // Payment dialog state (for partial payments)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'fixed' | 'installment' | null>(null);
  const [paymentItem, setPaymentItem] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  // Commission payment state
  const [commissionPaymentOpen, setCommissionPaymentOpen] = useState(false);
  const [sellerToPayCommission, setSellerToPayCommission] = useState<SellerCommission | null>(null);
  const [isPayingCommission, setIsPayingCommission] = useState(false);
  
  // Per-order commission payment state
  const [selectedOrdersForCommission, setSelectedOrdersForCommission] = useState<Set<string>>(new Set());
  const [orderCommissionDialogOpen, setOrderCommissionDialogOpen] = useState(false);
  const [orderToPayCommission, setOrderToPayCommission] = useState<ServiceOrder | null>(null);
  const [isPayingOrderCommission, setIsPayingOrderCommission] = useState(false);

  // Stats Cards Dialog state
  const [statsDialogOpen, setStatsDialogOpen] = useState<'total' | 'fornecedores' | 'comissoes' | 'compras' | null>(null);

  // Expense delete confirmation state
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);
  const [deleteExpenseConfirmOpen, setDeleteExpenseConfirmOpen] = useState(false);

  // Expense edit state
  const [editExpenseOpen, setEditExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<{id: string; description: string; amount: string; category: string; supplierName: string} | null>(null);

  const isLoading = suppliersLoading || expensesLoading || ordersLoading || fixedLoading || installmentsLoading;

  // Group pending installments by description (same purchase)
  const groupedPendingInstallments = useMemo(() => {
    const groups = new Map<string, PendingInstallment[]>();
    
    pendingInstallments.forEach(installment => {
      const key = `${installment.description}-${installment.supplierId || 'none'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(installment);
    });

    return Array.from(groups.entries()).map(([key, installments]) => ({
      key,
      description: installments[0].description,
      supplierName: installments[0].supplierName,
      category: installments[0].category,
      totalAmount: installments[0].totalAmount,
      installments: installments.sort((a, b) => a.installmentNumber - b.installmentNumber),
      pendingCount: installments.length,
      totalPending: installments.reduce((sum, i) => sum + i.amount, 0),
      nextDueDate: installments.reduce((earliest, i) => 
        new Date(i.dueDate) < new Date(earliest) ? i.dueDate : earliest, 
        installments[0].dueDate
      ),
    }));
  }, [pendingInstallments]);

  // Check if a fixed expense was already paid for a specific month
  const isFixedExpensePaidForMonth = (fixedExpenseId: string, month: number, year: number): boolean => {
    return expenses.some(e => 
      e.category === 'Gasto Fixo' && 
      e.description.includes(`[${fixedExpenseId}]`) &&
      new Date(e.date).getMonth() === month &&
      new Date(e.date).getFullYear() === year
    );
  };

  // Generate list of pending fixed expenses with their due dates (current month + next month)
  const pendingFixedExpenses = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const nextMonthDate = addMonths(today, 1);
    const nextMonth = nextMonthDate.getMonth();
    const nextYear = nextMonthDate.getFullYear();

    const pending: Array<{ expense: FixedExpense; dueDate: Date; monthLabel: string }> = [];

    fixedExpenses.filter(fe => fe.active).forEach(expense => {
      // Check current month
      if (!isFixedExpensePaidForMonth(expense.id, currentMonth, currentYear)) {
        const dueDate = new Date(currentYear, currentMonth, expense.dueDay);
        pending.push({
          expense,
          dueDate,
          monthLabel: format(dueDate, "dd/MM", { locale: ptBR })
        });
      }
      
      // Check next month
      if (!isFixedExpensePaidForMonth(expense.id, nextMonth, nextYear)) {
        const dueDate = new Date(nextYear, nextMonth, expense.dueDay);
        pending.push({
          expense,
          dueDate,
          monthLabel: format(dueDate, "dd/MM", { locale: ptBR })
        });
      }
    });

    // Sort by due date
    return pending.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [fixedExpenses, expenses]);
  
  const totalPendingFixedExpenses = pendingFixedExpenses.reduce((sum, p) => sum + p.expense.amount, 0);

  // Open payment dialog
  const openPaymentDialog = (type: 'fixed' | 'installment', item: any, amount: number) => {
    setPaymentType(type);
    setPaymentItem(item);
    setPaymentAmount(amount.toFixed(2));
    setIsPartialPayment(false);
    setPaymentDialogOpen(true);
  };

  // Handle confirming payment
  const handleConfirmPayment = () => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) return;

    if (paymentType === 'fixed' && paymentItem) {
      const expense = paymentItem as FixedExpense;
      setPayingExpenseId(expense.id);
      
      addExpense({
        supplierId: '',
        supplierName: 'Gasto Fixo',
        description: `${expense.name} [${expense.id}]${isPartialPayment ? ' (Parcial)' : ''}`,
        amount: amount,
        date: new Date().toISOString(),
        category: 'Gasto Fixo'
      });
      
      setTimeout(() => setPayingExpenseId(null), 500);
    } else if (paymentType === 'installment' && paymentItem) {
      const installment = paymentItem as PendingInstallment;
      setPayingInstallmentId(installment.id);
      
      addExpense({
        supplierId: installment.supplierId || '',
        supplierName: installment.supplierName || 'Compra Parcelada',
        description: `${installment.description} (Parcela ${installment.installmentNumber}/${installment.totalInstallments})${isPartialPayment ? ' - Parcial' : ''}`,
        amount: amount,
        date: new Date().toISOString(),
        category: installment.category || 'Compras'
      });
      
      // Only mark as paid if paying full amount
      if (!isPartialPayment || amount >= installment.amount) {
        payInstallment(installment.id);
      }
      
      setTimeout(() => setPayingInstallmentId(null), 500);
    }

    setPaymentDialogOpen(false);
    setPaymentItem(null);
    setPaymentType(null);
  };

  // Quick pay for fixed expense (full amount)
  const handlePayFixedExpense = (expense: FixedExpense) => {
    openPaymentDialog('fixed', expense, expense.amount);
  };

  // Quick pay for installment (full amount)
  const handlePayInstallment = (installment: PendingInstallment) => {
    openPaymentDialog('installment', installment, installment.amount);
  };

  // Open edit purchase dialog
  const handleEditPurchase = (installments: PendingInstallment[]) => {
    if (installments.length === 0) return;
    const sortedInstallments = [...installments].sort((a, b) => a.installmentNumber - b.installmentNumber);
    setEditPurchaseInstallments(sortedInstallments);
    setEditPurchaseDescription(sortedInstallments[0].description);
    setEditPurchaseSupplier(sortedInstallments[0].supplierName || "");
    setEditPurchaseCategory(sortedInstallments[0].category || "");
    setEditPurchaseNotes(sortedInstallments[0].notes || "");
    setEditPurchaseTotalAmount(sortedInstallments[0].totalAmount.toFixed(2));
    setEditPurchaseInstallmentsCount(sortedInstallments.length.toString());
    // Initialize dates from existing installments
    setEditInstallmentDates(sortedInstallments.map(i => i.dueDate));
    setEditPurchaseOpen(true);
  };

  // Handle installments count change - regenerate dates array
  const handleInstallmentsCountChange = (newCount: string) => {
    setEditPurchaseInstallmentsCount(newCount);
    const count = parseInt(newCount);
    if (isNaN(count) || count < 1) return;
    
    // Get first date from current dates or use today
    const firstDate = editInstallmentDates[0] 
      ? new Date(editInstallmentDates[0] + 'T12:00:00') 
      : new Date();
    
    // Generate new dates array
    const newDates: string[] = [];
    for (let i = 0; i < count; i++) {
      const date = new Date(firstDate);
      date.setMonth(date.getMonth() + i);
      newDates.push(date.toISOString().split('T')[0]);
    }
    setEditInstallmentDates(newDates);
  };

  // Update a specific installment date
  const handleInstallmentDateChange = (index: number, newDate: string) => {
    setEditInstallmentDates(prev => {
      const updated = [...prev];
      updated[index] = newDate;
      return updated;
    });
  };

  // Save edited purchase
  const handleSaveEditPurchase = () => {
    if (!editPurchaseDescription.trim()) return;
    
    const originalInstallment = editPurchaseInstallments[0];
    const newTotalAmount = parseFloat(editPurchaseTotalAmount);
    const newInstallmentsCount = parseInt(editPurchaseInstallmentsCount);
    
    // Check if total amount or installments count changed
    const amountChanged = !isNaN(newTotalAmount) && newTotalAmount !== originalInstallment.totalAmount;
    const countChanged = !isNaN(newInstallmentsCount) && newInstallmentsCount !== editPurchaseInstallments.length;
    
    if (amountChanged || countChanged) {
      // Recreate installments with custom dates
      updatePurchase({
        installmentIds: editPurchaseInstallments.map(i => i.id),
        description: editPurchaseDescription.trim(),
        supplierName: editPurchaseSupplier.trim() || undefined,
        category: editPurchaseCategory.trim() || undefined,
        notes: editPurchaseNotes.trim() || undefined,
        totalAmount: amountChanged ? newTotalAmount : undefined,
        newInstallmentsCount: countChanged ? newInstallmentsCount : undefined,
        installmentDates: editInstallmentDates,
      });
    } else {
      // Just update common fields
      updatePurchase({
        installmentIds: editPurchaseInstallments.map(i => i.id),
        description: editPurchaseDescription.trim(),
        supplierName: editPurchaseSupplier.trim() || undefined,
        category: editPurchaseCategory.trim() || undefined,
        notes: editPurchaseNotes.trim() || undefined,
      });
    }
    
    setEditPurchaseOpen(false);
  };

  // Delete purchase
  const handleDeletePurchase = () => {
    if (editPurchaseInstallments.length === 0) return;
    deletePurchase(editPurchaseInstallments.map(i => i.id));
    setDeletePurchaseConfirmOpen(false);
    setEditPurchaseOpen(false);
  };

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

  // Pay commission handler
  const handlePayCommission = async () => {
    if (!sellerToPayCommission) return;
    
    setIsPayingCommission(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthName = format(new Date(year, month - 1), 'MMMM/yyyy', { locale: ptBR });
      
      addExpense({
        supplierId: '',
        supplierName: sellerToPayCommission.sellerName,
        description: `Comissão ${sellerToPayCommission.sellerName} - ${monthName}`,
        amount: sellerToPayCommission.commissionAmount,
        date: new Date().toISOString(),
        category: 'Comissão',
      });
      
      setCommissionPaymentOpen(false);
      setSellerToPayCommission(null);
    } finally {
      setIsPayingCommission(false);
    }
  };

  const openCommissionPaymentDialog = (seller: SellerCommission, e: React.MouseEvent) => {
    e.stopPropagation();
    setSellerToPayCommission(seller);
    setCommissionPaymentOpen(true);
  };

  // Toggle order selection for commission payment
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrdersForCommission(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Select/deselect all orders for a seller
  const toggleAllOrdersForSeller = (orders: ServiceOrder[], isSelected: boolean) => {
    setSelectedOrdersForCommission(prev => {
      const newSet = new Set(prev);
      orders.forEach(order => {
        if (isSelected) {
          newSet.delete(order.id);
        } else {
          newSet.add(order.id);
        }
      });
      return newSet;
    });
  };

  // Pay commission for selected orders
  const handlePaySelectedOrdersCommission = async () => {
    if (!selectedSeller || selectedOrdersForCommission.size === 0) return;
    
    setIsPayingOrderCommission(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthName = format(new Date(year, month - 1), 'MMMM/yyyy', { locale: ptBR });
      const commissionRate = commissionPercentage / 100;
      
      const selectedOrders = selectedSeller.orders.filter(o => selectedOrdersForCommission.has(o.id));
      const totalCommission = selectedOrders.reduce((sum, o) => sum + (o.amountPaid || 0) * commissionRate, 0);
      
      addExpense({
        supplierId: '',
        supplierName: selectedSeller.sellerName,
        description: `Comissão ${selectedSeller.sellerName} - ${monthName} (${selectedOrders.length} pedido${selectedOrders.length > 1 ? 's' : ''})`,
        amount: totalCommission,
        date: new Date().toISOString(),
        category: 'Comissão',
      });
      
      setSelectedOrdersForCommission(new Set());
    } finally {
      setIsPayingOrderCommission(false);
    }
  };

  // Pay commission for a single order
  const handlePaySingleOrderCommission = async () => {
    if (!orderToPayCommission) return;
    
    setIsPayingOrderCommission(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthName = format(new Date(year, month - 1), 'MMMM/yyyy', { locale: ptBR });
      const commissionRate = commissionPercentage / 100;
      const commissionAmount = (orderToPayCommission.amountPaid || 0) * commissionRate;
      
      addExpense({
        supplierId: '',
        supplierName: orderToPayCommission.sellerName || 'Vendedor',
        description: `Comissão pedido #${orderToPayCommission.id} - ${monthName}`,
        amount: commissionAmount,
        date: new Date().toISOString(),
        category: 'Comissão',
      });
      
      setOrderCommissionDialogOpen(false);
      setOrderToPayCommission(null);
    } finally {
      setIsPayingOrderCommission(false);
    }
  };

  // Open dialog to pay commission for a single order
  const openOrderCommissionDialog = (order: ServiceOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    setOrderToPayCommission(order);
    setOrderCommissionDialogOpen(true);
  };

  // Calculate total commission for selected orders
  const selectedOrdersCommissionTotal = useMemo(() => {
    if (!selectedSeller) return 0;
    const commissionRate = commissionPercentage / 100;
    return selectedSeller.orders
      .filter(o => selectedOrdersForCommission.has(o.id))
      .reduce((sum, o) => sum + (o.amountPaid || 0) * commissionRate, 0);
  }, [selectedSeller, selectedOrdersForCommission, commissionPercentage]);

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
          <Card 
            className="border-l-4 border-l-warning cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setStatsDialogOpen('total')}
          >
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

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setStatsDialogOpen('fornecedores')}
          >
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
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setStatsDialogOpen('comissoes')}
            >
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

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setStatsDialogOpen('compras')}
          >
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
        <Tabs defaultValue="parcelas">
          <TabsList className="flex-wrap">
            <TabsTrigger value="parcelas" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Parcelas
              {pendingInstallments.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {pendingInstallments.length}
                </Badge>
              )}
            </TabsTrigger>
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

          {/* Pending Installments Tab */}
          <TabsContent value="parcelas">
            <div className="space-y-4">
              {/* Summary Card */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-destructive" />
                      Compras Parceladas
                    </span>
                    <Badge variant="destructive" className="text-base px-3">
                      R$ {totalPendingAmount.toFixed(2)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {groupedPendingInstallments.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <CreditCard className="w-10 h-10 mx-auto mb-2 text-success opacity-50" />
                      <p className="text-sm font-medium text-success">Nenhuma parcela pendente!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupedPendingInstallments.map((group) => {
                        const isOverdue = new Date(group.nextDueDate) < new Date();
                        return (
                          <div 
                            key={group.key}
                            className={`flex items-center justify-between p-3 rounded-lg bg-background border hover:shadow-md transition-all cursor-pointer ${isOverdue ? 'border-destructive/50' : ''}`}
                            onClick={() => {
                              setSelectedGroupedInstallments(group.installments);
                              setGroupedInstallmentsOpen(true);
                            }}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isOverdue ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                                <CreditCard className={`h-5 w-5 ${isOverdue ? 'text-destructive' : 'text-warning'}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{group.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  <Badge variant="secondary" className="mr-2 text-xs">
                                    {group.pendingCount} parcela{group.pendingCount > 1 ? 's' : ''} pendente{group.pendingCount > 1 ? 's' : ''}
                                  </Badge>
                                  <span className={`${isOverdue ? 'text-destructive font-semibold' : ''}`}>
                                    Próx. venc: {format(new Date(group.nextDueDate), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                  {group.supplierName && ` • ${group.supplierName}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="font-bold text-destructive text-lg whitespace-nowrap">
                                  R$ {group.totalPending.toFixed(2)}
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  Total: R$ {group.totalAmount.toFixed(2)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPurchase(group.installments);
                                }}
                                title="Editar compra"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditPurchaseInstallments(group.installments);
                                  setDeletePurchaseConfirmOpen(true);
                                }}
                                title="Excluir compra"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Ver parcelas"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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
                    <TableHead className="font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
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
                          <TableCell className="font-medium">{expense.description.replace(/\s*\[.*\]$/, '')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {expense.supplierId ? (
                                <>
                                  <Truck className="h-4 w-4 text-primary" />
                                  <span>{expense.supplierName}</span>
                                </>
                              ) : expense.category === 'Gasto Fixo' ? (
                                <>
                                  <CalendarDays className="h-4 w-4 text-warning" />
                                  <span className="text-warning">Gasto Fixo</span>
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
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingExpense({
                                    id: expense.id,
                                    description: expense.description.replace(/\s*\[.*\]$/, ''),
                                    amount: expense.amount.toFixed(2),
                                    category: expense.category || '',
                                    supplierName: expense.supplierName || '',
                                  });
                                  setEditExpenseOpen(true);
                                }}
                                title="Editar despesa"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setExpenseToDeleteId(expense.id);
                                  setDeleteExpenseConfirmOpen(true);
                                }}
                                title="Excluir despesa"
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
              {/* Pending to Pay Section */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      Contas a Pagar
                    </span>
                    <Badge variant="destructive" className="text-base px-3">
                      R$ {totalPendingFixedExpenses.toFixed(2)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingFixedExpenses.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <DollarSign className="w-10 h-10 mx-auto mb-2 text-success opacity-50" />
                      <p className="text-sm font-medium text-success">Todas as contas estão pagas!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingFixedExpenses.map((item, index) => (
                        <div 
                          key={`${item.expense.id}-${item.dueDate.getTime()}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-background border hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                              <CalendarDays className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                              <p className="font-medium">{item.expense.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Vencimento: <span className="font-semibold text-destructive">{item.monthLabel}</span> • {item.expense.category}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-destructive text-lg">
                              R$ {item.expense.amount.toFixed(2)}
                            </span>
                            <Button 
                              size="sm"
                              className="bg-success hover:bg-success/90 text-success-foreground gap-1"
                              onClick={() => handlePayFixedExpense(item.expense)}
                              disabled={payingExpenseId === item.expense.id}
                            >
                              <DollarSign className="h-4 w-4" />
                              {payingExpenseId === item.expense.id ? 'Pagando...' : 'Pagar'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* All Fixed Expenses Management */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Gerenciar Gastos Fixos</h3>
                  <p className="text-sm text-muted-foreground">
                    Total cadastrado: R$ {totalFixedExpenses.toFixed(2)}/mês
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
                      <TableHead className="font-semibold text-center">Status</TableHead>
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
                      fixedExpenses.map((expense) => {
                        const today = new Date();
                        const isPaidThisMonth = isFixedExpensePaidForMonth(expense.id, today.getMonth(), today.getFullYear());
                        return (
                          <TableRow 
                            key={expense.id}
                            className={`hover:bg-hover/10 transition-all ${!expense.active ? 'opacity-50' : ''}`}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isPaidThisMonth ? 'bg-success/10' : 'bg-primary/10'}`}>
                                  <CalendarDays className={`h-5 w-5 ${isPaidThisMonth ? 'text-success' : 'text-primary'}`} />
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
                              {!expense.active ? (
                                <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                              ) : isPaidThisMonth ? (
                                <Badge className="bg-success/10 text-success border-success/30">Pago este mês</Badge>
                              ) : (
                                <Badge variant="destructive">Pendente</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {expense.active && !isPaidThisMonth && (
                                  <Button 
                                    size="sm"
                                    className="bg-success hover:bg-success/90 text-success-foreground"
                                    onClick={() => handlePayFixedExpense(expense)}
                                    disabled={payingExpenseId === expense.id}
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                )}
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
                        );
                      })
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
                              <div className="flex items-center justify-end gap-2">
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
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={(e) => openCommissionPaymentDialog(seller, e)}
                                >
                                  <Wallet className="h-4 w-4 mr-1" />
                                  Pagar
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
                          <p className="font-medium">{expense.description.replace(/\s*\[.*\]$/, '')}</p>
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
        <Dialog open={sellerDetailsOpen} onOpenChange={(open) => {
          setSellerDetailsOpen(open);
          if (!open) setSelectedOrdersForCommission(new Set());
        }}>
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

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 gap-2"
                    onClick={(e) => openCommissionPaymentDialog(selectedSeller, e)}
                  >
                    <Wallet className="h-4 w-4" />
                    Pagar Todas Comissões
                  </Button>
                  {selectedOrdersForCommission.size > 0 && (
                    <Button 
                      variant="outline"
                      className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
                      onClick={handlePaySelectedOrdersCommission}
                      disabled={isPayingOrderCommission}
                    >
                      <DollarSign className="h-4 w-4" />
                      {isPayingOrderCommission 
                        ? 'Pagando...' 
                        : `Pagar Selecionados (${selectedOrdersForCommission.size}) - R$ ${selectedOrdersCommissionTotal.toFixed(2)}`
                      }
                    </Button>
                  )}
                </div>

                {/* Orders List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Vendas do Período</h4>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAllOrdersForSeller(
                          selectedSeller.orders, 
                          selectedOrdersForCommission.size === selectedSeller.orders.length
                        )}
                      >
                        {selectedOrdersForCommission.size === selectedSeller.orders.length 
                          ? 'Desmarcar Todos' 
                          : 'Selecionar Todos'
                        }
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {selectedSeller.orders.map((order) => {
                      const commission = (order.amountPaid || 0) * (commissionPercentage / 100);
                      const isSelected = selectedOrdersForCommission.has(order.id);
                      return (
                        <div 
                          key={order.id} 
                          className={`flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                            isSelected ? 'border-green-500 bg-green-50/50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="h-4 w-4 rounded border-border text-green-600 focus:ring-green-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div 
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={() => handleViewOrderDetails(order)}
                            >
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
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Valor: R$ {(order.amountPaid || 0).toFixed(2)}
                              </p>
                              <p className="font-bold text-green-500">
                                Comissão: R$ {commission.toFixed(2)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={(e) => openOrderCommissionDialog(order, e)}
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSellerDetailsOpen(false);
                setSelectedOrdersForCommission(new Set());
              }}>
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

        {/* Installment Details Dialog */}
        <Dialog open={installmentDetailsOpen} onOpenChange={setInstallmentDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Detalhes da Parcela
              </DialogTitle>
            </DialogHeader>
            
            {selectedInstallment && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Descrição</p>
                    <p className="font-semibold">{selectedInstallment.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Parcela</p>
                      <p className="font-semibold">{selectedInstallment.installmentNumber} de {selectedInstallment.totalInstallments}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                      <p className="font-bold text-destructive">R$ {selectedInstallment.amount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Vencimento</p>
                      <p className="font-semibold">
                        {format(new Date(selectedInstallment.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="font-semibold">R$ {selectedInstallment.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  {selectedInstallment.supplierName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fornecedor</p>
                      <p className="font-semibold">{selectedInstallment.supplierName}</p>
                    </div>
                  )}

                  {selectedInstallment.category && (
                    <div>
                      <p className="text-sm text-muted-foreground">Categoria</p>
                      <Badge variant="outline">{selectedInstallment.category}</Badge>
                    </div>
                  )}

                  {selectedInstallment.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Observações</p>
                      <p className="text-sm">{selectedInstallment.notes}</p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setInstallmentDetailsOpen(false)}>
                    Fechar
                  </Button>
                  <Button 
                    className="bg-success hover:bg-success/90 text-success-foreground gap-2"
                    onClick={() => {
                      handlePayInstallment(selectedInstallment);
                      setInstallmentDetailsOpen(false);
                    }}
                    disabled={payingInstallmentId === selectedInstallment.id || isPayingInstallment}
                  >
                    <DollarSign className="h-4 w-4" />
                    Pagar Parcela
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog (with partial payment option) */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                Efetuar Pagamento
              </DialogTitle>
            </DialogHeader>
            
            {paymentItem && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">
                    {paymentType === 'fixed' 
                      ? (paymentItem as FixedExpense).name 
                      : (paymentItem as PendingInstallment).description}
                  </p>
                  {paymentType === 'installment' && (
                    <p className="text-sm text-muted-foreground">
                      Parcela {(paymentItem as PendingInstallment).installmentNumber}/{(paymentItem as PendingInstallment).totalInstallments}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Valor total: <span className="font-semibold text-foreground">
                      R$ {paymentType === 'fixed' 
                        ? (paymentItem as FixedExpense).amount.toFixed(2)
                        : (paymentItem as PendingInstallment).amount.toFixed(2)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="partial-payment">Pagamento parcial</Label>
                  <Switch
                    id="partial-payment"
                    checked={isPartialPayment}
                    onCheckedChange={(checked) => {
                      setIsPartialPayment(checked);
                      if (!checked) {
                        const fullAmount = paymentType === 'fixed' 
                          ? (paymentItem as FixedExpense).amount 
                          : (paymentItem as PendingInstallment).amount;
                        setPaymentAmount(fullAmount.toFixed(2));
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Valor a pagar (R$)</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    disabled={!isPartialPayment}
                    className="text-lg font-bold"
                  />
                </div>

                {isPartialPayment && paymentType === 'installment' && (
                  <p className="text-xs text-warning flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Pagamento parcial não marca a parcela como paga
                  </p>
                )}

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    className="bg-success hover:bg-success/90 text-success-foreground gap-2"
                    onClick={handleConfirmPayment}
                    disabled={parseFloat(paymentAmount) <= 0}
                  >
                    <DollarSign className="h-4 w-4" />
                    Confirmar Pagamento
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Grouped Installments Dialog */}
        <Dialog open={groupedInstallmentsOpen} onOpenChange={setGroupedInstallmentsOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Parcelas do Pedido
              </DialogTitle>
            </DialogHeader>
            
            {selectedGroupedInstallments.length > 0 && (
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="bg-muted/50 rounded-lg p-3 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">{selectedGroupedInstallments[0].description}</p>
                    {selectedGroupedInstallments[0].supplierName && (
                      <p className="text-sm text-muted-foreground">
                        Fornecedor: {selectedGroupedInstallments[0].supplierName}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Valor total da compra: <span className="font-semibold">R$ {selectedGroupedInstallments[0].totalAmount.toFixed(2)}</span>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setGroupedInstallmentsOpen(false);
                      handleEditPurchase(selectedGroupedInstallments);
                    }}
                    title="Editar compra"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Parcelas pendentes ({selectedGroupedInstallments.length})
                  </p>
                  {selectedGroupedInstallments.map((installment) => {
                    const isOverdue = new Date(installment.dueDate) < new Date();
                    return (
                      <div 
                        key={installment.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${isOverdue ? 'border-destructive/50 bg-destructive/5' : 'bg-background'}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {installment.installmentNumber}/{installment.totalInstallments}
                            </Badge>
                            <span className={`text-sm ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                              Venc: {format(new Date(installment.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">Vencida</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-destructive">
                            R$ {installment.amount.toFixed(2)}
                          </span>
                          <Button 
                            size="sm"
                            className="bg-success hover:bg-success/90 text-success-foreground gap-1"
                            onClick={() => handlePayInstallment(installment)}
                            disabled={payingInstallmentId === installment.id || isPayingInstallment}
                          >
                            <DollarSign className="h-4 w-4" />
                            {payingInstallmentId === installment.id ? '...' : 'Pagar'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t pt-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total pendente</p>
                    <p className="font-bold text-lg text-destructive">
                      R$ {selectedGroupedInstallments.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setGroupedInstallmentsOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Purchase Dialog */}
        <Dialog open={editPurchaseOpen} onOpenChange={setEditPurchaseOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                Editar Compra
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-description">Descrição *</Label>
                  <Input
                    id="edit-description"
                    value={editPurchaseDescription}
                    onChange={(e) => setEditPurchaseDescription(e.target.value)}
                    placeholder="Descrição da compra"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-supplier">Fornecedor</Label>
                  <Input
                    id="edit-supplier"
                    value={editPurchaseSupplier}
                    onChange={(e) => setEditPurchaseSupplier(e.target.value)}
                    placeholder="Nome do fornecedor"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Input
                    id="edit-category"
                    value={editPurchaseCategory}
                    onChange={(e) => setEditPurchaseCategory(e.target.value)}
                    placeholder="Categoria"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Input
                    id="edit-notes"
                    value={editPurchaseNotes}
                    onChange={(e) => setEditPurchaseNotes(e.target.value)}
                    placeholder="Observações"
                  />
                </div>
              </div>

              {/* Total amount and installments count */}
              <div className="space-y-3 border-t pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-total-amount">Valor Total (R$)</Label>
                    <Input
                      id="edit-total-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editPurchaseTotalAmount}
                      onChange={(e) => setEditPurchaseTotalAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-installments-count">Nº de Parcelas</Label>
                    <Input
                      id="edit-installments-count"
                      type="number"
                      min="1"
                      max="48"
                      value={editPurchaseInstallmentsCount}
                      onChange={(e) => handleInstallmentsCountChange(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* Installment dates */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Datas das Parcelas</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {Array.from({ length: parseInt(editPurchaseInstallmentsCount) || 0 }, (_, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <Badge variant="outline" className="shrink-0 min-w-[60px] justify-center">
                          {index + 1}/{editPurchaseInstallmentsCount}
                        </Badge>
                        <Input
                          type="date"
                          value={editInstallmentDates[index] || ""}
                          onChange={(e) => handleInstallmentDateChange(index, e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview of calculated installment value */}
                {parseFloat(editPurchaseTotalAmount) > 0 && parseInt(editPurchaseInstallmentsCount) > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Valor por parcela:</p>
                    <p className="text-lg font-bold text-foreground">
                      R$ {(parseFloat(editPurchaseTotalAmount) / parseInt(editPurchaseInstallmentsCount)).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {parseInt(editPurchaseInstallmentsCount)}x de R$ {(parseFloat(editPurchaseTotalAmount) / parseInt(editPurchaseInstallmentsCount)).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <Button 
                variant="destructive" 
                className="w-full gap-2"
                onClick={() => setDeletePurchaseConfirmOpen(true)}
                disabled={isDeletingPurchase}
              >
                <Trash2 className="h-4 w-4" />
                Excluir Compra
              </Button>
              
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setEditPurchaseOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveEditPurchase}
                  disabled={!editPurchaseDescription.trim() || isUpdatingPurchase}
                >
                  {isUpdatingPurchase ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Purchase Confirmation */}
        <AlertDialog open={deletePurchaseConfirmOpen} onOpenChange={setDeletePurchaseConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Compra</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta compra? Todas as {editPurchaseInstallments.length} parcela{editPurchaseInstallments.length > 1 ? 's' : ''} serão removidas. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeletePurchase} 
                className="bg-destructive hover:bg-destructive/90"
                disabled={isDeletingPurchase}
              >
                {isDeletingPurchase ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Commission Payment Confirmation Dialog */}
        <AlertDialog open={commissionPaymentOpen} onOpenChange={setCommissionPaymentOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-500" />
                Pagar Comissão
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>Confirmar pagamento de comissão para:</p>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendedor:</span>
                      <span className="font-medium text-foreground">{sellerToPayCommission?.sellerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Período:</span>
                      <span className="font-medium text-foreground">
                        {format(new Date(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg pt-2 border-t">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-bold text-green-500">
                        R$ {sellerToPayCommission?.commissionAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Este valor será registrado como despesa e debitado do fluxo de caixa.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handlePayCommission}
                className="bg-green-600 hover:bg-green-700"
                disabled={isPayingCommission}
              >
                {isPayingCommission ? 'Pagando...' : 'Confirmar Pagamento'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Single Order Commission Payment Confirmation Dialog */}
        <AlertDialog open={orderCommissionDialogOpen} onOpenChange={setOrderCommissionDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-500" />
                Pagar Comissão do Pedido
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>Confirmar pagamento de comissão para:</p>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pedido:</span>
                      <span className="font-medium text-foreground">#{orderToPayCommission?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium text-foreground">{orderToPayCommission?.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendedor:</span>
                      <span className="font-medium text-foreground">{orderToPayCommission?.sellerName || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor do Pedido:</span>
                      <span className="font-medium text-foreground">
                        R$ {(orderToPayCommission?.amountPaid || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg pt-2 border-t">
                      <span className="text-muted-foreground">Comissão ({commissionPercentage}%):</span>
                      <span className="font-bold text-green-500">
                        R$ {((orderToPayCommission?.amountPaid || 0) * (commissionPercentage / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Este valor será registrado como despesa e debitado do fluxo de caixa.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handlePaySingleOrderCommission}
                className="bg-green-600 hover:bg-green-700"
                disabled={isPayingOrderCommission}
              >
                {isPayingOrderCommission ? 'Pagando...' : 'Confirmar Pagamento'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Stats Cards Dialog */}
        <Dialog open={!!statsDialogOpen} onOpenChange={(open) => !open && setStatsDialogOpen(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {statsDialogOpen === 'total' && (
                  <>
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Total a Pagar
                  </>
                )}
                {statsDialogOpen === 'fornecedores' && (
                  <>
                    <Truck className="w-5 h-5 text-primary" />
                    Fornecedores
                  </>
                )}
                {statsDialogOpen === 'comissoes' && (
                  <>
                    <Percent className="w-5 h-5 text-green-500" />
                    Comissões
                  </>
                )}
                {statsDialogOpen === 'compras' && (
                  <>
                    <ArrowDownCircle className="w-5 h-5 text-muted-foreground" />
                    Compras
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Total a Pagar - Resumo */}
            {statsDialogOpen === 'total' && (
              <div className="space-y-4">
                <div className="bg-warning/10 p-4 rounded-lg border border-warning/20">
                  <p className="text-sm text-muted-foreground">Total Geral</p>
                  <p className="text-3xl font-bold text-warning">R$ {(totalPayable + totalCommissionPayable).toFixed(2)}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-4 h-4 text-primary" />
                      <p className="text-sm text-muted-foreground">Fornecedores</p>
                    </div>
                    <p className="text-xl font-bold text-foreground">R$ {totalPayable.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{suppliersWithBalance.length} fornecedor(es)</p>
                  </div>
                  
                  {usesCommission && (
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-1">
                        <Percent className="w-4 h-4 text-green-500" />
                        <p className="text-sm text-muted-foreground">Comissões</p>
                      </div>
                      <p className="text-xl font-bold text-green-500">R$ {totalCommissionPayable.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{sellerCommissions.length} vendedor(es)</p>
                    </div>
                  )}
                </div>

                {suppliersWithBalance.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Detalhamento Fornecedores:</p>
                    {suppliersWithBalance.map(s => (
                      <div 
                        key={s.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => { setStatsDialogOpen(null); handleViewDetails(s.id); }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{s.name}</span>
                        </div>
                        <span className="font-bold text-destructive">R$ {s.balance.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {usesCommission && sellerCommissions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Detalhamento Comissões:</p>
                    {sellerCommissions.map(s => (
                      <div 
                        key={s.sellerId} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => { setStatsDialogOpen(null); handleViewSellerDetails(s); }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-green-500" />
                          </div>
                          <div>
                            <span className="font-medium">{s.sellerName}</span>
                            <p className="text-xs text-muted-foreground">{s.ordersCount} pedido(s)</p>
                          </div>
                        </div>
                        <span className="font-bold text-green-500">R$ {s.commissionAmount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fornecedores */}
            {statsDialogOpen === 'fornecedores' && (
              <div className="space-y-4">
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground">Total Fornecedores</p>
                  <p className="text-3xl font-bold text-foreground">R$ {totalPayable.toFixed(2)}</p>
                </div>
                
                {suppliersWithBalance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhum saldo pendente com fornecedores</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suppliersWithBalance.map(s => (
                      <div 
                        key={s.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => { setStatsDialogOpen(null); handleViewDetails(s.id); }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium">{s.name}</span>
                            <p className="text-xs text-muted-foreground">{s.expenseCount} compra(s)</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-destructive">R$ {s.balance.toFixed(2)}</span>
                          <p className="text-xs text-muted-foreground">Clique para detalhes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comissões */}
            {statsDialogOpen === 'comissoes' && (
              <div className="space-y-4">
                <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                  <p className="text-sm text-muted-foreground">Total Comissões - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: ptBR })}</p>
                  <p className="text-3xl font-bold text-green-500">R$ {totalCommissionPayable.toFixed(2)}</p>
                </div>
                
                {sellerCommissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Percent className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma comissão pendente no período</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sellerCommissions.map(s => (
                      <div 
                        key={s.sellerId} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => { setStatsDialogOpen(null); handleViewSellerDetails(s); }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <span className="font-medium">{s.sellerName}</span>
                            <p className="text-xs text-muted-foreground">{s.ordersCount} pedido(s) • Total: R$ {s.totalSales.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-green-500">R$ {s.commissionAmount.toFixed(2)}</span>
                          <p className="text-xs text-muted-foreground">{commissionPercentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Compras */}
            {statsDialogOpen === 'compras' && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Total de Compras</p>
                  <p className="text-3xl font-bold text-foreground">{expenses.filter(e => e.supplierId).length}</p>
                </div>
                
                {expenses.filter(e => e.supplierId).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma compra registrada</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {expenses.filter(e => e.supplierId).slice(0, 20).map(exp => (
                      <div 
                        key={exp.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => { 
                          setStatsDialogOpen(null); 
                          const supplier = suppliers.find(s => s.id === exp.supplierId);
                          if (supplier) handleViewDetails(supplier.id);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="font-medium">{exp.description}</span>
                            <p className="text-xs text-muted-foreground">
                              {exp.supplierName || 'Sem fornecedor'} • {format(new Date(exp.date), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-foreground">R$ {exp.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {expenses.filter(e => e.supplierId).length > 20 && (
                      <p className="text-center text-xs text-muted-foreground py-2">
                        Mostrando 20 de {expenses.filter(e => e.supplierId).length} compras
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Expense Confirmation Dialog */}
        <AlertDialog open={deleteExpenseConfirmOpen} onOpenChange={setDeleteExpenseConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setExpenseToDeleteId(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (expenseToDeleteId) {
                    deleteExpense(expenseToDeleteId);
                    setExpenseToDeleteId(null);
                    setDeleteExpenseConfirmOpen(false);
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Expense Dialog */}
        <Dialog open={editExpenseOpen} onOpenChange={setEditExpenseOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Despesa</DialogTitle>
            </DialogHeader>
            {editingExpense && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-expense-description">Descrição</Label>
                  <Input
                    id="edit-expense-description"
                    value={editingExpense.description}
                    onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                    placeholder="Descrição da despesa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expense-amount">Valor (R$)</Label>
                  <Input
                    id="edit-expense-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expense-category">Categoria</Label>
                  <Input
                    id="edit-expense-category"
                    value={editingExpense.category}
                    onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                    placeholder="Ex: Equipamento, Material, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expense-supplier">Fornecedor</Label>
                  <Input
                    id="edit-expense-supplier"
                    value={editingExpense.supplierName}
                    onChange={(e) => setEditingExpense({ ...editingExpense, supplierName: e.target.value })}
                    placeholder="Nome do fornecedor"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditExpenseOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (editingExpense) {
                    updateExpense({
                      id: editingExpense.id,
                      description: editingExpense.description,
                      amount: parseFloat(editingExpense.amount) || 0,
                      category: editingExpense.category,
                      supplierName: editingExpense.supplierName,
                    });
                    setEditExpenseOpen(false);
                    setEditingExpense(null);
                  }
                }}
                disabled={isUpdatingExpense || !editingExpense?.description.trim()}
              >
                {isUpdatingExpense ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
