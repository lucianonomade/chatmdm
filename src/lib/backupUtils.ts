import * as XLSX from 'xlsx';
import { ServiceOrder } from "@/lib/store";
import { Customer, Product, Supplier, Expense, FixedExpense } from "@/lib/types";

interface ExportData {
  customers: Customer[];
  products: Product[];
  suppliers: Supplier[];
  orders: ServiceOrder[];
  expenses: Expense[];
  fixedExpenses: FixedExpense[];
}

// Export all data to Excel
export function exportToExcel(data: ExportData, companyName: string): void {
  const wb = XLSX.utils.book_new();

  // Customers sheet
  if (data.customers.length > 0) {
    const customersData = data.customers.map(c => ({
      'Nome': c.name,
      'Telefone': c.phone || '',
      'Email': c.email || '',
      'Documento': c.doc || '',
      'Observações': c.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(customersData);
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  }

  // Products sheet
  if (data.products.length > 0) {
    const productsData = data.products.map(p => ({
      'Nome': p.name,
      'Categoria': p.category,
      'Subcategoria': p.subcategory || '',
      'Preço': p.price,
      'Estoque': p.stock,
      'Tipo': p.type,
      'Descrição': p.description || ''
    }));
    const ws = XLSX.utils.json_to_sheet(productsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
  }

  // Suppliers sheet
  if (data.suppliers.length > 0) {
    const suppliersData = data.suppliers.map(s => ({
      'Nome': s.name,
      'Contato': s.contact || '',
      'Telefone': s.phone || '',
      'Email': s.email || ''
    }));
    const ws = XLSX.utils.json_to_sheet(suppliersData);
    XLSX.utils.book_append_sheet(wb, ws, 'Fornecedores');
  }

  // Orders sheet
  if (data.orders.length > 0) {
    const ordersData = data.orders.map(o => ({
      'ID': o.id,
      'Cliente': o.customerName,
      'Vendedor': o.sellerName || '',
      'Status': o.status,
      'Status Pagamento': o.paymentStatus,
      'Total': o.total,
      'Pago': o.amountPaid || 0,
      'Restante': o.remainingAmount || (o.total - (o.amountPaid || 0)),
      'Forma Pagamento': o.paymentMethod || '',
      'Data': new Date(o.createdAt).toLocaleDateString('pt-BR'),
      'Itens': o.items.map(i => `${i.quantity}x ${i.name}`).join('; ')
    }));
    const ws = XLSX.utils.json_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
  }

  // Expenses sheet
  if (data.expenses.length > 0) {
    const expensesData = data.expenses.map(e => ({
      'Descrição': e.description,
      'Valor': e.amount,
      'Categoria': e.category || '',
      'Fornecedor': e.supplierName || '',
      'Data': e.date ? new Date(e.date).toLocaleDateString('pt-BR') : ''
    }));
    const ws = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(wb, ws, 'Despesas');
  }

  // Fixed expenses sheet
  if (data.fixedExpenses.length > 0) {
    const fixedData = data.fixedExpenses.map(f => ({
      'Nome': f.name,
      'Valor': f.amount,
      'Dia Vencimento': f.dueDay,
      'Categoria': f.category || '',
      'Ativo': f.active ? 'Sim' : 'Não'
    }));
    const ws = XLSX.utils.json_to_sheet(fixedData);
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos Fixos');
  }

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const filename = `backup_${companyName.replace(/\s+/g, '_')}_${date}.xlsx`;

  // Download
  XLSX.writeFile(wb, filename);
}

// Export to JSON
export function exportToJSON(data: ExportData, companyName: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `backup_${companyName.replace(/\s+/g, '_')}_${date}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Validate and parse JSON backup
export function parseJSONBackup(jsonString: string): ExportData | null {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate structure
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    // Ensure all required arrays exist (can be empty)
    const result: ExportData = {
      customers: Array.isArray(data.customers) ? data.customers : [],
      products: Array.isArray(data.products) ? data.products : [],
      suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
      orders: Array.isArray(data.orders) ? data.orders : [],
      expenses: Array.isArray(data.expenses) ? data.expenses : [],
      fixedExpenses: Array.isArray(data.fixedExpenses) ? data.fixedExpenses : [],
    };
    
    return result;
  } catch (error) {
    console.error('Error parsing JSON backup:', error);
    return null;
  }
}

// Get backup stats
export function getBackupStats(data: ExportData): { label: string; count: number }[] {
  return [
    { label: 'Clientes', count: data.customers.length },
    { label: 'Produtos', count: data.products.length },
    { label: 'Fornecedores', count: data.suppliers.length },
    { label: 'Pedidos', count: data.orders.length },
    { label: 'Despesas', count: data.expenses.length },
    { label: 'Gastos Fixos', count: data.fixedExpenses.length },
  ];
}
