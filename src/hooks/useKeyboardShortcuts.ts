import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface KeyboardShortcutsOptions {
  onOpenSearch: () => void;
  onNewSale?: () => void;
}

export function useKeyboardShortcuts({ onOpenSearch, onNewSale }: KeyboardShortcutsOptions) {
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K - Open search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        onOpenSearch();
        return;
      }

      // F2 - New sale (navigate to PDV)
      if (event.key === "F2") {
        event.preventDefault();
        if (onNewSale) {
          onNewSale();
        } else {
          navigate("/vendas");
        }
        return;
      }

      // Alt+1 through Alt+9 for quick navigation
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const routes: Record<string, string> = {
          "1": "/",
          "2": "/vendas",
          "3": "/ordens-servico",
          "4": "/clientes",
          "5": "/produtos",
          "6": "/financeiro",
          "7": "/caixa",
          "8": "/relatorios",
          "9": "/configuracoes",
        };

        if (routes[event.key]) {
          event.preventDefault();
          navigate(routes[event.key]);
        }
      }
    },
    [onOpenSearch, onNewSale, navigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
