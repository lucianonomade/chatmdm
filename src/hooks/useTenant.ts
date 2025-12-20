import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  owner_id: string | null;
  active: boolean;
  plan: string;
  trial_ends_at: string | null;
}

export function useTenant() {
  const { user } = useAuth();

  const { data: tenantId, isLoading: isLoadingTenantId } = useQuery({
    queryKey: ['user-tenant-id', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching tenant_id:', error);
        return null;
      }
      
      return data?.tenant_id as string | null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const { data: tenant, isLoading: isLoadingTenant } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching tenant:', error);
        return null;
      }
      
      return data as Tenant | null;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    tenantId,
    tenant,
    isLoading: isLoadingTenantId || isLoadingTenant,
  };
}
