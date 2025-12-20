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
import { Download, FileSpreadsheet, FileJson, Loader2, Clock, Settings2, Upload, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSupabaseCustomers } from "@/hooks/useSupabaseCustomers";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useAutoBackup } from "@/hooks/useAutoBackup";
import { exportToExcel, exportToJSON, parseJSONBackup, getBackupStats } from "@/lib/backupUtils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<ReturnType<typeof parseJSONBackup>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { orders, expenses, fixedExpenses, companySettings, restoreBackup } = useStore();
  const { customers } = useSupabaseCustomers();
  const { products } = useSupabaseProducts();
  const { suppliers } = useSupabaseSuppliers();
  
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
    }
  }, [open]);

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
      restoreBackup(pendingBackupData);
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
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Último backup:</span>
          </div>
          <span className="text-sm font-medium">{formatLastBackup()}</span>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map(stat => (
            <div key={stat.label} className="text-center p-2 bg-muted rounded-lg">
              <div className="text-lg font-bold">{stat.count}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
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
        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4"
            onClick={() => handleExport('excel')}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-5 w-5 mr-3 text-success" />
            )}
            <div className="text-left">
              <div className="font-medium">Exportar Excel (.xlsx)</div>
              <div className="text-xs text-muted-foreground">
                Planilha compatível com Excel e Google Sheets
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4"
            onClick={() => handleExport('json')}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            ) : (
              <FileJson className="h-5 w-5 mr-3 text-info" />
            )}
            <div className="text-left">
              <div className="font-medium">Exportar JSON</div>
              <div className="text-xs text-muted-foreground">
                Formato técnico para importação futura
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
          >
            {restoring ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            ) : (
              <Upload className="h-5 w-5 mr-3 text-warning" />
            )}
            <div className="text-left">
              <div className="font-medium">Restaurar Backup JSON</div>
              <div className="text-xs text-muted-foreground">
                Importar dados de um arquivo de backup
              </div>
            </div>
          </Button>
        </div>

        {/* Settings toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center gap-2"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings2 className="h-4 w-4" />
          {showSettings ? "Ocultar configurações" : "Configurações de backup automático"}
        </Button>

        {/* Auto backup settings */}
        {showSettings && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
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
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {getBackupStats(pendingBackupData).map(stat => (
                    <div key={stat.label} className="text-center p-2 bg-muted rounded-lg">
                      <div className="text-lg font-bold">{stat.count}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
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
