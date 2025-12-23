import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanySettings } from "@/lib/types";
import { toast } from "sonner";
import { useTenant } from "./useTenant";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export function useCompanySettings() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { authUser } = useAuth();

  // Check if user is admin or manager (can see full settings)
  const canViewFullSettings = authUser?.role === 'admin' || authUser?.role === 'manager';

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['company-settings', tenantId, canViewFullSettings],
    queryFn: async () => {
      if (canViewFullSettings) {
        // Admins/managers can access full company settings
        const { data, error } = await supabase
          .from('company_settings')
          .select('*')
          .maybeSingle();

        if (error) throw error;

        if (!data) return null;

        return {
          id: data.id,
          name: data.name,
          cnpj: data.cnpj || '',
          address: data.address || '',
          phone: data.phone || '',
          phone2: data.phone2 || '',
          email: data.email || '',
          logoUrl: data.logo_url || undefined,
          usesStock: data.uses_stock ?? true,
          lowStockThreshold: data.low_stock_threshold ?? 10,
          printLogoOnReceipts: data.print_logo_on_receipts ?? true,
          autoPrintOnSale: data.auto_print_on_sale ?? false,
          notifyLowStock: data.notify_low_stock ?? true,
          notifyNewSales: data.notify_new_sales ?? true,
          notifyPendingPayments: data.notify_pending_payments ?? true,
          notifyOrderStatus: data.notify_order_status ?? true,
          loginHeaderColor: data.login_header_color || '#ffffff',
        } as CompanySettings;
      } else {
        // Sellers can only access public branding data (no CNPJ, email, etc.)
        const { data, error } = await supabase.rpc('get_public_company_branding');

        if (error) throw error;

        if (!data) return null;

        // Type assertion for the RPC response
        const brandingData = data as {
          name?: string;
          logo_url?: string;
          print_logo_url?: string;
          login_header_color?: string;
          address?: string;
          phone?: string;
          phone2?: string;
        };

        return {
          name: brandingData.name || 'Minha Empresa',
          cnpj: '', // Hidden from sellers
          address: brandingData.address || '',
          phone: brandingData.phone || '',
          phone2: brandingData.phone2 || '',
          email: '', // Hidden from sellers
          logoUrl: brandingData.logo_url || undefined,
          usesStock: true,
          lowStockThreshold: 10,
          printLogoOnReceipts: true,
          autoPrintOnSale: false,
          notifyLowStock: false,
          notifyNewSales: false,
          notifyPendingPayments: false,
          notifyOrderStatus: false,
          loginHeaderColor: brandingData.login_header_color || '#ffffff',
        } as CompanySettings;
      }
    },
    enabled: !!tenantId && !!authUser,
  });

  // Real-time subscription for cross-device sync
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('company-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_settings',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          // Invalidate all company-settings queries to refetch data when changes occur
          queryClient.invalidateQueries({ queryKey: ['company-settings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<CompanySettings>) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      
      // Transform to database format
      const dbSettings: Record<string, unknown> = {};
      
      if (newSettings.name !== undefined) dbSettings.name = newSettings.name;
      if (newSettings.cnpj !== undefined) dbSettings.cnpj = newSettings.cnpj;
      if (newSettings.address !== undefined) dbSettings.address = newSettings.address;
      if (newSettings.phone !== undefined) dbSettings.phone = newSettings.phone;
      if (newSettings.phone2 !== undefined) dbSettings.phone2 = newSettings.phone2;
      if (newSettings.email !== undefined) dbSettings.email = newSettings.email;
      if (newSettings.logoUrl !== undefined) dbSettings.logo_url = newSettings.logoUrl;
      if (newSettings.usesStock !== undefined) dbSettings.uses_stock = newSettings.usesStock;
      if (newSettings.lowStockThreshold !== undefined) dbSettings.low_stock_threshold = newSettings.lowStockThreshold;
      // Print settings
      if (newSettings.printLogoOnReceipts !== undefined) dbSettings.print_logo_on_receipts = newSettings.printLogoOnReceipts;
      if (newSettings.autoPrintOnSale !== undefined) dbSettings.auto_print_on_sale = newSettings.autoPrintOnSale;
      // Notification settings
      if (newSettings.notifyLowStock !== undefined) dbSettings.notify_low_stock = newSettings.notifyLowStock;
      if (newSettings.notifyNewSales !== undefined) dbSettings.notify_new_sales = newSettings.notifyNewSales;
      if (newSettings.notifyPendingPayments !== undefined) dbSettings.notify_pending_payments = newSettings.notifyPendingPayments;
      if (newSettings.notifyOrderStatus !== undefined) dbSettings.notify_order_status = newSettings.notifyOrderStatus;
      // Login settings
      if (newSettings.loginHeaderColor !== undefined) dbSettings.login_header_color = newSettings.loginHeaderColor;

      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from('company_settings')
          .update(dbSettings)
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        // Insert new with tenant_id
        dbSettings.tenant_id = tenantId;
        const { error } = await supabase
          .from('company_settings')
          .insert(dbSettings);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings', tenantId] });
      toast.success("Configurações salvas!");
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error("Erro ao salvar configurações");
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}
