import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ShoppingCart, 
  Users, 
  Package, 
  BarChart3, 
  Settings,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: string;
}

const steps: OnboardingStep[] = [
  {
    title: "Bem-vindo ao Sistema!",
    description: "Este é seu novo sistema de gestão para gráfica. Vamos fazer um tour rápido pelas principais funcionalidades.",
    icon: Sparkles,
  },
  {
    title: "PDV - Ponto de Venda",
    description: "Aqui você cria vendas, orçamentos e pedidos. Selecione produtos por categoria, adicione ao carrinho e finalize a venda.",
    icon: ShoppingCart,
    highlight: "/vendas",
  },
  {
    title: "Cadastro de Clientes",
    description: "Mantenha todos os dados dos seus clientes organizados. Nome, telefone, email e histórico de compras.",
    icon: Users,
    highlight: "/clientes",
  },
  {
    title: "Produtos e Serviços",
    description: "Cadastre seus produtos e serviços com preços, categorias e variações. O sistema já vem com produtos pré-cadastrados!",
    icon: Package,
    highlight: "/produtos",
  },
  {
    title: "Relatórios e Análises",
    description: "Acompanhe vendas, estoque e inadimplência. Filtre por período e vendedor para análises detalhadas.",
    icon: BarChart3,
    highlight: "/relatorios",
  },
  {
    title: "Configurações",
    description: "Personalize o sistema com os dados da sua empresa, logo, e preferências de impressão.",
    icon: Settings,
    highlight: "/configuracoes",
  },
];

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function OnboardingDialog({ open, onOpenChange, onComplete }: OnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirst) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete();
    onOpenChange(false);
  };

  const handleSkip = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    onOpenChange(false);
  };

  // Mark as completed when dialog is closed by any means (including X button)
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      localStorage.setItem('onboardingCompleted', 'true');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md mx-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <step.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{step.title}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Passo {currentStep + 1} de {steps.length}
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <DialogDescription className="text-base leading-relaxed">
            {step.description}
          </DialogDescription>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentStep 
                    ? "w-6 bg-primary" 
                    : "w-2 bg-muted hover:bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={isFirst}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip}>
              Pular
            </Button>
            <Button onClick={handleNext} className="gap-1 gradient-primary text-primary-foreground">
              {isLast ? "Começar!" : "Próximo"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage onboarding state
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  useEffect(() => {
    // Check if tutorial was already completed
    const completed = localStorage.getItem('onboardingCompleted');
    // Check if user just logged in this session (set in Auth.tsx after login)
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    
    if (!completed && justLoggedIn) {
      // Show tutorial only on first login ever
      const timer = setTimeout(() => {
        setShowOnboarding(true);
        // Clear the flag so it doesn't show again on page refresh
        sessionStorage.removeItem('justLoggedIn');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem('onboardingCompleted');
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    setShowOnboarding,
    resetOnboarding,
  };
}
