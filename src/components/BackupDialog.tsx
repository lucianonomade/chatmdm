import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, FileJson, Loader2, Clock, Settings2, Upload, AlertTriangle, Trash2, Cloud, Database } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSupabaseCustomers } from "@/hooks/useSupabaseCustomers";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { useSupabaseFixedExpenses } from "@/hooks/useSupabaseFixedExpenses";
import { useAutoBackup } from "@/hooks/useAutoBackup";
import { exportToExcel, exportToJSON, parseJSONBackup, getBackupStats } from "@/lib/backupUtils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

interface BackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackupDialog({ open, onOpenChange }: BackupDialogProps) {
  const { authUser } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  const [localBackups, setLocalBackupsList] = useState<any[]>([]);
  const [cloudBackups, setCloudBackups] = useState<any[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [importToCloud, setImportToCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { companySettings, restoreBackup } = useStore();
  const { customers, addCustomer } = useSupabaseCustomers();
  const { products, addProduct } = useSupabaseProducts();
  const { suppliers, addSupplier } = useSupabaseSuppliers();
  const { orders, addOrder } = useSupabaseOrders();
  const { expenses, addExpense } = useSupabaseExpenses();
  const { fixedExpenses, addFixedExpense } = useSupabaseFixedExpenses();

  const {
    performBackup,
    getAutoBackupEnabled,
    setAutoBackupEnabled,
    getBackupOnClose,
    setBackupOnClose,
    getBackupInterval,
    setBackupInterval,
    getLastBackupTime,
    startScheduledBackup,
  } = useAutoBackup();

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [backupOnClose, setBackupOnCloseState] = useState(true);
  const [interval, setIntervalState] = useState("24");
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAutoEnabled(getAutoBackupEnabled());
      setBackupOnCloseState(getBackupOnClose());
      setIntervalState(String(getBackupInterval()));
      setLastBackup(getLastBackupTime());

      import('@/lib/backupUtils').then(({ getLocalBackups }) => {
        setLocalBackupsList(getLocalBackups());
      });

      fetchCloudBackups();
    }
  }, [open]);

  const fetchCloudBackups = async () => {
    if (!authUser?.tenant_id) return;
    setLoadingCloud(true);
    const { data } = await supabase
      .from('backups')
      .select('id, created_at, name, trigger_type')
      .eq('tenant_id', authUser.tenant_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setCloudBackups(data);
    setLoadingCloud(false);
  };

  const handleRestoreCloud = async (id: string) => {
    const { data } = await supabase
      .from('backups')
      .select('data')
      .eq('id', id)
      .single();

    if (data?.data) {
      setPendingBackupData(data.data);
      setShowRestoreConfirm(true);
    } else {
      toast.error('Erro ao baixar backup da nuvem');
    }
  };

  const handleDeleteCloud = async (id: string) => {
    const { error } = await supabase
      .from('backups')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir backup');
    } else {
      setCloudBackups(prev => prev.filter(b => b.id !== id));
      toast.success('Backup excluído da nuvem');
    }
  };

  const handleExport = async (format: 'excel' | 'json') => {
    setExporting(true);

    try {
      const data = {
        customers,
        products,
        suppliers,
        orders,
        expenses,
        fixedExpenses,
      };

      if (format === 'excel') {
        exportToExcel(data, companySettings.name);
      } else {
        exportToJSON(data, companySettings.name);
      }

      // Update last backup time
      const now = new Date().toISOString();
      localStorage.setItem('lastBackupTime', now);
      setLastBackup(now);

      toast.success(`Backup exportado com sucesso!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Por favor, selecione um arquivo JSON válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseJSONBackup(content);

      if (!parsed) {
        toast.error('Arquivo de backup inválido ou corrompido');
        return;
      }

      setPendingBackupData(parsed);
      setShowRestoreConfirm(true);
    };
    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo');
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRestore = async () => {
    if (!pendingBackupData) return;

    setRestoring(true);
    try {
      // 1. Local restoration
      restoreBackup(pendingBackupData);

      // 2. Cloud restoration (if selected)
      if (importToCloud) {
        toast.info("Importando para a nuvem... obtendo dados existentes...");

        // Fetch existing data for robust deduplication
        const { data: existingCustomersData } = await supabase
          .from('customers')
          .select('name, doc')
          .eq('tenant_id', authUser?.tenant_id || '');

        const { data: existingSuppliersData } = await supabase
          .from('suppliers')
          .select('name')
          .eq('tenant_id', authUser?.tenant_id || '');

        const { data: existingProductsData } = await supabase
          .from('products')
          .select('name')
          .eq('tenant_id', authUser?.tenant_id || '');

        const { data: existingFixedExpensesData } = await supabase
          .from('fixed_expenses')
          .select('name')
          .eq('tenant_id', authUser?.tenant_id || '');

        const existingCustomerDocs = new Set(existingCustomersData?.map(c => c.doc).filter(Boolean));
        const existingCustomerNames = new Set(existingCustomersData?.map(c => c.name));
        const existingSupplierNames = new Set(existingSuppliersData?.map(s => s.name));
        const existingProductNames = new Set(existingProductsData?.map(p => p.name));
        const existingFixedExpenseNames = new Set(existingFixedExpensesData?.map(f => f.name));

        toast.info("Iniciando importação...");

        // Import Customers
        if (pendingBackupData.customers?.length > 0) {
          let addedCount = 0;
          for (const customer of pendingBackupData.customers) {
            // Check if customer already exists (by Document or Name)
            const exists =
              (customer.doc && existingCustomerDocs.has(customer.doc)) ||
              existingCustomerNames.has(customer.name);

            if (!exists) {
              const { id, ...rest } = customer;
              await addCustomer(rest);
              // Update local sets to prevent duplicates within the same import batch
              existingCustomerNames.add(customer.name);
              if (customer.doc) existingCustomerDocs.add(customer.doc);
              addedCount++;
            }
          }
          if (addedCount > 0) toast.success(`${addedCount} clientes importados!`);
        }

        // Import Suppliers
        if (pendingBackupData.suppliers?.length > 0) {
          let addedCount = 0;
          for (const supplier of pendingBackupData.suppliers) {
            // Check if supplier already exists by Name
            const exists = existingSupplierNames.has(supplier.name);

            if (!exists) {
              const { id, ...rest } = supplier;
              await addSupplier(rest);
              existingSupplierNames.add(supplier.name);
              addedCount++;
            }
          }
          if (addedCount > 0) toast.success(`${addedCount} fornecedores importados!`);
        }

        // Import Products
        if (pendingBackupData.products?.length > 0) {
          let addedCount = 0;
          for (const product of pendingBackupData.products) {
            // Check if product already exists by Name
            const exists = existingProductNames.has(product.name);

            if (!exists) {
              const { id, ...rest } = product;
              await addProduct(rest);
              existingProductNames.add(product.name);
              addedCount++;
            }
          }
          if (addedCount > 0) toast.success(`${addedCount} produtos importados!`);
        }

        // Import Orders
        if (pendingBackupData.orders?.length > 0) {
          let addedCount = 0;
          for (const order of pendingBackupData.orders) {
            // Check if order likely exists (by Date and Total and Customer Name) - relying on local check for now as fetching all orders is heavy
            const exists = orders.some(o =>
              new Date(o.createdAt).getTime() === new Date(order.createdAt).getTime() &&
              o.total === order.total &&
              o.customerName === order.customerName
            );

            if (!exists) {
              await addOrder(order);
              addedCount++;
            }
          }
          if (addedCount > 0) toast.success(`${addedCount} pedidos importados!`);
        }

        // Import Expenses
        if (pendingBackupData.expenses?.length > 0) {
          let addedCount = 0;
          for (const expense of pendingBackupData.expenses) {
            const exists = expenses.some(e =>
              e.description === expense.description &&
              e.amount === expense.amount &&
              e.date === expense.date
            );

            if (!exists) {
              const { id, ...rest } = expense;
              await addExpense(rest);
              addedCount++;
            }
          }
          if (addedCount > 0) toast.success(`${addedCount} despesas importadas!`);
        }

        // Import Fixed Expenses
        if (pendingBackupData.fixedExpenses?.length > 0) {
          let addedCount = 0;
          for (const fixed of pendingBackupData.fixedExpenses) {
            const exists = existingFixedExpenseNames.has(fixed.name);

            if (!exists) {
              const { id, ...rest } = fixed;
              await addFixedExpense(rest);
              existingFixedExpenseNames.add(fixed.name);
              addedCount++;
            }
          }
          if (addedCount > 0) toast.success(`${addedCount} gastos fixos importados!`);
        }
      }

      toast.success('Backup restaurado com sucesso! Recarregando...');
      setShowRestoreConfirm(false);
      onOpenChange(false);

      // Reload page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Erro ao restaurar backup');
    } finally {
      setRestoring(false);
    }
  };

  const handleAutoBackupChange = (enabled: boolean) => {
    setAutoEnabled(enabled);
    setAutoBackupEnabled(enabled);
    if (enabled) {
      startScheduledBackup();
      toast.success("Backup automático ativado");
    } else {
      toast.info("Backup automático desativado");
    }
  };

  const handleBackupOnCloseChange = (enabled: boolean) => {
    setBackupOnCloseState(enabled);
    setBackupOnClose(enabled);
  };

  const handleIntervalChange = (value: string) => {
    setIntervalState(value);
    setBackupInterval(parseInt(value, 10));
    if (autoEnabled) {
      startScheduledBackup();
    }
  };

  const stats = [
    { label: 'Clientes', count: customers.length },
    { label: 'Produtos', count: products.length },
    { label: 'Fornecedores', count: suppliers.length },
    { label: 'Pedidos', count: orders.length },
    { label: 'Despesas', count: expenses.length },
    { label: 'Gastos Fixos', count: fixedExpenses.length },
  ];

  const formatLastBackup = () => {
    if (!lastBackup) return "Nunca";
    try {
      return formatDistanceToNow(new Date(lastBackup), {
        addSuffix: true,
        locale: ptBR
      });
    } catch {
      return "Desconhecido";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-12 mt-2">
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Backup / Exportação
          </DialogTitle>
          <DialogDescription>
            Exporte e configure backups automáticos
          </DialogDescription>
        </DialogHeader>

        {/* Last backup info */}
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Último backup:</span>
          </div>
          <span className={`text-sm font-bold ${lastBackup ? 'text-primary' : 'text-muted-foreground'}`}>
            {formatLastBackup()}
          </span>
        </div>

        {/* Stats summary */}
        {/* Stats summary */}
        <div className="grid grid-cols-5 gap-3 py-4">
          {[
            { label: 'Clientes', count: customers.length },
            { label: 'Produtos', count: products.length },
            { label: 'Fornecedores', count: suppliers.length },
            { label: 'Pedidos', count: orders.length },
            { label: 'Despesas', count: expenses.length },
            { label: 'Gastos Fixos', count: fixedExpenses.length },
            { label: 'Categorias', count: new Set(products.map(p => p.category).filter(Boolean)).size },
            { label: 'Subcategorias', count: new Set(products.map(p => p.subcategory).filter(Boolean)).size },
            { label: 'Recebíveis', count: orders.filter(o => o.paymentStatus !== 'paid').length },
            { label: 'Parcelas', count: orders.reduce((acc, o) => acc + (o.payments?.length || 0), 0) },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center p-3 bg-muted/40 rounded-xl border border-border/50">
              <span className="text-xl font-bold text-foreground">{stat.count}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".json"
          className="hidden"
        />

        {/* Export options */}
        <div className="grid gap-3">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/60 text-emerald-900 hover:text-emerald-950 group transition-all"
            onClick={() => handleExport('excel')}
            disabled={exporting}
          >
            <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 mr-4 group-hover:scale-110 transition-transform">
              {exporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-5 w-5" />
              )}
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-base mb-0.5">Exportar Excel (.xlsx)</div>
              <div className="text-xs text-emerald-700/80 font-medium">
                Para visualização - compatível com Excel/Sheets
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 bg-blue-50/50 hover:bg-blue-50 border-blue-200/60 text-blue-900 hover:text-blue-950 group transition-all"
            onClick={() => handleExport('json')}
            disabled={exporting}
          >
            <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-4 group-hover:scale-110 transition-transform">
              {exporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileJson className="h-5 w-5" />
              )}
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-base mb-0.5">Exportar JSON (Recomendado)</div>
              <div className="text-xs text-blue-700/80 font-medium">
                Backup completo para restauração
              </div>
            </div>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-dashed border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium">
                Zona de Perigo
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 border-dashed border-orange-300 hover:bg-orange-50 hover:border-orange-400 text-orange-900 group transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
          >
            <div className="p-2 rounded-full bg-orange-100 text-orange-600 mr-4 group-hover:scale-110 transition-transform">
              {restoring ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-base mb-0.5">Restaurar Backup JSON</div>
              <div className="text-xs text-muted-foreground font-medium">
                Importar todos os dados de um backup anterior
              </div>
            </div>
          </Button>

          {localBackups.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Backups Automáticos Recentes (Local)
              </h4>
              <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                {localBackups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-2 bg-muted/30 rounded border text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {new Date(backup.date).toLocaleDateString('pt-BR')} {new Date(backup.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {backup.data.customers?.length || 0} clie, {backup.data.orders?.length || 0} ped
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setPendingBackupData(backup.data);
                          setShowRestoreConfirm(true);
                        }}
                      >
                        <Upload className="h-4 w-4 text-warning" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={async () => {
                          const { deleteLocalBackup } = await import('@/lib/backupUtils');
                          deleteLocalBackup(backup.id);
                          setLocalBackupsList(prev => prev.filter(b => b.id !== backup.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cloud Backups */}
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Cloud className="h-3 w-3" />
              Backups na Nuvem (Cloud)
              {loadingCloud && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
            </h4>

            {cloudBackups.length === 0 && !loadingCloud ? (
              <div className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded border border-dashed">
                Nenhum backup na nuvem encontrado
              </div>
            ) : (
              <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                {cloudBackups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-2 bg-blue-50/50 rounded border border-blue-100 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-blue-900">
                        {backup.name || 'Backup Automático'}
                      </span>
                      <span className="text-xs text-blue-700/70">
                        {new Date(backup.created_at).toLocaleDateString('pt-BR')} {new Date(backup.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {backup.trigger_type === 'auto' ? 'Automático' : 'Manual'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-blue-100 text-blue-700"
                        onClick={() => handleRestoreCloud(backup.id)}
                      >
                        <Database className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-100 text-red-500"
                        onClick={() => handleDeleteCloud(backup.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings toggle */}
        <div className="mt-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="h-4 w-4" />
            {showSettings ? "Ocultar configurações" : "Configurações de backup automático"}
          </Button>
        </div>

        {/* Auto backup settings */}
        {showSettings && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30 mt-2 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-backup">Backup Automático</Label>
                <p className="text-xs text-muted-foreground">
                  Realizar backup automaticamente
                </p>
              </div>
              <Switch
                id="auto-backup"
                checked={autoEnabled}
                onCheckedChange={handleAutoBackupChange}
              />
            </div>

            {autoEnabled && (
              <div className="space-y-2">
                <Label htmlFor="interval">Intervalo</Label>
                <Select value={interval} onValueChange={handleIntervalChange}>
                  <SelectTrigger id="interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="1">A cada 1 hora</SelectItem>
                    <SelectItem value="6">A cada 6 horas</SelectItem>
                    <SelectItem value="12">A cada 12 horas</SelectItem>
                    <SelectItem value="24">A cada 24 horas</SelectItem>
                    <SelectItem value="48">A cada 2 dias</SelectItem>
                    <SelectItem value="168">A cada semana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="backup-close">Backup ao Fechar</Label>
                <p className="text-xs text-muted-foreground">
                  Salvar dados ao fechar o navegador
                </p>
              </div>
              <Switch
                id="backup-close"
                checked={backupOnClose}
                onCheckedChange={handleBackupOnCloseChange}
              />
            </div>
          </div>
        )}
      </DialogContent>

      {/* Restore confirmation dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirmar Restauração
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta ação irá <strong>substituir todos os dados atuais</strong> pelos dados do backup.
                Isso não pode ser desfeito.
              </p>

              {pendingBackupData && (
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {getBackupStats(pendingBackupData).map((stat, i) => (
                    <div key={i} className="flex flex-col items-center justify-center p-2 bg-muted/40 rounded-lg border border-border/50">
                      <div className="text-lg font-bold text-foreground">{stat.count}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium text-center">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20 mt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="cloud-import" className="text-sm font-semibold">Sincronizar com Nuvem</Label>
                  <p className="text-xs text-muted-foreground">
                    Salvar dados também no banco de dados Supabase
                  </p>
                </div>
                <Switch
                  id="cloud-import"
                  checked={importToCloud}
                  onCheckedChange={setImportToCloud}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoring}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                'Restaurar Backup'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
