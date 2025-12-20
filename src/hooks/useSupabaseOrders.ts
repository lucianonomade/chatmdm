import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ServiceOrder, OrderItem } from "@/lib/types";
import { toast } from "sonner";
import { useTenant } from "./useTenant";

export function useSupabaseOrders() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['service-orders', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(o => ({
        id: o.id,
        customerId: o.customer_id || undefined,
        customerName: o.customer_name,
        items: (o.items as unknown as OrderItem[]) || [],
        total: o.total,
        status: o.status as ServiceOrder['status'],
        paymentStatus: o.payment_status as ServiceOrder['paymentStatus'],
        paymentMethod: o.payment_method || undefined,
        amountPaid: o.amount_paid || 0,
        remainingAmount: o.remaining_amount || 0,
        payments: (o.payments as unknown as ServiceOrder['payments']) || [],
        deadline: o.deadline || undefined,
        description: o.description || undefined,
        measurements: o.measurements || undefined,
        sellerId: o.seller_id || undefined,
        sellerName: o.seller_name || undefined,
        createdAt: o.created_at || new Date().toISOString(),
        updatedAt: o.updated_at || undefined,
      })) as ServiceOrder[];
    },
    enabled: !!tenantId,
  });

  const addOrder = useMutation({
    mutationFn: async (order: ServiceOrder) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      
      const insertData = {
        id: order.id,
        customer_id: order.customerId === 'guest' ? null : (order.customerId || null),
        customer_name: order.customerName,
        items: JSON.parse(JSON.stringify(order.items)),
        total: order.total,
        status: order.status,
        payment_status: order.paymentStatus,
        payment_method: order.paymentMethod || null,
        amount_paid: order.amountPaid || 0,
        remaining_amount: order.remainingAmount || 0,
        payments: JSON.parse(JSON.stringify(order.payments || [])),
        deadline: order.deadline || null,
        description: order.description || null,
        measurements: order.measurements || null,
        seller_id: order.sellerId || null,
        seller_name: order.sellerName || null,
        tenant_id: tenantId,
      };
      
      const { error } = await supabase
        .from('service_orders')
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
    onError: (error) => {
      console.error('Error adding order:', error);
      toast.error("Erro ao salvar pedido");
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceOrder> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.customerName !== undefined) updateData.customer_name = data.customerName;
      if (data.customerId !== undefined) updateData.customer_id = data.customerId === 'guest' ? null : (data.customerId || null);
      if (data.items !== undefined) updateData.items = data.items as unknown as Record<string, unknown>[];
      if (data.total !== undefined) updateData.total = data.total;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.paymentStatus !== undefined) updateData.payment_status = data.paymentStatus;
      if (data.paymentMethod !== undefined) updateData.payment_method = data.paymentMethod;
      if (data.amountPaid !== undefined) updateData.amount_paid = data.amountPaid;
      if (data.remainingAmount !== undefined) updateData.remaining_amount = data.remainingAmount;
      if (data.payments !== undefined) updateData.payments = data.payments as unknown as Record<string, unknown>[];
      if (data.deadline !== undefined) updateData.deadline = data.deadline;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.measurements !== undefined) updateData.measurements = data.measurements;
      if (data.sellerId !== undefined) updateData.seller_id = data.sellerId;
      if (data.sellerName !== undefined) updateData.seller_name = data.sellerName;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('service_orders')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
    onError: (error) => {
      console.error('Error updating order:', error);
      toast.error("Erro ao atualizar pedido");
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ServiceOrder['status'] }) => {
      const { error } = await supabase
        .from('service_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
      toast.error("Erro ao atualizar status");
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success("Pedido excluído!");
    },
    onError: (error) => {
      console.error('Error deleting order:', error);
      toast.error("Erro ao excluir pedido");
    },
  });

  return {
    orders,
    isLoading,
    error,
    addOrder: addOrder.mutateAsync,
    updateOrder: updateOrder.mutate,
    updateOrderStatus: updateOrderStatus.mutate,
    deleteOrder: deleteOrder.mutate,
    isAdding: addOrder.isPending,
    isUpdating: updateOrder.isPending,
    isDeleting: deleteOrder.isPending,
  };
}
