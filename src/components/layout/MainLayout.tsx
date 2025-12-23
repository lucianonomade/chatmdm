import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NotificationCenter } from "@/components/NotificationCenter";
import { TrialBanner } from "@/components/TrialBanner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTrial } from "@/hooks/useTrial";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { daysRemaining } = useTrial();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  useKeyboardShortcuts({
    onOpenSearch: () => setSearchOpen(true),
  });

  // On tablet, auto-collapse sidebar by default for more content space
  const effectiveSidebarCollapsed = isTablet ? true : sidebarCollapsed;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={effectiveSidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-300 overflow-x-hidden",
          // Desktop: margin based on sidebar collapsed state
          // Tablet: collapsed sidebar margin
          // Mobile: no margin (sidebar overlays)
          !isMobile && !isTablet && (sidebarCollapsed ? "ml-16" : "ml-64"),
          isTablet && "ml-16",
          isMobile && "ml-0"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-14 md:h-16 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-3 md:px-4 lg:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Hamburger menu - visible on mobile only */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            {title && <h1 className="text-base md:text-lg lg:text-xl font-semibold text-foreground truncate max-w-[200px] md:max-w-none">{title}</h1>}
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Search Button - Desktop & Tablet */}
            <Button
              variant="outline"
              className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground w-48 lg:w-64 justify-start h-9"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Buscar...</span>
              <kbd className="ml-auto pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Mobile Search */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <NotificationCenter />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 md:p-4 lg:p-6 animate-fade-in overflow-x-hidden min-w-0">
          <TrialBanner daysRemaining={daysRemaining} />
          <Breadcrumbs />
          {children}
        </main>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
