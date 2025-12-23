import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useTrial } from "@/hooks/useTrial";
import { playClickSound } from "@/hooks/useClickSound";
import { useProducts } from "@/hooks/useProducts";
import { useAutoBackup } from "@/hooks/useAutoBackup";
import { useStore } from "@/lib/store";
import { Loader2 } from "lucide-react";
import { TrialExpiredScreen } from "@/components/TrialExpiredScreen";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Produtos from "./pages/Produtos";
import Clientes from "./pages/Clientes";
import Vendas from "./pages/Vendas";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import Orcamentos from "./pages/Orcamentos";
import OrdensServico from "./pages/OrdensServico";
import Recibos from "./pages/Recibos";
import Fornecedores from "./pages/Fornecedores";
import Configuracoes from "./pages/Configuracoes";
import Caixa from "./pages/Caixa";
import ContasReceber from "./pages/ContasReceber";
import ContasPagar from "./pages/ContasPagar";
import Instalar from "./pages/Instalar";
import ResetPassword from "./pages/ResetPassword";
import Manual from "./pages/Manual";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to initialize data sync, auto backup, theme, and global click sound
function DataSync() {
  useProducts();
  useAutoBackup(); // Initialize auto backup system
  const { companySettings } = useStore();

  // Apply saved theme colors on mount
  useEffect(() => {
    if (companySettings.theme) {
      const { primaryColor, sidebarColor, hoverColor, sidebarHeaderColor } = companySettings.theme;
      if (primaryColor) {
        document.documentElement.style.setProperty('--primary', primaryColor);
      }
      if (sidebarColor) {
        document.documentElement.style.setProperty('--sidebar-background', sidebarColor);
      }
      if (hoverColor) {
        document.documentElement.style.setProperty('--hover', hoverColor);
      }
      if (sidebarHeaderColor) {
        document.documentElement.style.setProperty('--sidebar-header-background', sidebarHeaderColor);
      }
    }
  }, [companySettings.theme]);

  // Global click sound (covers all clickable elements)
  useEffect(() => {
    const handler = (ev: Event) => {
      const target = ev.target as Element | null;
      if (!target) return;

      // Check if target or any ancestor is a clickable element
      const el = target.closest(
        "button, [role=\"button\"], a, input, textarea, select, [role=\"textbox\"], [role=\"combobox\"], [role=\"menuitem\"], [data-click-sound], [tabindex], .cursor-pointer",
      ) as HTMLElement | null;
      if (!el) return;

      // Avoid double-play if component handles its own sound
      if (el.dataset.soundLocal === "1") return;

      // Skip disabled elements
      if (el instanceof HTMLButtonElement && el.disabled) return;
      if (el.getAttribute("aria-disabled") === "true") return;

      playClickSound();
    };

    // click is more reliable for audio on mobile browsers
    document.addEventListener("click", handler, true);
    return () => {
      document.removeEventListener("click", handler, true);
    };
  }, []);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isLoading: trialLoading, isExpired } = useTrial();

  if (loading || trialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isExpired) {
    return <TrialExpiredScreen />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/instalar" element={<Instalar />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/vendas" element={<ProtectedRoute><Vendas /></ProtectedRoute>} />
      <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
      <Route path="/orcamentos" element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} />
      <Route path="/ordens-servico" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />
      <Route path="/recibos" element={<ProtectedRoute><Recibos /></ProtectedRoute>} />
      <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
      <Route path="/caixa" element={<ProtectedRoute><Caixa /></ProtectedRoute>} />
      <Route path="/contas-receber" element={<ProtectedRoute><ContasReceber /></ProtectedRoute>} />
      <Route path="/contas-pagar" element={<ProtectedRoute><ContasPagar /></ProtectedRoute>} />
      <Route path="/manual" element={<ProtectedRoute><Manual /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RouterShell() {
  const location = useLocation();

  // Important: avoid running data sync/background DOM manipulations on public/auth pages.
  const shouldRunDataSync = !["/auth", "/reset-password", "/instalar"].includes(location.pathname);

  return (
    <>
      {shouldRunDataSync ? <DataSync /> : null}
      <AppRoutes />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouterShell />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

