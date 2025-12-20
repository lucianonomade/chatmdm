import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StockMovement } from "@/lib/types";
import { toast } from "sonner";

export function useStockMovements(productId?: string) {
  const queryClient = useQueryClient();

  const { data: movements = [], isLoading, error } = useQuery({
    queryKey: ['stock-movements', productId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      return data.map(m => ({
        id: m.id,
        productId: m.product_id,
        quantity: m.quantity,
        type: m.type as 'in' | 'out' | 'adjustment',
        reason: m.reason || undefined,
        previousStock: m.previous_stock,
        newStock: m.new_stock,
        createdAt: m.created_at,
        createdBy: m.created_by || undefined,
      })) as StockMovement[];
    },
    enabled: productId !== undefined || productId === undefined,
  });

  const updateStock = useMutation({
    mutationFn: async ({
      productId,
      quantity,
      type,
      reason,
    }: {
      productId: string;
      quantity: number;
      type: 'in' | 'out' | 'adjustment';
      reason?: string;
    }) => {
      const { error } = await supabase.rpc('update_product_stock', {
        p_product_id: productId,
        p_quantity: quantity,
        p_type: type,
        p_reason: reason || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success("Estoque atualizado!");
    },
    onError: (error) => {
      console.error('Error updating stock:', error);
      toast.error("Erro ao atualizar estoque");
    },
  });

  return {
    movements,
    isLoading,
    error,
    updateStock: updateStock.mutate,
    isUpdating: updateStock.isPending,
  };
}
