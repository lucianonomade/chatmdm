import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "./useCompanySettings";
import { useAuth } from "./useAuth";

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  user_id?: string | null;
}

export function useAutoNotifications() {
  const { settings } = useCompanySettings();
  const { user } = useAuth();

  const createNotification = async (notification: NotificationPayload) => {
    try {
      const insertData = {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        user_id: notification.user_id || user?.id || null,
      };
      
      const { error } = await supabase
        .from('notifications')
        .insert(insertData as never);

      if (error) {
        console.error('Error creating notification:', error);
      }
    } catch (err) {
      console.error('Error creating notification:', err);
    }
  };

  // Notify when stock is low
  const notifyLowStock = async (productName: string, currentStock: number, threshold: number) => {
    if (!settings?.notifyLowStock) return;

    await createNotification({
      type: 'low_stock',
      title: 'Estoque Baixo',
      message: `O produto "${productName}" está com estoque baixo (${currentStock} unidades). Limite: ${threshold}`,
      data: { productName, currentStock, threshold },
      user_id: null, // Send to all admins/managers
    });
  };

  // Notify when a new sale is created
  const notifyNewSale = async (orderId: string, customerName: string, total: number, sellerName?: string) => {
    if (!settings?.notifyNewSales) return;

    await createNotification({
      type: 'new_sale',
      title: 'Nova Venda',
      message: `Pedido #${orderId} - ${customerName} - R$ ${total.toFixed(2).replace('.', ',')}${sellerName ? ` (${sellerName})` : ''}`,
      data: { orderId, customerName, total, sellerName },
      user_id: null, // Send to all admins/managers
    });
  };

  // Notify when there's a pending payment
  const notifyPendingPayment = async (orderId: string, customerName: string, remainingAmount: number) => {
    if (!settings?.notifyPendingPayments) return;

    await createNotification({
      type: 'pending_payment',
      title: 'Pagamento Pendente',
      message: `Pedido #${orderId} - ${customerName} tem R$ ${remainingAmount.toFixed(2).replace('.', ',')} pendente`,
      data: { orderId, customerName, remainingAmount },
      user_id: null, // Send to all admins/managers
    });
  };

  // Notify when order status changes
  const notifyOrderStatusChange = async (
    orderId: string, 
    customerName: string, 
    oldStatus: string, 
    newStatus: string,
    sellerId?: string
  ) => {
    if (!settings?.notifyOrderStatus) return;

    const statusLabels: Record<string, string> = {
      pending: 'Aguardando',
      production: 'Em Produção',
      finished: 'Finalizado',
      delivered: 'Entregue',
    };

    await createNotification({
      type: 'order_status',
      title: 'Status Alterado',
      message: `Pedido #${orderId} (${customerName}): ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`,
      data: { orderId, customerName, oldStatus, newStatus },
      user_id: sellerId || null, // Notify the seller or all
    });
  };

  // Check products for low stock
  const checkLowStock = async (products: Array<{ id: string; name: string; stock: number }>) => {
    if (!settings?.notifyLowStock || !settings?.lowStockThreshold) return;

    const threshold = settings.lowStockThreshold;

    for (const product of products) {
      if (product.stock <= threshold && product.stock > 0) {
        await notifyLowStock(product.name, product.stock, threshold);
      }
    }
  };

  return {
    notifyLowStock,
    notifyNewSale,
    notifyPendingPayment,
    notifyOrderStatusChange,
    checkLowStock,
  };
}
