// Print utilities - Centralized print functions
import { CompanySettings, OrderItem, ServiceOrder } from './types';

export type PrintDocType = 'receipt' | 'order' | 'quote' | 'production';

// HTML escaping utility to prevent XSS attacks
export const escapeHtml = (unsafe: string | null | undefined): string => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// URL sanitization - only allow http/https URLs
export const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed.match(/^https?:\/\//i)) return '';
  return escapeHtml(trimmed);
};

interface PrintOrderData {
  id: string;
  createdAt: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  sellerName?: string | null;
  amountPaid?: number;
  remainingAmount?: number;
  paymentStatus?: string;
  paymentMethod?: 'cash' | 'pix' | 'card' | null;
  installments?: number;
}

const getPrintStyles = (type: PrintDocType) => `
  body {
    font-family: 'Courier New', monospace;
    padding: 20px;
    font-size: ${type === 'receipt' ? '12px' : '14px'};
    max-width: ${type === 'receipt' ? '300px' : '100%'};
    margin: 0 auto;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .font-bold { font-weight: bold; }
  .border-b { border-bottom: 1px dashed #000; }
  .border-t { border-top: 1px dashed #000; }
  .py-2 { padding-top: 8px; padding-bottom: 8px; }
  .mb-2 { margin-bottom: 8px; }
  .mb-4 { margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #f8f9fa; }
  .header-section { margin-bottom: 20px; text-align: center; }
  .info-section { margin-bottom: 20px; }
  .total-section { margin-top: 20px; text-align: right; font-size: 1.2em; font-weight: bold; }
  .box { border: 2px solid #000; padding: 15px; margin-top: 8px; font-size: 16px; font-weight: bold; background: #f8f9fa; }
  .finishing-box { border: 2px solid #333; padding: 8px 12px; margin-top: 8px; font-size: 15px; font-weight: bold; background: #eee; display: inline-block; }
  .action-bar {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 20px;
    padding: 15px;
    background: #f0f0f0;
    border-radius: 10px;
  }
  .action-btn { 
    background: #3b82f6; 
    color: white; 
    border: none; 
    padding: 12px 24px; 
    border-radius: 8px; 
    font-size: 16px; 
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  .action-btn:active { transform: scale(0.98); }
  .action-btn.print { background: #22c55e; }
  .action-btn.close { background: #ef4444; }
  @media print { 
    .action-bar { display: none !important; } 
    body { margin: 0; padding: 10px; }
  }
`;

const getDocTitle = (type: PrintDocType): string => {
  const titles: Record<PrintDocType, string> = {
    production: 'ORDEM DE PRODUÇÃO',
    receipt: 'RECIBO',
    order: 'PEDIDO',
    quote: 'ORÇAMENTO'
  };
  return titles[type];
};

const renderHeader = (companySettings: CompanySettings, title: string): string => {
  const safeLogoUrl = sanitizeUrl(companySettings.logoUrl);
  const phones = [companySettings.phone, companySettings.phone2].filter(Boolean).join(' | ');
  return `
    <div class="header-section">
      ${safeLogoUrl 
        ? `<img src="${safeLogoUrl}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px;" />` 
        : `<div class="font-bold" style="font-size: 1.2em;">${escapeHtml(companySettings.name)}</div>`}
      ${companySettings.cnpj ? `<div style="font-size: 0.9em;">CNPJ: ${escapeHtml(companySettings.cnpj)}</div>` : ''}
      <div>${escapeHtml(companySettings.address)}</div>
      <div>${escapeHtml(phones)}</div>
      <div style="margin-top: 10px; font-weight: bold; font-size: 1.5em;">${escapeHtml(title)}</div>
    </div>
  `;
};

