import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "./useTenant";

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  active: boolean;
  createdAt?: string;
}

export function useSupabaseFixedExpenses() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: fixedExpenses = [], isLoading, error } = useQuery({
    queryKey: ['fixed_expenses', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .order('due_day', { ascending: true });

      if (error) throw error;

      return data.map(e => ({
        id: e.id,
        name: e.name,
        amount: Number(e.amount),
        dueDay: e.due_day,
        category: e.category || 'Geral',
        active: e.active ?? true,
        createdAt: e.created_at,
      })) as FixedExpense[];
    },
    enabled: !!tenantId,
  });

  const addFixedExpense = useMutation({
    mutationFn: async (expense: Omit<FixedExpense, 'id' | 'createdAt'>) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      
      const { error } = await supabase
        .from('fixed_expenses')
        .insert({
          name: expense.name,
          amount: expense.amount,
          due_day: expense.dueDay,
          category: expense.category,
          active: expense.active,
          tenant_id: tenantId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_expenses'] });
      toast.success("Gasto fixo cadastrado!");
    },
    onError: (error) => {
      console.error('Error adding fixed expense:', error);
      toast.error("Erro ao cadastrar gasto fixo");
    },
  });

  const updateFixedExpense = useMutation({
    mutationFn: async ({ id, ...expense }: Partial<FixedExpense> & { id: string }) => {
      const updateData: Record<string, any> = {};
      if (expense.name !== undefined) updateData.name = expense.name;
      if (expense.amount !== undefined) updateData.amount = expense.amount;
      if (expense.dueDay !== undefined) updateData.due_day = expense.dueDay;
      if (expense.category !== undefined) updateData.category = expense.category;
      if (expense.active !== undefined) updateData.active = expense.active;

      const { error } = await supabase
        .from('fixed_expenses')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_expenses'] });
      toast.success("Gasto fixo atualizado!");
    },
    onError: (error) => {
      console.error('Error updating fixed expense:', error);
      toast.error("Erro ao atualizar gasto fixo");
    },
  });

  const deleteFixedExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fixed_expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_expenses'] });
      toast.success("Gasto fixo removido!");
    },
    onError: (error) => {
      console.error('Error deleting fixed expense:', error);
      toast.error("Erro ao remover gasto fixo");
    },
  });

  const totalFixedExpenses = fixedExpenses
    .filter(e => e.active)
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    fixedExpenses,
    isLoading,
    error,
    totalFixedExpenses,
    addFixedExpense: addFixedExpense.mutate,
    updateFixedExpense: updateFixedExpense.mutate,
    deleteFixedExpense: deleteFixedExpense.mutate,
    isAdding: addFixedExpense.isPending,
    isUpdating: updateFixedExpense.isPending,
    isDeleting: deleteFixedExpense.isPending,
  };
}
