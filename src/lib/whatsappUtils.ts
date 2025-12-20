import { ServiceOrder } from "@/lib/store";
import { CompanySettings } from "@/lib/types";

// Format phone number for WhatsApp (remove non-digits, add country code if needed)
function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Add Brazil country code if not present
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

// Generate WhatsApp message for order/quote
export function generateWhatsAppMessage(
  order: ServiceOrder,
  type: 'receipt' | 'order' | 'quote',
  companySettings: CompanySettings
): string {
  const typeLabels = {
    receipt: 'Recibo',
    order: 'Pedido',
    quote: 'Orçamento'
  };
  
  const title = typeLabels[type];
  const date = new Date(order.createdAt).toLocaleDateString('pt-BR');
  
  let message = `*${companySettings.name}*\n`;
  message += `📋 ${title} #${order.id}\n`;
  message += `📅 Data: ${date}\n\n`;
  
  message += `*Itens:*\n`;
  order.items.forEach(item => {
    message += `• ${item.quantity}x ${item.name}`;
    if (item.variationName) message += ` (${item.variationName})`;
    if (type !== 'quote') message += ` - R$ ${item.total.toFixed(2)}`;
    message += `\n`;
    if (item.finishing) message += `  Acabamento: ${item.finishing}\n`;
    if (item.dimensions) message += `  Medidas: ${item.dimensions}\n`;
    if (item.customDescription) message += `  Obs: ${item.customDescription}\n`;
  });
  
  message += `\n*Total: R$ ${order.total.toFixed(2)}*\n`;
  
  if (order.amountPaid && order.amountPaid > 0 && order.amountPaid < order.total) {
    message += `Pago: R$ ${order.amountPaid.toFixed(2)}\n`;
    message += `Restante: R$ ${(order.total - order.amountPaid).toFixed(2)}\n`;
  }
  
  if (type === 'quote') {
    message += `\n_Orçamento válido por 7 dias_\n`;
  }
  
  message += `\n${companySettings.phone || ''}`;
  
  return message;
}

// Open WhatsApp with pre-filled message
export function sendWhatsAppMessage(
  phone: string,
  message: string
): void {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}

// Send order via WhatsApp
export function sendOrderViaWhatsApp(
  order: ServiceOrder,
  type: 'receipt' | 'order' | 'quote',
  companySettings: CompanySettings,
  customerPhone?: string
): void {
  const message = generateWhatsAppMessage(order, type, companySettings);
  
  if (customerPhone) {
    sendWhatsAppMessage(customerPhone, message);
  } else {
    // Open WhatsApp without specific number (user will choose contact)
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  }
}