const renderInfo = (orderData: PrintOrderData, type: PrintDocType): string => {
  return `
    <div class="info-section border-b" style="padding-bottom: 8px;">
      <div style="display: flex; justify-content: space-between;">
        <div>
          <div><strong>Data:</strong> ${new Date(orderData.createdAt).toLocaleString('pt-BR')}</div>
          <div><strong>Referência:</strong> #${escapeHtml(orderData.id)}</div>
          ${type === 'quote' ? '<div style="font-size: 0.8em; margin-top: 5px;">Válido por 7 dias</div>' : ''}
        </div>
        <div class="text-right">
          <div><strong>Cliente:</strong> ${escapeHtml(orderData.customerName)}</div>
          ${orderData.sellerName ? `<div><strong>Vendedor:</strong> ${escapeHtml(orderData.sellerName)}</div>` : ''}
        </div>
      </div>
    </div>
  `;
};

const renderReceiptItems = (items: OrderItem[], showPrices: boolean): string => {
  let html = '<div class="font-bold mb-2">ITENS</div>';
  items.forEach(item => {
    html += `
      <div class="mb-2">
        <div class="font-bold">${item.quantity}x ${escapeHtml(item.name)}</div>
        ${item.variationName ? `<div style="font-size: 0.9em;">${escapeHtml(item.variationName)}</div>` : ''}
        ${showPrices ? `<div class="text-right">R$ ${item.total.toFixed(2)}</div>` : ''}
      </div>
    `;
  });
  return html;
};

const renderTableItems = (items: OrderItem[], showPrices: boolean): string => {
  let html = `
    <table>
      <thead>
        <tr>
          <th style="width: 60%">Item / Detalhes</th>
          <th style="width: 10%; text-align: center;">Qtd</th>
          ${showPrices ? '<th style="width: 15%; text-align: right;">Unit.</th><th style="width: 15%; text-align: right;">Total</th>' : ''}
        </tr>
      </thead>
      <tbody>
  `;

  items.forEach(item => {
    const unitPrice = item.total / item.quantity;
    html += `
      <tr>
        <td style="padding-bottom: 20px;">
          <div class="font-bold" style="font-size: 1.2em;">${escapeHtml(item.name)}</div>
          ${item.variationName ? `<div>${escapeHtml(item.variationName)}</div>` : ''}
          ${item.dimensions ? `<div style="font-size: 0.9em;">Medidas: ${escapeHtml(item.dimensions)}</div>` : ''}
          ${item.finishing ? `<div class="finishing-box">ACABAMENTO: ${escapeHtml(item.finishing).toUpperCase()}</div>` : ''}
          ${item.customDescription ? `<div class="box">OBS: ${escapeHtml(item.customDescription).toUpperCase()}</div>` : ''}
        </td>
        <td style="text-align: center; vertical-align: top; font-size: 1.2em; font-weight: bold;">${item.quantity}</td>
        ${showPrices ? `
          <td style="text-align: right; vertical-align: top;">R$ ${unitPrice.toFixed(2)}</td>
          <td style="text-align: right; vertical-align: top;">R$ ${item.total.toFixed(2)}</td>
        ` : ''}
      </tr>
    `;
  });

  html += '</tbody></table>';
  return html;
};

const getPaymentMethodLabel = (method: 'cash' | 'pix' | 'card' | null | undefined): string => {
  const labels: Record<string, string> = {
    cash: 'Dinheiro',
    pix: 'PIX',
    card: 'Cartão'
  };
  return method ? labels[method] || method : 'Não informado';
};

