import { useEffect, useCallback, useRef } from "react";
import { useStore } from "@/lib/store";
import { useSupabaseCustomers } from "@/hooks/useSupabaseCustomers";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { exportToJSON } from "@/lib/backupUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const BACKUP_INTERVAL_KEY = 'autoBackupInterval'; // in hours
const LAST_BACKUP_KEY = 'lastBackupTime';
const AUTO_BACKUP_ENABLED_KEY = 'autoBackupEnabled';
const BACKUP_ON_CLOSE_KEY = 'backupOnClose';

export function useAutoBackup() {
  const { orders, expenses, fixedExpenses, companySettings, updateCompanySettings } = useStore();
  const { customers } = useSupabaseCustomers();
  const { authUser } = useAuth();
  const { products } = useSupabaseProducts();
  const { suppliers } = useSupabaseSuppliers();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get settings from localStorage
  const getAutoBackupEnabled = () => localStorage.getItem(AUTO_BACKUP_ENABLED_KEY) === 'true';
  const getBackupOnClose = () => localStorage.getItem(BACKUP_ON_CLOSE_KEY) !== 'false'; // default true
  const getBackupInterval = () => parseInt(localStorage.getItem(BACKUP_INTERVAL_KEY) || '24', 10);
  const getLastBackupTime = () => localStorage.getItem(LAST_BACKUP_KEY);

  // Set settings
  const setAutoBackupEnabled = (enabled: boolean) => {
    localStorage.setItem(AUTO_BACKUP_ENABLED_KEY, String(enabled));
  };

  const setBackupOnClose = (enabled: boolean) => {
    localStorage.setItem(BACKUP_ON_CLOSE_KEY, String(enabled));
  };

  const setBackupInterval = (hours: number) => {
    localStorage.setItem(BACKUP_INTERVAL_KEY, String(hours));
  };

  const setLastBackupTime = (time: string) => {
    localStorage.setItem(LAST_BACKUP_KEY, time);
  };

  // Perform backup
  const performBackup = useCallback(async (silent = false, uploadToCloud = false) => {
    try {
      const data = {
        customers,
        products,
        suppliers,
        orders,
        expenses,
        fixedExpenses,
      };

      // Only backup if there's data
      if (customers.length === 0 && products.length === 0 && orders.length === 0) {
        if (!silent) {
          toast.info("Nenhum dado para backup");
        }
        return false;
      }

      if (silent) {
        // Save to localStorage instead of downloading
        import('@/lib/backupUtils').then(({ saveToLocalStorage }) => {
          saveToLocalStorage(data);
        });
      } else {
        exportToJSON(data, companySettings.name || 'empresa');
      }

      // Upload to Cloud (Supabase) if requested
      if (uploadToCloud && authUser?.tenant_id) {
        const { error } = await supabase.from('backups').insert({
          tenant_id: authUser.tenant_id,
          data: data,
          trigger_type: silent ? 'auto' : 'manual',
          name: `Backup ${silent ? 'Automático' : 'Manual'} - ${new Date().toLocaleString('pt-BR')}`
        });

        if (error) {
          console.error('Cloud backup error:', error);
          if (!silent) toast.error("Erro ao salvar backup na nuvem");
        } else {
          if (!silent) toast.success("Backup salvo na nuvem com sucesso!");
        }
      }

      const now = new Date().toISOString();
      setLastBackupTime(now);

      if (!silent) {
        toast.success("Backup realizado com sucesso!");
      }

      return true;
    } catch (error) {
      console.error('Backup error:', error);
      if (!silent) {
        toast.error("Erro ao realizar backup");
      }
      return false;
    }
  }, [customers, products, suppliers, orders, expenses, fixedExpenses, companySettings.name, authUser]);

  // Check if backup is due
  const isBackupDue = useCallback(() => {
    const lastBackup = getLastBackupTime();
    if (!lastBackup) return true;

    const lastBackupDate = new Date(lastBackup);
    const now = new Date();
    const hoursSinceBackup = (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60);
    const interval = getBackupInterval();

    return hoursSinceBackup >= interval;
  }, []);

  // Start scheduled backup
  const startScheduledBackup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!getAutoBackupEnabled()) return;

    // Check every hour if backup is due
    intervalRef.current = setInterval(() => {
      if (isBackupDue()) {
        console.log('Auto backup triggered');
        // Auto backup should upload to cloud too!
        performBackup(true, true);
        toast.info("Backup automático realizado", { duration: 3000 });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Also check immediately on start
    // Also check immediately on start
    if (isBackupDue()) {
      setTimeout(() => {
        performBackup(true, true);
        toast.info("Backup automático realizado", { duration: 3000 });
      }, 5000); // Wait 5 seconds after app starts
    }
  }, [isBackupDue, performBackup]);

  // Handle window close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (getBackupOnClose()) {
        // For beforeunload, we can't do async operations or trigger downloads reliably
        // So we'll just save data to localStorage as a fallback
        const data = {
          customers,
          products,
          suppliers,
          orders,
          expenses,
          fixedExpenses,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem('pendingBackup', JSON.stringify(data));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [customers, products, suppliers, orders, expenses, fixedExpenses]);

  // Check for pending backup on load
  useEffect(() => {
    const pendingBackup = localStorage.getItem('pendingBackup');
    if (pendingBackup) {
      try {
        const data = JSON.parse(pendingBackup);
        const backupTime = new Date(data.timestamp);
        const now = new Date();
        const hoursSince = (now.getTime() - backupTime.getTime()) / (1000 * 60 * 60);

        // If pending backup is less than 24 hours old, offer to download it
        if (hoursSince < 24) {
          setTimeout(() => {
            toast.info(
              "Backup pendente encontrado. Clique em 'Backup' nas configurações para baixar.",
              { duration: 5000 }
            );
          }, 2000);
        } else {
          localStorage.removeItem('pendingBackup');
        }
      } catch (e) {
        localStorage.removeItem('pendingBackup');
      }
    }
  }, []);

  // Start scheduled backup on mount
  useEffect(() => {
    startScheduledBackup();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startScheduledBackup]);

  return {
    performBackup,
    isBackupDue,
    getAutoBackupEnabled,
    setAutoBackupEnabled,
    getBackupOnClose,
    setBackupOnClose,
    getBackupInterval,
    setBackupInterval,
    getLastBackupTime,
    startScheduledBackup,
  };
}
