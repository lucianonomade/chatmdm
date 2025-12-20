import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/lib/types";
import { toast } from "sonner";
import { useTenant } from "./useTenant";

export function useSupabaseCustomers() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers', tenantId],
    queryFn: async () => {
      // Check if user can view PII (Personal Identifiable Information)
      const { data: canViewPii } = await supabase.rpc('can_view_customer_pii');
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(c => ({
        id: c.id,
        name: c.name,
        // Only show sensitive data if user has permission
        phone: canViewPii ? (c.phone || '') : '',
        email: canViewPii ? (c.email || '') : '',
        doc: canViewPii ? (c.doc || '') : '',
        notes: c.notes || undefined,
      })) as Customer[];
    },
    enabled: !!tenantId,
  });

  const addCustomer = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id'>) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('customers')
        .insert({
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          doc: customer.doc,
          notes: customer.notes,
          created_by: user?.id,
          tenant_id: tenantId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success("Cliente cadastrado!");
    },
    onError: (error) => {
      console.error('Error adding customer:', error);
      toast.error("Erro ao cadastrar cliente");
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      const { error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success("Cliente atualizado!");
    },
    onError: (error) => {
      console.error('Error updating customer:', error);
      toast.error("Erro ao atualizar cliente");
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success("Cliente removido!");
    },
    onError: (error) => {
      console.error('Error deleting customer:', error);
      toast.error("Erro ao remover cliente");
    },
  });

  return {
    customers,
    isLoading,
    error,
    addCustomer: addCustomer.mutate,
    updateCustomer: updateCustomer.mutate,
    deleteCustomer: deleteCustomer.mutate,
    isAdding: addCustomer.isPending,
    isUpdating: updateCustomer.isPending,
    isDeleting: deleteCustomer.isPending,
  };
}