const renderTotals = (orderData: PrintOrderData, showPrices: boolean): string => {
  if (!showPrices) return '';
  
  const paid = orderData.amountPaid ?? (orderData.paymentStatus === 'paid' ? orderData.total : 0);
  const remaining = orderData.remainingAmount ?? (orderData.total - paid);
  const installments = orderData.installments ?? 1;
  const installmentValue = remaining > 0 && installments > 1 ? remaining / installments : 0;

  return `
    <div class="total-section">
      <div>TOTAL: R$ ${orderData.total.toFixed(2)}</div>
      
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc;">
        <div style="font-size: 0.9em; margin-bottom: 4px;">
          <strong>Forma de Pagamento:</strong> ${getPaymentMethodLabel(orderData.paymentMethod)}
        </div>
        
        ${paid > 0 ? `
          <div style="font-size: 0.9em; color: #28a745; margin-top: 4px;">
            <strong>Valor Pago:</strong> R$ ${paid.toFixed(2)}
          </div>
        ` : ''}
        
        ${remaining > 0 ? `
          <div style="font-size: 0.9em; color: #dc3545; margin-top: 4px;">
            <strong>Falta Pagar:</strong> R$ ${remaining.toFixed(2)}
          </div>
          ${installments > 1 ? `
            <div style="font-size: 0.9em; color: #fd7e14; margin-top: 4px; padding: 6px; background: #fff8e1; border-radius: 4px;">
              <strong>Parcelamento:</strong> ${installments}x de R$ ${installmentValue.toFixed(2)}
            </div>
          ` : ''}
        ` : `
          <div style="font-size: 0.9em; color: #28a745; margin-top: 4px;">
            <strong>PAGAMENTO TOTAL REALIZADO</strong>
          </div>
        `}
      </div>
    </div>
  `;
};

const renderProductionFields = (): string => {
  return `
    <div style="margin-top: 40px; border: 2px solid #000; padding: 10px;">
      <div style="font-weight: bold; margin-bottom: 40px;">OBSERVAÇÕES DE PRODUÇÃO:</div>
      <div style="border-bottom: 1px dotted #999; margin-bottom: 20px;"></div>
      <div style="border-bottom: 1px dotted #999; margin-bottom: 20px;"></div>
    </div>
    <div style="margin-top: 20px; display: flex; justify-content: space-between;">
      <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Visto Produção</div>
      <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Visto Conferência</div>
    </div>
  `;
};

const renderFooter = (): string => {
  return `
    <div class="text-center py-2" style="margin-top: 20px; border-top: 1px dashed #000;">
      Obrigado pela preferência!
    </div>
  `;
};

export const printDocument = (
  orderData: PrintOrderData,
  companySettings: CompanySettings,
  type: PrintDocType
): void => {
  const width = type === 'receipt' ? 400 : 800;
  const printWindow = window.open('', '', `height=600,width=${width}`);
  if (!printWindow) return;

  const title = getDocTitle(type);
  const showPrices = type !== 'production';

  let html = `
    <html>
      <head>
        <title>${escapeHtml(title)} #${escapeHtml(orderData.id)}</title>
        <style>${getPrintStyles(type)}</style>
      </head>
      <body>
        <div class="action-bar">
          <button class="action-btn print" onclick="window.print()">🖨️ Imprimir</button>
          <button class="action-btn close" onclick="window.close()">✕ Fechar</button>
        </div>
  `;

  html += renderHeader(companySettings, title);
  html += renderInfo(orderData, type);

  if (type === 'receipt') {
    html += renderReceiptItems(orderData.items, showPrices);
  } else {
    html += renderTableItems(orderData.items, showPrices);
  }

  html += renderTotals(orderData, showPrices);

  if (type === 'production') {
    html += renderProductionFields();
  } else {
    html += renderFooter();
  }

  html += '</body></html>';

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  // Don't auto-print on mobile to allow user to see the close button
};

