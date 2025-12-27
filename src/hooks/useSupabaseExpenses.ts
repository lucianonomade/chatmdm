import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Expense } from "@/lib/types";
import { toast } from "sonner";
import { useTenant } from "./useTenant";

export interface SupplierBalance {
  supplierId: string;
  supplierName: string;
  totalExpenses: number;
}

export function useSupabaseExpenses() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['expenses', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      return data.map(e => ({
        id: e.id,
        supplierId: e.supplier_id || '',
        supplierName: e.supplier_name || '',
        description: e.description,
        amount: Number(e.amount),
        date: e.date || new Date().toISOString(),
        category: e.category || 'Outros',
      })) as Expense[];
    },
    enabled: !!tenantId,
  });

  // Calculate balance per supplier (total owed to each supplier)
  const supplierBalances: SupplierBalance[] = expenses.reduce((acc, expense) => {
    if (!expense.supplierId) return acc;
    
    const existing = acc.find(b => b.supplierId === expense.supplierId);
    if (existing) {
      existing.totalExpenses += expense.amount;
    } else {
      acc.push({
        supplierId: expense.supplierId,
        supplierName: expense.supplierName,
        totalExpenses: expense.amount,
      });
    }
    return acc;
  }, [] as SupplierBalance[]);

  const getSupplierBalance = (supplierId: string): number => {
    const balance = supplierBalances.find(b => b.supplierId === supplierId);
    return balance?.totalExpenses || 0;
  };

  const addExpense = useMutation({
    mutationFn: async (expense: Omit<Expense, 'id'>) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      
      const { error } = await supabase
        .from('expenses')
        .insert({
          supplier_id: expense.supplierId || null,
          supplier_name: expense.supplierName,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          category: expense.category,
          tenant_id: tenantId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success("Despesa registrada!");
    },
    onError: (error) => {
      console.error('Error adding expense:', error);
      toast.error("Erro ao registrar despesa");
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...expense }: Partial<Expense> & { id: string }) => {
      const { error } = await supabase
        .from('expenses')
        .update({
          supplier_id: expense.supplierId || null,
          supplier_name: expense.supplierName,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          category: expense.category,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success("Despesa atualizada!");
    },
    onError: (error) => {
      console.error('Error updating expense:', error);
      toast.error("Erro ao atualizar despesa");
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success("Despesa removida!");
    },
    onError: (error) => {
      console.error('Error deleting expense:', error);
      toast.error("Erro ao remover despesa");
    },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    expenses,
    isLoading,
    error,
    supplierBalances,
    getSupplierBalance,
    totalExpenses,
    addExpense: addExpense.mutate,
    updateExpense: updateExpense.mutate,
    deleteExpense: deleteExpense.mutate,
    isAdding: addExpense.isPending,
    isUpdating: updateExpense.isPending,
    isDeleting: deleteExpense.isPending,
  };
}
