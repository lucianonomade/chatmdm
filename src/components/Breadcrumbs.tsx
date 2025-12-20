import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeNames: Record<string, string> = {
  "": "Dashboard",
  "vendas": "PDV",
  "ordens-servico": "Ordens de Serviço",
  "clientes": "Clientes",
  "produtos": "Produtos",
  "fornecedores": "Fornecedores",
  "financeiro": "Financeiro",
  "caixa": "Caixa",
  "contas-receber": "Contas a Receber",
  "orcamentos": "Orçamentos",
  "recibos": "Recibos",
  "relatorios": "Relatórios",
  "configuracoes": "Configurações",
  "instalar": "Instalar App",
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNames[name] || name;

        return (
          <span key={name} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="text-foreground font-medium">{displayName}</span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-foreground transition-colors"
              >
                {displayName}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