export const printDailyReport = (
  orders: ServiceOrder[],
  total: number,
  companySettings: CompanySettings
): void => {
  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) return;

  printWindow.document.write('<html><head><title>Relatório de Vendas</title>');
  printWindow.document.write(`<style>
    body { font-family: 'Courier New', monospace; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
    th { font-weight: bold; }
    .text-right { text-align: right; }
    .total { margin-top: 20px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
    .action-bar { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; padding: 15px; background: #f0f0f0; border-radius: 10px; }
    .action-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .action-btn.print { background: #22c55e; }
    .action-btn.close { background: #ef4444; }
    @media print { .action-bar { display: none !important; } }
  </style></head><body>
  <div class="action-bar"><button class="action-btn print" onclick="window.print()">🖨️ Imprimir</button><button class="action-btn close" onclick="window.close()">✕ Fechar</button></div>`);

  const dailyPhones = [companySettings.phone, companySettings.phone2].filter(Boolean).join(' | ');
  printWindow.document.write(`
    <div class="header">
      <div style="font-weight: bold; font-size: 16px;">${escapeHtml(companySettings.name)}</div>
      <div>${escapeHtml(companySettings.address)}</div>
      <div>${escapeHtml(dailyPhones)}</div>
      <div style="margin-top: 10px;">RELATÓRIO DE VENDAS DO DIA</div>
      <div>${new Date().toLocaleDateString()}</div>
    </div>
  `);

  printWindow.document.write('<table>');
  printWindow.document.write('<thead><tr><th>Hora</th><th>Cliente</th><th>Itens</th><th class="text-right">Valor</th></tr></thead>');
  printWindow.document.write('<tbody>');

  orders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).forEach(order => {
    const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const items = order.items.map(i => `${i.quantity}x ${escapeHtml(i.name)}`).join(', ');
    printWindow.document.write(`<tr><td>${time}</td><td>${escapeHtml(order.customerName)}</td><td>${items}</td><td class="text-right">R$ ${order.total.toFixed(2)}</td></tr>`);
  });

  printWindow.document.write('</tbody></table>');
  printWindow.document.write(`<div class="total">TOTAL DO DIA: R$ ${total.toFixed(2)}</div>`);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
};

export const printReceivablesReport = (
  receivables: ServiceOrder[],
  companySettings: CompanySettings
): void => {
  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) return;

  printWindow.document.write('<html><head><title>Relatório de Contas a Receber</title>');
  printWindow.document.write('<style>body { font-family: monospace; padding: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 10px; } th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; } .text-right { text-align: right; } .total { margin-top: 20px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; } .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; } .action-bar { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; padding: 15px; background: #f0f0f0; border-radius: 10px; } .action-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); } .action-btn.print { background: #22c55e; } .action-btn.close { background: #ef4444; } @media print { .action-bar { display: none !important; } }</style></head><body><div class="action-bar"><button class="action-btn print" onclick="window.print()">🖨️ Imprimir</button><button class="action-btn close" onclick="window.close()">✕ Fechar</button></div>');
  const receivablesPhones = [companySettings.phone, companySettings.phone2].filter(Boolean).join(' | ');
  printWindow.document.write(`<div class="header"><div style="font-weight: bold; font-size: 16px;">${escapeHtml(companySettings.name)}</div><div>${escapeHtml(companySettings.address)}</div><div>${escapeHtml(receivablesPhones)}</div><div style="margin-top: 10px;">RELATÓRIO DE CONTAS A RECEBER</div><div>${new Date().toLocaleDateString()}</div></div>`);
  printWindow.document.write('<table><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th class="text-right">Total</th><th class="text-right">Pago</th><th class="text-right">Restante</th></tr></thead><tbody>');

  let totalSum = 0;
  receivables.forEach(order => {
    const paid = order.amountPaid || 0;
    const remaining = order.remainingAmount || (order.total - paid);
    totalSum += remaining;
    printWindow.document.write(`<tr><td>#${escapeHtml(order.id)}</td><td>${escapeHtml(order.customerName)}</td><td>${new Date(order.createdAt).toLocaleDateString()}</td><td class="text-right">R$ ${order.total.toFixed(2)}</td><td class="text-right">R$ ${paid.toFixed(2)}</td><td class="text-right font-bold">R$ ${remaining.toFixed(2)}</td></tr>`);
  });

  printWindow.document.write('</tbody></table>');
  printWindow.document.write(`<div class="total">TOTAL A RECEBER: R$ ${totalSum.toFixed(2)}</div>`);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
};
