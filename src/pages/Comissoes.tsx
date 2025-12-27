import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { DollarSign, TrendingUp, ShoppingCart, Calendar, Eye, Percent, AlertCircle, Users, User, Wallet } from "lucide-react";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { useSyncedCompanySettings } from "@/hooks/useSyncedCompanySettings";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceOrder } from "@/lib/types";
import { toast } from "sonner";

interface SellerCommission {
  sellerId: string;
  sellerName: string;
  totalSales: number;
  commissionAmount: number;
  ordersCount: number;
  orders: ServiceOrder[];
}

export default function Comissoes() {
  const { orders, isLoading: isLoadingOrders } = useSupabaseOrders();
  const { addExpense, isAdding: isAddingExpense } = useSupabaseExpenses();
  const { settings, isLoading: isLoadingSettings } = useSyncedCompanySettings();
  const { authUser } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerCommission | null>(null);
  const [sellerDialogOpen, setSellerDialogOpen] = useState(false);
  const [payCommissionDialogOpen, setPayCommissionDialogOpen] = useState(false);
  const [sellerToPay, setSellerToPay] = useState<SellerCommission | null>(null);
  const [isPayingCommission, setIsPayingCommission] = useState(false);

  const isAdmin = authUser?.role === 'admin';
  const isManager = authUser?.role === 'manager';
  const canViewAll = isAdmin || isManager;

  // Get all orders in selected month (filtered by user if not admin/manager)
  const filteredOrders = useMemo(() => {
    if (!authUser || !orders) return [];
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    
    return orders.filter(order => {
      // Filter by date
      const orderDate = parseISO(order.createdAt);
      const isInMonth = isWithinInterval(orderDate, { start: monthStart, end: monthEnd });
      
      // Only paid or partial orders count for commission
      const hasPaidAmount = (order.amountPaid || 0) > 0;
      
      // If admin/manager, show all orders; otherwise only show user's orders
      const isAccessible = canViewAll || order.sellerId === authUser.id;
      
      // Apply seller filter for admin/manager
      const matchesSeller = selectedSellerId === "all" || order.sellerId === selectedSellerId;
      
      return isInMonth && hasPaidAmount && isAccessible && matchesSeller;
    });
  }, [orders, authUser, selectedMonth, canViewAll, selectedSellerId]);

  // Get unique sellers for filter dropdown
  const sellers = useMemo(() => {
    if (!canViewAll || !orders) return [];
    
    const sellerMap = new Map<string, string>();
    orders.forEach(order => {
      if (order.sellerId && order.sellerName) {
        sellerMap.set(order.sellerId, order.sellerName);
      }
    });
    
    return Array.from(sellerMap.entries()).map(([id, name]) => ({ id, name }));
  }, [orders, canViewAll]);

  // Calculate commissions per seller (for admin/manager view) - now includes orders
  const sellerCommissions = useMemo((): SellerCommission[] => {
    if (!orders) return [];
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const commissionRate = (settings?.commissionPercentage || 0) / 100;
    
    const commissionMap = new Map<string, SellerCommission>();
    
    orders.forEach(order => {
      const orderDate = parseISO(order.createdAt);
      const isInMonth = isWithinInterval(orderDate, { start: monthStart, end: monthEnd });
      const hasPaidAmount = (order.amountPaid || 0) > 0;
      
      // For non-admin/manager, only include their own orders
      const isAccessible = canViewAll || order.sellerId === authUser?.id;
      
      if (isInMonth && hasPaidAmount && order.sellerId && isAccessible) {
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
  }, [orders, selectedMonth, settings, canViewAll, authUser]);

  // Calculate commission stats
  const stats = useMemo(() => {
    const commissionRate = (settings?.commissionPercentage || 0) / 100;
    
    const totalSales = filteredOrders.reduce((sum, order) => sum + (order.amountPaid || 0), 0);
    const totalCommission = totalSales * commissionRate;
    const ordersCount = filteredOrders.length;
    
    return {
      totalSales,
      totalCommission,
      ordersCount,
      commissionRate: settings?.commissionPercentage || 0,
    };
  }, [filteredOrders, settings]);

  const isLoading = isLoadingOrders || isLoadingSettings;

  const handleViewOrder = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setOrderDialogOpen(true);
  };

  const handleViewSellerOrders = (seller: SellerCommission) => {
    setSelectedSeller(seller);
    setSellerDialogOpen(true);
  };

  // Handle pay commission
  const handleOpenPayCommission = (seller: SellerCommission) => {
    setSellerToPay(seller);
    setPayCommissionDialogOpen(true);
  };

  const handlePayCommission = async () => {
    if (!sellerToPay) return;
    
    setIsPayingCommission(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthName = format(new Date(year, month - 1), 'MMMM/yyyy', { locale: ptBR });
      
      addExpense({
        supplierId: '',
        supplierName: 'Comissão',
        description: `Comissão de ${sellerToPay.sellerName} - ${monthName}`,
        amount: sellerToPay.commissionAmount,
        date: new Date().toISOString(),
        category: 'Comissão'
      });
      
      toast.success(`Comissão de R$ ${sellerToPay.commissionAmount.toFixed(2)} paga para ${sellerToPay.sellerName}`);
      setPayCommissionDialogOpen(false);
      setSellerToPay(null);
    } catch (error) {
      console.error('Error paying commission:', error);
      toast.error('Erro ao pagar comissão');
    } finally {
      setIsPayingCommission(false);
    }
  };

  // Check if commission is enabled
  if (!isLoading && !settings?.usesCommission) {
    return (
      <MainLayout title="Comissões">
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Comissões Desativadas</h3>
            <p className="text-muted-foreground max-w-md">
              O sistema de comissões não está ativado. {canViewAll 
                ? "Ative nas configurações para calcular comissões sobre as vendas."
                : "Entre em contato com o administrador para habilitar o cálculo de comissões sobre suas vendas."}
            </p>
          </div>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={canViewAll ? "Comissões dos Vendedores" : "Minhas Comissões"}>
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
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
          
          {canViewAll && sellers.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Vendedor:</span>
              </div>
              <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos vendedores</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total em Vendas</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-xl font-bold">
                    R$ {stats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comissão Total</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-xl font-bold text-green-500">
                    R$ {stats.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendas no Período</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-xl font-bold">{stats.ordersCount}</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Percent className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Comissão</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-xl font-bold">{stats.commissionRate}%</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Seller Summary Table (Admin/Manager only) */}
        {canViewAll && sellerCommissions.length > 0 && selectedSellerId === "all" && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Comissões por Vendedor</h3>
              </div>
              <Badge variant="secondary" className="text-base px-3 py-1">
                Total: R$ {sellerCommissions.reduce((sum, s) => sum + s.commissionAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-right">Total Vendido</TableHead>
                    <TableHead className="text-right">Comissão ({stats.commissionRate}%)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerCommissions.map((seller) => (
                    <TableRow 
                      key={seller.sellerId} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewSellerOrders(seller)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-green-500" />
                          </div>
                          {seller.sellerName}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{seller.ordersCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {seller.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-500">
                        R$ {seller.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewSellerOrders(seller);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            className="bg-success hover:bg-success/90 text-success-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPayCommission(seller);
                            }}
                          >
                            <Wallet className="h-4 w-4 mr-1" />
                            Pagar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Orders Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Vendas com Comissão</h3>
            <Button variant="outline" size="sm" onClick={() => setDetailsDialogOpen(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver Todas
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">Nenhuma venda no período</p>
              <p className="text-sm text-muted-foreground">
                {canViewAll 
                  ? "As vendas com pagamento aparecerão aqui."
                  : "Suas vendas com pagamento aparecerão aqui."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    {canViewAll && <TableHead>Vendedor</TableHead>}
                    <TableHead className="text-right">Valor Pago</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.slice(0, 10).map((order) => {
                    const commission = (order.amountPaid || 0) * (stats.commissionRate / 100);
                    return (
                      <TableRow 
                        key={order.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewOrder(order)}
                      >
                        <TableCell className="font-mono text-sm">{order.id}</TableCell>
                        <TableCell>
                          {format(parseISO(order.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        {canViewAll && <TableCell>{order.sellerName || '—'}</TableCell>}
                        <TableCell className="text-right">
                          R$ {(order.amountPaid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-green-500 font-medium">
                          R$ {commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewOrder(order);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredOrders.length > 10 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 10 de {filteredOrders.length} vendas. Clique em "Ver Todas" para ver todas.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
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
                <h4 className="font-semibold mb-3">Itens da Venda</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qtd: {item.quantity} x R$ {item.price.toFixed(2)}
                          {item.variationName && ` • ${item.variationName}`}
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de Comissão</span>
                  <span className="font-medium">{stats.commissionRate}%</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-green-500 pt-2 border-t">
                  <span>Comissão Gerada</span>
                  <span>R$ {((selectedOrder.amountPaid || 0) * (stats.commissionRate / 100)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seller Orders Dialog */}
      <Dialog open={sellerDialogOpen} onOpenChange={setSellerDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-500" />
              Vendas de {selectedSeller?.sellerName}
            </DialogTitle>
          </DialogHeader>

          {selectedSeller && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-muted-foreground text-xs">Total em Vendas</Label>
                  <p className="font-bold text-lg">
                    R$ {selectedSeller.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Número de Vendas</Label>
                  <p className="font-bold text-lg">{selectedSeller.ordersCount}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Comissão a Pagar ({stats.commissionRate}%)</Label>
                  <p className="font-bold text-lg text-green-500">
                    R$ {selectedSeller.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Orders List */}
              <div>
                <h4 className="font-semibold mb-3">Vendas do Período</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {selectedSeller.orders.map((order) => {
                    const commission = (order.amountPaid || 0) * (stats.commissionRate / 100);
                    return (
                      <div 
                        key={order.id} 
                        className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSellerDialogOpen(false);
                          handleViewOrder(order);
                        }}
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
                            Valor: R$ {(order.amountPaid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="font-bold text-green-500">
                            Comissão: R$ {commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
            <Button variant="outline" onClick={() => setSellerDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes de Comissões - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total em Vendas</p>
                <p className="text-lg font-bold">
                  R$ {stats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comissão Total ({stats.commissionRate}%)</p>
                <p className="text-lg font-bold text-green-500">
                  R$ {stats.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  {canViewAll && <TableHead>Vendedor</TableHead>}
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const commission = (order.amountPaid || 0) * (stats.commissionRate / 100);
                  return (
                    <TableRow 
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setDetailsDialogOpen(false);
                        handleViewOrder(order);
                      }}
                    >
                      <TableCell className="font-mono text-sm">{order.id}</TableCell>
                      <TableCell>
                        {format(parseISO(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      {canViewAll && <TableCell>{order.sellerName || '—'}</TableCell>}
                      <TableCell className="text-right">
                        R$ {(order.amountPaid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-green-500 font-medium">
                        R$ {commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Commission Confirmation Dialog */}
      <AlertDialog open={payCommissionDialogOpen} onOpenChange={setPayCommissionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-success" />
              Pagar Comissão
            </AlertDialogTitle>
            <AlertDialogDescription>
              {sellerToPay && (
                <div className="space-y-3 mt-2">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendedor:</span>
                      <span className="font-semibold text-foreground">{sellerToPay.sellerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Período:</span>
                      <span className="font-semibold text-foreground">
                        {format(new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1), 'MMMM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Vendido:</span>
                      <span className="font-semibold text-foreground">
                        R$ {sellerToPay.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-muted-foreground">Comissão a Pagar:</span>
                      <span className="font-bold text-success text-lg">
                        R$ {sellerToPay.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Este valor será registrado como despesa de comissão e debitado do fluxo de caixa.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPayingCommission}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePayCommission}
              disabled={isPayingCommission}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              {isPayingCommission ? 'Pagando...' : 'Confirmar Pagamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
