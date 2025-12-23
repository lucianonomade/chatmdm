import { describe, it, expect } from 'vitest';

describe('Customer Validation', () => {
  const validateCustomer = (customer: {
    name?: string;
    email?: string;
    phone?: string;
    doc?: string;
  }) => {
    const errors: Record<string, string> = {};

    if (!customer.name || customer.name.trim().length < 2) {
      errors.name = 'Nome deve ter no mínimo 2 caracteres';
    }

    if (customer.email && !customer.email.includes('@')) {
      errors.email = 'Email inválido';
    }

    if (customer.phone && customer.phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Telefone deve ter pelo menos 10 dígitos';
    }

    if (customer.doc) {
      const cleanDoc = customer.doc.replace(/\D/g, '');
      if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
        errors.doc = 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  it('validates correct customer data', () => {
    const result = validateCustomer({
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
    });
    expect(result.isValid).toBe(true);
  });

  it('requires name', () => {
    const result = validateCustomer({ name: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('validates email format', () => {
    const result = validateCustomer({
      name: 'João Silva',
      email: 'invalid-email',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Email inválido');
  });

  it('validates phone length', () => {
    const result = validateCustomer({
      name: 'João Silva',
      phone: '12345',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.phone).toBeDefined();
  });

  it('validates CPF length', () => {
    const result = validateCustomer({
      name: 'João Silva',
      doc: '123.456.789',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.doc).toBeDefined();
  });

  it('accepts valid CPF', () => {
    const result = validateCustomer({
      name: 'João Silva',
      doc: '123.456.789-01',
    });
    expect(result.isValid).toBe(true);
  });

  it('accepts valid CNPJ', () => {
    const result = validateCustomer({
      name: 'Empresa LTDA',
      doc: '12.345.678/0001-90',
    });
    expect(result.isValid).toBe(true);
  });
});

describe('Product Validation', () => {
  const validateProduct = (product: {
    name?: string;
    category?: string;
    price?: number;
    stock?: number;
  }) => {
    const errors: Record<string, string> = {};

    if (!product.name || product.name.trim().length < 2) {
      errors.name = 'Nome do produto é obrigatório';
    }

    if (!product.category || product.category.trim().length === 0) {
      errors.category = 'Categoria é obrigatória';
    }

    if (product.price === undefined || product.price < 0) {
      errors.price = 'Preço deve ser maior ou igual a zero';
    }

    if (product.stock !== undefined && product.stock < 0) {
      errors.stock = 'Estoque não pode ser negativo';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  it('validates correct product', () => {
    const result = validateProduct({
      name: 'Banner 1x1m',
      category: 'Impressão Digital',
      price: 50,
      stock: 10,
    });
    expect(result.isValid).toBe(true);
  });

  it('requires product name', () => {
    const result = validateProduct({
      name: '',
      category: 'Impressão',
      price: 50,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('requires category', () => {
    const result = validateProduct({
      name: 'Banner',
      category: '',
      price: 50,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });

  it('rejects negative price', () => {
    const result = validateProduct({
      name: 'Banner',
      category: 'Impressão',
      price: -10,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBeDefined();
  });

  it('rejects negative stock', () => {
    const result = validateProduct({
      name: 'Banner',
      category: 'Impressão',
      price: 50,
      stock: -5,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.stock).toBeDefined();
  });

  it('accepts zero price for free items', () => {
    const result = validateProduct({
      name: 'Brinde',
      category: 'Promoção',
      price: 0,
    });
    expect(result.isValid).toBe(true);
  });
});

describe('Supplier Validation', () => {
  const validateSupplier = (supplier: {
    name?: string;
    email?: string;
    phone?: string;
  }) => {
    const errors: Record<string, string> = {};

    if (!supplier.name || supplier.name.trim().length < 2) {
      errors.name = 'Nome do fornecedor é obrigatório';
    }

    if (supplier.email && !supplier.email.includes('@')) {
      errors.email = 'Email inválido';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  it('validates correct supplier', () => {
    const result = validateSupplier({
      name: 'Fornecedor ABC',
      email: 'contato@fornecedor.com',
      phone: '11999999999',
    });
    expect(result.isValid).toBe(true);
  });

  it('requires supplier name', () => {
    const result = validateSupplier({ name: '' });
    expect(result.isValid).toBe(false);
  });

  it('validates email if provided', () => {
    const result = validateSupplier({
      name: 'Fornecedor ABC',
      email: 'invalid',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });
});
