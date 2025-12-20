import { Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TrialBannerProps {
  daysRemaining: number;
}

export function TrialBanner({ daysRemaining }: TrialBannerProps) {
  if (daysRemaining > 3) return null;

  const isUrgent = daysRemaining <= 1;

  return (
    <Alert 
      variant={isUrgent ? "destructive" : "default"} 
      className={`mb-4 ${isUrgent ? 'border-destructive bg-destructive/10' : 'border-amber-500 bg-amber-500/10'}`}
    >
      <Clock className={`h-4 w-4 ${isUrgent ? 'text-destructive' : 'text-amber-500'}`} />
      <AlertDescription className={isUrgent ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}>
        {daysRemaining === 0 
          ? "Seu período de teste expira hoje!"
          : daysRemaining === 1 
            ? "Seu período de teste expira amanhã!"
            : `Seu período de teste expira em ${daysRemaining} dias.`
        }
        {" "}Entre em contato para continuar usando o sistema.
      </AlertDescription>
    </Alert>
  );
}
