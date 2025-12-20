import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Supplier } from "@/lib/types";
import { toast } from "sonner";
import { useTenant } from "./useTenant";

export function useSupabaseSuppliers() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: suppliers = [], isLoading, error } = useQuery({
    queryKey: ['suppliers', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(s => ({
        id: s.id,
        name: s.name,
        contact: s.contact || '',
        phone: s.phone || '',
        email: s.email || undefined,
      })) as Supplier[];
    },
    enabled: !!tenantId,
  });

  const addSupplier = useMutation({
    mutationFn: async (supplier: Omit<Supplier, 'id'>) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      
      const { error } = await supabase
        .from('suppliers')
        .insert({
          name: supplier.name,
          contact: supplier.contact,
          phone: supplier.phone,
          email: supplier.email,
          tenant_id: tenantId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success("Fornecedor adicionado!");
    },
    onError: (error) => {
      console.error('Error adding supplier:', error);
      toast.error("Erro ao adicionar fornecedor");
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
      const { error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success("Fornecedor atualizado!");
    },
    onError: (error) => {
      console.error('Error updating supplier:', error);
      toast.error("Erro ao atualizar fornecedor");
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success("Fornecedor removido!");
    },
    onError: (error) => {
      console.error('Error deleting supplier:', error);
      toast.error("Erro ao remover fornecedor");
    },
  });

  return {
    suppliers,
    isLoading,
    error,
    addSupplier: addSupplier.mutate,
    updateSupplier: updateSupplier.mutate,
    deleteSupplier: deleteSupplier.mutate,
    isAdding: addSupplier.isPending,
    isUpdating: updateSupplier.isPending,
    isDeleting: deleteSupplier.isPending,
  };
}
