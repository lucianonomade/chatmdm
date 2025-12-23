import { describe, it, expect, vi } from 'vitest';

describe('Authentication Validation', () => {
  // Login schema validation
  const validateLogin = (name: string, password: string) => {
    const errors: Record<string, string> = {};
    
    if (!name || name.length < 2) {
      errors.name = 'Nome deve ter no mínimo 2 caracteres';
    }
    
    if (!password || password.length < 6) {
      errors.password = 'Senha deve ter no mínimo 6 caracteres';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Signup schema validation
  const validateSignup = (name: string, email: string, password: string, companyName: string) => {
    const errors: Record<string, string> = {};
    
    if (!name || name.length < 2) {
      errors.name = 'Nome deve ter no mínimo 2 caracteres';
    }
    
    if (!email || !email.includes('@') || !email.includes('.')) {
      errors.email = 'Email inválido';
    }
    
    if (!password || password.length < 6) {
      errors.password = 'Senha deve ter no mínimo 6 caracteres';
    }
    
    if (!companyName || companyName.length < 2) {
      errors.companyName = 'Nome da empresa deve ter no mínimo 2 caracteres';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  describe('Login Validation', () => {
    it('validates correct login credentials', () => {
      const result = validateLogin('Test User', '123456');
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('rejects short name', () => {
      const result = validateLogin('A', '123456');
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Nome deve ter no mínimo 2 caracteres');
    });

    it('rejects short password', () => {
      const result = validateLogin('Test User', '123');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Senha deve ter no mínimo 6 caracteres');
    });

    it('rejects empty name', () => {
      const result = validateLogin('', '123456');
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
    });

    it('rejects empty password', () => {
      const result = validateLogin('Test User', '');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBeDefined();
    });
  });

  describe('Signup Validation', () => {
    it('validates correct signup data', () => {
      const result = validateSignup('Test User', 'test@email.com', '123456', 'Test Company');
      expect(result.isValid).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = validateSignup('Test User', 'invalid-email', '123456', 'Test Company');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email inválido');
    });

    it('rejects email without domain', () => {
      const result = validateSignup('Test User', 'test@', '123456', 'Test Company');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email inválido');
    });

    it('rejects short company name', () => {
      const result = validateSignup('Test User', 'test@email.com', '123456', 'A');
      expect(result.isValid).toBe(false);
      expect(result.errors.companyName).toBe('Nome da empresa deve ter no mínimo 2 caracteres');
    });

    it('returns multiple errors', () => {
      const result = validateSignup('A', 'invalid', '123', 'B');
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBe(4);
    });
  });
});

describe('Password Security', () => {
  const isStrongPassword = (password: string): { isStrong: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    
    if (password.length < 8) {
      reasons.push('Deve ter pelo menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      reasons.push('Deve conter letra maiúscula');
    }
    if (!/[a-z]/.test(password)) {
      reasons.push('Deve conter letra minúscula');
    }
    if (!/[0-9]/.test(password)) {
      reasons.push('Deve conter número');
    }
    
    return {
      isStrong: reasons.length === 0,
      reasons,
    };
  };

  it('accepts strong password', () => {
    const result = isStrongPassword('Abc12345');
    expect(result.isStrong).toBe(true);
  });

  it('rejects short password', () => {
    const result = isStrongPassword('Abc123');
    expect(result.isStrong).toBe(false);
    expect(result.reasons).toContain('Deve ter pelo menos 8 caracteres');
  });

  it('rejects password without uppercase', () => {
    const result = isStrongPassword('abc12345');
    expect(result.isStrong).toBe(false);
    expect(result.reasons).toContain('Deve conter letra maiúscula');
  });

  it('rejects password without lowercase', () => {
    const result = isStrongPassword('ABC12345');
    expect(result.isStrong).toBe(false);
    expect(result.reasons).toContain('Deve conter letra minúscula');
  });

  it('rejects password without number', () => {
    const result = isStrongPassword('Abcdefgh');
    expect(result.isStrong).toBe(false);
    expect(result.reasons).toContain('Deve conter número');
  });
});
