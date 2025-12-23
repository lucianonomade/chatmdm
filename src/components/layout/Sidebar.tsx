import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Truck,
  ClipboardList,
  LogOut,
  DollarSign,
  AlertTriangle,
  X,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", roles: ['admin', 'manager', 'seller'] },
  { icon: ShoppingCart, label: "PDV / Vendas", path: "/vendas", roles: ['admin', 'manager', 'seller'] },
  { icon: ClipboardList, label: "Produção", path: "/ordens-servico", roles: ['admin', 'manager', 'seller'] },
  { icon: Users, label: "Clientes", path: "/clientes", roles: ['admin', 'manager', 'seller'] },
  { icon: Package, label: "Produtos", path: "/produtos", roles: ['admin', 'manager', 'seller'] },
  { icon: DollarSign, label: "Caixa", path: "/caixa", roles: ['admin', 'manager'] },
  { icon: AlertTriangle, label: "Contas a Receber", path: "/contas-receber", roles: ['admin', 'manager'] },
  { icon: Wallet, label: "Financeiro", path: "/financeiro", roles: ['admin', 'manager'] },
  { icon: Truck, label: "Fornecedores", path: "/fornecedores", roles: ['admin', 'manager'] },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", roles: ['admin', 'manager'] },
  { icon: Settings, label: "Ajustes", path: "/configuracoes", roles: ['admin'] },
  { icon: BookOpen, label: "Manual", path: "/manual", roles: ['admin', 'manager', 'seller'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser, signOut } = useAuth();
  const { settings: companySettings } = useCompanySettings();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Filter menu based on user role
  // While authUser is loading, show all items that include 'seller' role (most basic access)
  const userRole = authUser?.role ?? 'seller';
  const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

  const handleLogout = async () => {
    try {
      await signOut();
      toast({ title: "Até logo!", description: "Sessão encerrada com sucesso." });
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even on error
      navigate("/auth", { replace: true });
    }
  };

  const getUserInitials = () => {
    if (!authUser) return "??";
    const names = authUser.name.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return authUser.name.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = () => {
    if (!authUser) return "";
    switch (authUser.role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'seller': return 'Vendedor';
      default: return '';
    }
  };

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (isMobile) {
      onClose();
    }
  };

  // On mobile, always show full sidebar (not collapsed)
  // On tablet, always show collapsed sidebar
  const showLabels = isMobile || (!collapsed && !isTablet);
  const effectiveCollapsed = isTablet ? true : collapsed;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-sidebar transition-all duration-300 flex flex-col",
          // Mobile: slide in/out
          isMobile && (isOpen ? "translate-x-0" : "-translate-x-full"),
          // Desktop & Tablet: always visible
          !isMobile && "translate-x-0",
          // Width - tablet always collapsed
          isMobile ? "w-64" : (effectiveCollapsed ? "w-16" : "w-64")
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-2 bg-sidebar-header">
          {showLabels && (
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              {companySettings?.logoUrl ? (
                <img 
                  src={companySettings.logoUrl} 
                  alt="Logo" 
                  className="h-10 max-w-[140px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-sm">GE</span>
                  </div>
                  <span className="font-semibold text-sidebar-header-foreground truncate">
                    {companySettings?.name || 'Gráfica Express'}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Close button on mobile */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-sidebar-header-foreground hover:bg-sidebar-accent h-8 w-8 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          {/* Collapse button on desktop (not tablet) */}
          {!isMobile && !isTablet && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="text-sidebar-header-foreground hover:bg-sidebar-accent h-8 w-8 flex-shrink-0"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {filteredMenu.map((item) => {
              const isActive = location.pathname === item.path;
              const NavItem = (
                <li key={item.path + item.label}>
                  <Link
                    to={item.path}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-sidebar-foreground hover:bg-hover/20 hover:text-hover"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "animate-scale-in")} />
                    {showLabels && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                </li>
              );

              if (!showLabels) {
                return (
                  <Tooltip key={item.path + item.label} delayDuration={0}>
                    <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return NavItem;
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="border-t border-sidebar-border p-3 pb-safe mt-auto">
          <div className={cn("flex items-center gap-3", !showLabels && "justify-center")}>
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <span className="text-sidebar-foreground text-sm font-medium">{getUserInitials()}</span>
            </div>
            {showLabels && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {authUser?.name || 'Usuário'}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{getRoleLabel()}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive h-9 px-3 gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-xs">Sair</span>
                </Button>
              </>
            )}
          </div>
          {!showLabels && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-full mt-2 text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive h-8"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Sair do sistema
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </>
  );
}
