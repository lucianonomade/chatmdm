import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatCNPJ, formatCPF, formatPhone, formatDocument } from "@/lib/masks";
import { cn } from "@/lib/utils";

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: 'cpf' | 'cnpj' | 'phone' | 'document';
  value: string;
  onChange: (value: string) => void;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onChange, className, ...props }, ref) => {
    const formatValue = (val: string): string => {
      switch (mask) {
        case 'cpf':
          return formatCPF(val);
        case 'cnpj':
          return formatCNPJ(val);
        case 'phone':
          return formatPhone(val);
        case 'document':
          return formatDocument(val);
        default:
          return val;
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatValue(e.target.value);
      onChange(formatted);
    };

    return (
      <Input
        ref={ref}
        value={formatValue(value)}
        onChange={handleChange}
        className={cn(className)}
        {...props}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";

export { MaskedInput };
