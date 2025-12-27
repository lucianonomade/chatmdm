import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "./useTenant";

export interface PendingInstallment {
  id: string;
  expenseId: string | null;
  supplierId: string | null;
  supplierName: string | null;
  description: string;
  totalAmount: number;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidAt: string | null;
  category: string | null;
  notes: string | null;
  createdAt: string;
}

export function useSupabasePendingInstallments() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: installments = [], isLoading, error } = useQuery({
    queryKey: ['pending_installments', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_installments')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;

      return data.map(i => ({
        id: i.id,
        expenseId: i.expense_id,
        supplierId: i.supplier_id,
        supplierName: i.supplier_name,
        description: i.description,
        totalAmount: Number(i.total_amount),
        installmentNumber: i.installment_number,
        totalInstallments: i.total_installments,
        amount: Number(i.amount),
        dueDate: i.due_date,
        paid: i.paid,
        paidAt: i.paid_at,
        category: i.category,
        notes: i.notes,
        createdAt: i.created_at,
      })) as PendingInstallment[];
    },
    enabled: !!tenantId,
  });

  const pendingInstallments = installments.filter(i => !i.paid);
  const totalPendingAmount = pendingInstallments.reduce((sum, i) => sum + i.amount, 0);

  const addInstallments = useMutation({
    mutationFn: async (data: {
      expenseId?: string;
      supplierId?: string;
      supplierName: string;
      description: string;
      totalAmount: number;
      installments: number;
      amountPerInstallment: number;
      installmentDates: Date[];
      category?: string;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error("Tenant não encontrado");

      const installmentsToInsert = [];
      
      for (let i = 0; i < data.installments; i++) {
        const dueDate = data.installmentDates[i] || new Date();
        
        installmentsToInsert.push({
          expense_id: data.expenseId || null,
          supplier_id: data.supplierId || null,
          supplier_name: data.supplierName,
          description: data.description,
          total_amount: data.totalAmount,
          installment_number: i + 1,
          total_installments: data.installments,
          amount: data.amountPerInstallment,
          due_date: dueDate.toISOString().split('T')[0],
          category: data.category || null,
          notes: data.notes || null,
          tenant_id: tenantId,
        });
      }

      const { error } = await supabase
        .from('pending_installments')
        .insert(installmentsToInsert);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_installments'] });
    },
    onError: (error) => {
      console.error('Error adding installments:', error);
      toast.error("Erro ao criar parcelas");
    },
  });

  const payInstallment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pending_installments')
        .update({ 
          paid: true, 
          paid_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_installments'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success("Parcela paga!");
    },
    onError: (error) => {
      console.error('Error paying installment:', error);
      toast.error("Erro ao pagar parcela");
    },
  });

  const deleteInstallment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pending_installments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_installments'] });
      toast.success("Parcela removida!");
    },
    onError: (error) => {
      console.error('Error deleting installment:', error);
      toast.error("Erro ao remover parcela");
    },
  });

  const updateInstallment = useMutation({
    mutationFn: async (data: {
      id: string;
      description?: string;
      supplierName?: string;
      amount?: number;
      dueDate?: string;
      category?: string;
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (data.description !== undefined) updateData.description = data.description;
      if (data.supplierName !== undefined) updateData.supplier_name = data.supplierName;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const { error } = await supabase
        .from('pending_installments')
        .update(updateData)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_installments'] });
      toast.success("Parcela atualizada!");
    },
    onError: (error) => {
      console.error('Error updating installment:', error);
      toast.error("Erro ao atualizar parcela");
    },
  });

  const updatePurchase = useMutation({
    mutationFn: async (data: {
      installmentIds: string[];
      description?: string;
      supplierName?: string;
      category?: string;
      notes?: string;
      totalAmount?: number;
      newInstallmentsCount?: number;
      installmentDates?: string[];
      installmentUpdates?: Array<{
        id: string;
        amount?: number;
        dueDate?: string;
      }>;
    }) => {
      if (!tenantId) throw new Error("Tenant não encontrado");

      // If changing total amount or installments count, recreate all installments
      if (data.totalAmount !== undefined || data.newInstallmentsCount !== undefined) {
        // Get original installment data for reference
        const { data: originalInstallments, error: fetchError } = await supabase
          .from('pending_installments')
          .select('*')
          .in('id', data.installmentIds)
          .order('installment_number', { ascending: true });

        if (fetchError) throw fetchError;
        if (!originalInstallments || originalInstallments.length === 0) {
          throw new Error("Parcelas não encontradas");
        }

        const original = originalInstallments[0];
        const newTotalAmount = data.totalAmount ?? original.total_amount;
        const newInstallmentsCount = data.newInstallmentsCount ?? original.total_installments;
        const amountPerInstallment = Number((newTotalAmount / newInstallmentsCount).toFixed(2));

        // Delete old installments
        const { error: deleteError } = await supabase
          .from('pending_installments')
          .delete()
          .in('id', data.installmentIds);

        if (deleteError) throw deleteError;

        // Create new installments with custom dates if provided
        const newInstallments = [];
        for (let i = 0; i < newInstallmentsCount; i++) {
          // Use provided date or calculate based on first date
          let dueDateStr: string;
          if (data.installmentDates && data.installmentDates[i]) {
            dueDateStr = data.installmentDates[i];
          } else {
            const firstDate = data.installmentDates?.[0] 
              ? new Date(data.installmentDates[0] + 'T12:00:00')
              : new Date(original.due_date + 'T12:00:00');
            const dueDate = new Date(firstDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            dueDateStr = dueDate.toISOString().split('T')[0];
          }

          newInstallments.push({
            expense_id: original.expense_id,
            supplier_id: original.supplier_id,
            supplier_name: data.supplierName ?? original.supplier_name,
            description: data.description ?? original.description,
            total_amount: newTotalAmount,
            installment_number: i + 1,
            total_installments: newInstallmentsCount,
            amount: amountPerInstallment,
            due_date: dueDateStr,
            category: data.category ?? original.category,
            notes: data.notes ?? original.notes,
            tenant_id: tenantId,
          });
        }

        const { error: insertError } = await supabase
          .from('pending_installments')
          .insert(newInstallments);

        if (insertError) throw insertError;
        return;
      }

      // Update common fields for all installments
      const updateData: Record<string, unknown> = {};
      if (data.description !== undefined) updateData.description = data.description;
      if (data.supplierName !== undefined) updateData.supplier_name = data.supplierName;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.notes !== undefined) updateData.notes = data.notes;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('pending_installments')
          .update(updateData)
          .in('id', data.installmentIds);
        
        if (error) throw error;
      }

      // Update individual installment amounts and dates
      if (data.installmentUpdates && data.installmentUpdates.length > 0) {
        for (const update of data.installmentUpdates) {
          const individualUpdate: Record<string, unknown> = {};
          if (update.amount !== undefined) individualUpdate.amount = update.amount;
          if (update.dueDate !== undefined) individualUpdate.due_date = update.dueDate;

          if (Object.keys(individualUpdate).length > 0) {
            const { error } = await supabase
              .from('pending_installments')
              .update(individualUpdate)
              .eq('id', update.id);
            
            if (error) throw error;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_installments'] });
      toast.success("Compra atualizada!");
    },
    onError: (error) => {
      console.error('Error updating purchase:', error);
      toast.error("Erro ao atualizar compra");
    },
  });

  const deletePurchase = useMutation({
    mutationFn: async (installmentIds: string[]) => {
      const { error } = await supabase
        .from('pending_installments')
        .delete()
        .in('id', installmentIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_installments'] });
      toast.success("Compra excluída!");
    },
    onError: (error) => {
      console.error('Error deleting purchase:', error);
      toast.error("Erro ao excluir compra");
    },
  });

  return {
    installments,
    pendingInstallments,
    totalPendingAmount,
    isLoading,
    error,
    addInstallments: addInstallments.mutate,
    payInstallment: payInstallment.mutate,
    deleteInstallment: deleteInstallment.mutate,
    updateInstallment: updateInstallment.mutate,
    updatePurchase: updatePurchase.mutate,
    deletePurchase: deletePurchase.mutate,
    isAdding: addInstallments.isPending,
    isPaying: payInstallment.isPending,
    isDeleting: deleteInstallment.isPending || deletePurchase.isPending,
    isUpdating: updateInstallment.isPending || updatePurchase.isPending,
  };
}
