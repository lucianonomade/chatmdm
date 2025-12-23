import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { MaskedInput } from "@/components/ui/masked-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, User, Printer, Bell, Edit, Palette, Upload, ImageIcon, Package, Trash2, Loader2, Download, HelpCircle, UserPlus, KeyRound, UserX, UserCheck } from "lucide-react";
import { SoundSettingsCard } from "@/components/SoundSettingsCard";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/store";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useSupabaseUsers } from "@/hooks/useSupabaseUsers";
import { User as UserType } from "@/lib/types";
import { toast } from "sonner";
import { BackupDialog } from "@/components/BackupDialog";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { OnboardingDialog, useOnboarding } from "@/components/OnboardingDialog";
import { useAuth } from "@/hooks/useAuth";

// Preset color themes
const COLOR_PRESETS = [
  { name: "Azul Profissional", primary: "221 83% 53%", sidebar: "222 47% 11%", hover: "221 83% 53%" },
  { name: "Verde Esmeralda", primary: "160 84% 39%", sidebar: "160 50% 15%", hover: "160 84% 39%" },
  { name: "Roxo Moderno", primary: "280 67% 55%", sidebar: "280 50% 15%", hover: "280 67% 55%" },
  { name: "Laranja Vibrante", primary: "24 95% 53%", sidebar: "24 50% 15%", hover: "24 95% 53%" },
  { name: "Vermelho Elegante", primary: "0 72% 51%", sidebar: "0 50% 15%", hover: "0 72% 51%" },
  { name: "Ciano Tech", primary: "199 89% 48%", sidebar: "199 50% 15%", hover: "199 89% 48%" },
];

export default function Configuracoes() {
  const { companySettings, updateCompanySettings } = useStore();
  const { 
    settings: cloudSettings, 
    updateSettings: updateCloudSettings, 
    isLoading: isLoadingCloud,
    isUpdating: isUpdatingSettings 
  } = useCompanySettings();
  const { 
    users: supabaseUsers, 
    isLoading: isLoadingUsers, 
    updateUserRole, 
    updateUserName,
    createUser,
    toggleUserStatus,
    isUpdatingRole,
    isUpdatingName,
    isCreatingUser,
    isTogglingStatus 
  } = useSupabaseUsers();
  const { authUser } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Company form state
  const [companyData, setCompanyData] = useState({
    name: "",
    cnpj: "",
    phone: "",
    phone2: "",
    email: "",
    address: "",
  });

  // Stock settings state
  const [usesStock, setUsesStock] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Print settings state
  const [printLogoOnReceipts, setPrintLogoOnReceipts] = useState(true);
  const [autoPrintOnSale, setAutoPrintOnSale] = useState(false);

  // Notification settings state
  const [notifyLowStock, setNotifyLowStock] = useState(true);
  const [notifyNewSales, setNotifyNewSales] = useState(true);
  const [notifyPendingPayments, setNotifyPendingPayments] = useState(true);
  const [notifyOrderStatus, setNotifyOrderStatus] = useState(true);

  // User form state
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userData, setUserData] = useState({
    name: "",
    role: "seller" as "admin" | "manager" | "seller",
  });

  // Create user dialog state
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    name: "",
    role: "seller" as "admin" | "manager" | "seller",
  });

  // Reset password dialog state
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserType | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Theme state
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>("#3b82f6");
  const [customSidebarColor, setCustomSidebarColor] = useState<string>("#0f172a");
  const [customHoverColor, setCustomHoverColor] = useState<string>("#3b82f6");
  const [customSidebarHeaderColor, setCustomSidebarHeaderColor] = useState<string>("#ffffff");
  const [loginHeaderColor, setLoginHeaderColor] = useState<string>("#ffffff");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Backup dialog state
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);

  // Onboarding
  const { showOnboarding, setShowOnboarding, resetOnboarding } = useOnboarding();

  // Load company settings on mount
  useEffect(() => {
    setCompanyData({
      name: companySettings.name || "",
      cnpj: companySettings.cnpj || "",
      phone: companySettings.phone || "",
      phone2: companySettings.phone2 || "",
      email: companySettings.email || "",
      address: companySettings.address || "",
    });
    setLogoPreview(companySettings.logoUrl || null);
    setLoginHeaderColor(companySettings.loginHeaderColor || "#ffffff");
    // Load theme settings
    if (companySettings.theme) {
      if (companySettings.theme.primaryColor) {
        setCustomPrimaryColor(hslToHex(companySettings.theme.primaryColor));
      }
      if (companySettings.theme.sidebarColor) {
        setCustomSidebarColor(hslToHex(companySettings.theme.sidebarColor));
      }
      if (companySettings.theme.hoverColor) {
        setCustomHoverColor(hslToHex(companySettings.theme.hoverColor));
      }
      if (companySettings.theme.sidebarHeaderColor) {
        setCustomSidebarHeaderColor(hslToHex(companySettings.theme.sidebarHeaderColor));
      }
    }
  }, [companySettings]);

  // Load cloud settings
  useEffect(() => {
    if (cloudSettings) {
      setUsesStock(cloudSettings.usesStock ?? true);
      setLowStockThreshold(cloudSettings.lowStockThreshold ?? 10);
      // Print settings
      setPrintLogoOnReceipts(cloudSettings.printLogoOnReceipts ?? true);
      setAutoPrintOnSale(cloudSettings.autoPrintOnSale ?? false);
      // Notification settings
      setNotifyLowStock(cloudSettings.notifyLowStock ?? true);
      setNotifyNewSales(cloudSettings.notifyNewSales ?? true);
      setNotifyPendingPayments(cloudSettings.notifyPendingPayments ?? true);
      setNotifyOrderStatus(cloudSettings.notifyOrderStatus ?? true);
    }
  }, [cloudSettings]);

  const handleSaveCompany = () => {
    updateCompanySettings(companyData);
    updateCloudSettings(companyData);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 2MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        updateCompanySettings({ logoUrl: base64 });
        toast.success("Logotipo atualizado!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    updateCompanySettings({ logoUrl: undefined });
    toast.success("Logotipo removido!");
  };

  // Convert hex to HSL
  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "221 83% 53%";
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Convert HSL string to hex
  const hslToHex = (hslStr: string): string => {
    const parts = hslStr.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    if (!parts) return "#3b82f6";
    
    const h = parseInt(parts[1]) / 360;
    const s = parseInt(parts[2]) / 100;
    const l = parseInt(parts[3]) / 100;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const handleApplyTheme = (preset: typeof COLOR_PRESETS[0]) => {
    setSelectedPreset(preset.name);
    
    // Update custom color inputs with preset colors for preview
    setCustomPrimaryColor(hslToHex(preset.primary));
    setCustomSidebarColor(hslToHex(preset.sidebar));
    setCustomHoverColor(hslToHex(preset.hover));
    
    updateCompanySettings({
      theme: {
        primaryColor: preset.primary,
        sidebarColor: preset.sidebar,
        hoverColor: preset.hover,
      }
    });
    
    document.documentElement.style.setProperty('--primary', preset.primary);
    document.documentElement.style.setProperty('--sidebar-background', preset.sidebar);
    document.documentElement.style.setProperty('--hover', preset.hover);
    
    toast.success(`Tema "${preset.name}" aplicado!`);
  };

  const handleApplyCustomColors = () => {
    setSelectedPreset(null);
    const primaryHsl = hexToHsl(customPrimaryColor);
    const sidebarHsl = hexToHsl(customSidebarColor);
    const hoverHsl = hexToHsl(customHoverColor);
    const sidebarHeaderHsl = hexToHsl(customSidebarHeaderColor);
    
    updateCompanySettings({
      theme: {
        primaryColor: primaryHsl,
        sidebarColor: sidebarHsl,
        hoverColor: hoverHsl,
        sidebarHeaderColor: sidebarHeaderHsl,
      }
    });
    
    document.documentElement.style.setProperty('--primary', primaryHsl);
    document.documentElement.style.setProperty('--sidebar-background', sidebarHsl);
    document.documentElement.style.setProperty('--hover', hoverHsl);
    document.documentElement.style.setProperty('--sidebar-header-background', sidebarHeaderHsl);
    
    toast.success("Cores personalizadas aplicadas!");
  };

  const handleOpenUserDialog = (user: UserType) => {
    setEditingUser(user);
    setUserData({ name: user.name, role: user.role });
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!userData.name || !editingUser) {
      toast.error("Preencha o nome do usuário");
      return;
    }

    // Update name if changed
    if (userData.name !== editingUser.name) {
      updateUserName({ userId: editingUser.id, name: userData.name });
    }
    
    // Update role if changed
    if (userData.role !== editingUser.role) {
      updateUserRole({ userId: editingUser.id, role: userData.role });
    }

    setIsUserDialogOpen(false);
    setUserData({ name: "", role: "seller" });
    setEditingUser(null);
  };

  const handleOpenResetPassword = (user: UserType) => {
    setResetPasswordUser(user);
    setNewPassword("");
    setIsResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) {
      toast.error("Nova senha é obrigatória");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsResettingPassword(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({ 
            userId: resetPasswordUser.id, 
            newPassword 
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao resetar senha');
      }

      toast.success(`Senha do usuário ${resetPasswordUser.name} foi alterada!`);
      setIsResetPasswordDialogOpen(false);
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || "Erro ao resetar senha");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'seller': return 'Vendedor';
      default: return role;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive';
      case 'manager': return 'bg-warning/10 text-warning';
      case 'seller': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Loading skeleton for users
  const UsersSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );

  return (
    <MainLayout title="Configurações">
      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 flex-wrap">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <User className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="estoque" className="gap-2">
            <Package className="h-4 w-4" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="impressao" className="gap-2">
            <Printer className="h-4 w-4" />
            Impressão
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="personalizacao" className="gap-2">
            <Palette className="h-4 w-4" />
            Personalização
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Dados da Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input 
                    placeholder="Gráfica Rápida XYZ" 
                    value={companyData.name}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <MaskedInput 
                    mask="cnpj"
                    placeholder="00.000.000/0001-00" 
                    value={companyData.cnpj}
                    onChange={(value) => setCompanyData({ ...companyData, cnpj: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <MaskedInput 
                    mask="phone"
                    placeholder="(00) 0000-0000" 
                    value={companyData.phone}
                    onChange={(value) => setCompanyData({ ...companyData, phone: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone 2</Label>
                  <MaskedInput 
                    mask="phone"
                    placeholder="(00) 0000-0000" 
                    value={companyData.phone2}
                    onChange={(value) => setCompanyData({ ...companyData, phone2: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    placeholder="contato@grafica.com" 
                    value={companyData.email}
                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input 
                    placeholder="Rua, Número, Bairro - Cidade/UF" 
                    value={companyData.address}
                    onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Backup and Support Section */}
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold mb-4">Ferramentas</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setBackupDialogOpen(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Backup / Exportar Dados
                </Button>
                <Button variant="outline" onClick={resetOnboarding}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  VER TUTORIAL
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="gradient-primary text-primary-foreground" onClick={handleSaveCompany}>
                Salvar Alterações
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Gerenciar Usuários</h3>
                <p className="text-sm text-muted-foreground">
                  Usuários cadastrados no sistema.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ChangePasswordDialog />
                {authUser?.role === 'admin' && (
                  <Button onClick={() => {
                    // Pre-fill with admin's email for easier management
                    const adminEmail = authUser?.email || '';
                    // Generate a unique email suffix based on timestamp
                    const uniqueSuffix = Date.now().toString().slice(-6);
                    const generatedEmail = adminEmail 
                      ? adminEmail.replace('@', `+vendedor${uniqueSuffix}@`)
                      : `vendedor${uniqueSuffix}@empresa.local`;
                    setNewUserData({ 
                      email: generatedEmail, 
                      password: "", 
                      name: "", 
                      role: "seller" 
                    });
                    setIsCreateUserDialogOpen(true);
                  }}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </Button>
                )}
              </div>
            </div>
            
            {isLoadingUsers ? (
              <UsersSkeleton />
            ) : supabaseUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">Nenhum usuário cadastrado</p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Novo Usuário" para cadastrar o primeiro usuário.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {supabaseUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                      user.active ? 'bg-muted/50' : 'bg-destructive/5 border border-destructive/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        user.active ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <User className={`h-5 w-5 ${user.active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${!user.active ? 'text-muted-foreground' : ''}`}>
                            {user.name}
                          </p>
                          {!user.active && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {authUser?.role === 'admin' && user.role !== 'admin' && (
                        <>
                          <Button 
                            variant={user.active ? "outline" : "default"}
                            size="sm" 
                            onClick={() => toggleUserStatus({ userId: user.id, active: !user.active })}
                            title={user.active ? "Desativar Usuário" : "Ativar Usuário"}
                            disabled={isTogglingStatus}
                          >
                            {user.active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleOpenResetPassword(user)}
                            title="Resetar Senha"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenUserDialog(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Create User Dialog */}
          <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-user-name">Nome</Label>
                  <Input
                    id="new-user-name"
                    placeholder="Nome completo"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-email">Email</Label>
                  <Input
                    id="new-user-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    disabled
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email do administrador será usado para recuperação de senha
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-password">Senha</Label>
                  <Input
                    id="new-user-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-role">Função</Label>
                  <Select
                    value={newUserData.role}
                    onValueChange={(value: "manager" | "seller") => 
                      setNewUserData({ ...newUserData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="seller">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (!newUserData.name.trim()) {
                      toast.error("Nome é obrigatório");
                      return;
                    }
                    if (!newUserData.email.trim()) {
                      toast.error("Email é obrigatório");
                      return;
                    }
                    if (newUserData.password.length < 6) {
                      toast.error("A senha deve ter pelo menos 6 caracteres");
                      return;
                    }
                    createUser({
                      email: newUserData.email,
                      password: newUserData.password,
                      name: newUserData.name,
                      role: newUserData.role,
                    });
                    setNewUserData({ email: "", password: "", name: "", role: "seller" });
                    setIsCreateUserDialogOpen(false);
                  }}
                  disabled={isCreatingUser}
                >
                  {isCreatingUser ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    "Cadastrar"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resetar Senha</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    Você está alterando a senha do usuário:
                  </p>
                  <p className="font-medium">{resetPasswordUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{resetPasswordUser?.email}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleResetPassword}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    "Alterar Senha"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="estoque">
          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Configurações de Estoque</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Controle de Estoque</p>
                  <p className="text-sm text-muted-foreground">
                    Ativar controle de estoque para produtos. Quando desativado, o estoque não será decrementado nas vendas.
                  </p>
                </div>
                <Switch 
                  checked={usesStock} 
                  onCheckedChange={(checked) => {
                    setUsesStock(checked);
                    updateCloudSettings({ usesStock: checked });
                  }} 
                />
              </div>
              
              {usesStock && (
                <>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Limite de Estoque Baixo</p>
                      <p className="text-sm text-muted-foreground">
                        Quantidade mínima para alertar sobre estoque baixo
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number"
                        className="w-24 text-center"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateCloudSettings({ lowStockThreshold })}
                        disabled={isUpdatingSettings}
                      >
                        {isUpdatingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Alertas de Estoque Baixo</p>
                      <p className="text-sm text-muted-foreground">
                        Exibir alertas quando produtos atingirem estoque mínimo
                      </p>
                    </div>
                    <Switch 
                      checked={notifyLowStock}
                      onCheckedChange={(checked) => {
                        setNotifyLowStock(checked);
                        updateCloudSettings({ notifyLowStock: checked });
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Histórico de Movimentações</p>
                      <p className="text-sm text-muted-foreground">
                        Registrar todas as entradas e saídas de estoque automaticamente
                      </p>
                    </div>
                    <Switch defaultChecked disabled />
                  </div>
                </>
              )}
            </div>
            
            {!usesStock && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning">
                  ⚠️ Com o controle de estoque desativado, o sistema não decrementará automaticamente 
                  a quantidade de produtos ao realizar vendas. Útil para empresas de serviços ou 
                  que não precisam de controle de inventário.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="impressao">
          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Configurações de Impressão</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Imprimir Logo nos Recibos</p>
                  <p className="text-sm text-muted-foreground">Incluir logo da empresa nos documentos impressos</p>
                </div>
                <Switch 
                  checked={printLogoOnReceipts}
                  onCheckedChange={(checked) => {
                    setPrintLogoOnReceipts(checked);
                    updateCloudSettings({ printLogoOnReceipts: checked });
                  }}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Impressão Automática</p>
                  <p className="text-sm text-muted-foreground">Imprimir automaticamente ao finalizar venda</p>
                </div>
                <Switch 
                  checked={autoPrintOnSale}
                  onCheckedChange={(checked) => {
                    setAutoPrintOnSale(checked);
                    updateCloudSettings({ autoPrintOnSale: checked });
                  }}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Preferências de Notificação</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Estoque Baixo</p>
                  <p className="text-sm text-muted-foreground">Alertar quando produto atingir estoque mínimo</p>
                </div>
                <Switch 
                  checked={notifyLowStock}
                  onCheckedChange={(checked) => {
                    setNotifyLowStock(checked);
                    updateCloudSettings({ notifyLowStock: checked });
                  }}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Novas Vendas</p>
                  <p className="text-sm text-muted-foreground">Notificar sobre novas vendas realizadas</p>
                </div>
                <Switch 
                  checked={notifyNewSales}
                  onCheckedChange={(checked) => {
                    setNotifyNewSales(checked);
                    updateCloudSettings({ notifyNewSales: checked });
                  }}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Pagamentos Pendentes</p>
                  <p className="text-sm text-muted-foreground">Alertar sobre clientes com pagamentos em atraso</p>
                </div>
                <Switch 
                  checked={notifyPendingPayments}
                  onCheckedChange={(checked) => {
                    setNotifyPendingPayments(checked);
                    updateCloudSettings({ notifyPendingPayments: checked });
                  }}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Status de Ordens</p>
                  <p className="text-sm text-muted-foreground">Notificar sobre mudanças no status das ordens</p>
                </div>
                <Switch 
                  checked={notifyOrderStatus}
                  onCheckedChange={(checked) => {
                    setNotifyOrderStatus(checked);
                    updateCloudSettings({ notifyOrderStatus: checked });
                  }}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="personalizacao" className="space-y-6">
          {/* Sound Settings Card */}
          <SoundSettingsCard />

          {/* Header Section */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Personalização Visual</h2>
              <p className="text-sm text-muted-foreground">Configure a identidade visual do seu sistema</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Logo Upload Card */}
            <Card className="p-6 border-2 hover:border-hover/50 hover:shadow-lg hover:shadow-hover/10 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Logotipo</h3>
                  <p className="text-xs text-muted-foreground">Identidade da empresa</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <div className="w-full aspect-square max-w-[180px] border-2 border-dashed border-border rounded-xl flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden group hover:border-primary/50 transition-all duration-300">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo" 
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-4">
                      <Upload className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">Arraste ou clique para enviar</p>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2 hover:bg-hover/10 hover:border-hover/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {logoPreview ? "Trocar" : "Enviar"}
                  </Button>
                  {logoPreview && (
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                      onClick={handleRemoveLogo}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">PNG, JPG ou SVG • Máx. 2MB</p>
              </div>
            </Card>

            {/* Preset Themes Card */}
            <Card className="p-6 border-2 hover:border-hover/50 hover:shadow-lg hover:shadow-hover/10 transition-all duration-300 lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Temas Pré-definidos</h3>
                  <p className="text-xs text-muted-foreground">Escolha um tema rápido</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleApplyTheme(preset)}
                    className={`group p-4 rounded-xl border-2 transition-all duration-300 text-left cursor-pointer hover:scale-[1.02] hover:shadow-lg ${
                      selectedPreset === preset.name 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg shadow-primary/10' 
                        : 'border-border hover:border-hover/50 hover:bg-hover/5 hover:shadow-hover/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-8 h-8 rounded-full shadow-inner ring-2 ring-white/20 group-hover:scale-110 transition-transform duration-300" 
                        style={{ background: `hsl(${preset.primary})` }}
                      />
                      <div 
                        className="w-8 h-8 rounded-full shadow-inner ring-2 ring-white/20 group-hover:scale-110 transition-transform duration-300" 
                        style={{ background: `hsl(${preset.sidebar})` }}
                      />
                    </div>
                    <p className="text-sm font-medium truncate">{preset.name}</p>
                    {selectedPreset === preset.name && (
                      <p className="text-xs text-primary mt-1">✓ Ativo</p>
                    )}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Custom Colors Card */}
          <Card className="p-6 border-2 hover:border-hover/50 hover:shadow-lg hover:shadow-hover/10 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Cores Personalizadas</h3>
                  <p className="text-xs text-muted-foreground">Defina suas próprias cores</p>
                </div>
              </div>
              <Button onClick={handleApplyCustomColors} className="gap-2">
                <Palette className="h-4 w-4" />
                Aplicar Cores
              </Button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3">
              {/* Primary Color */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-hover/30 hover:bg-hover/5 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <Label className="text-sm font-medium">Cor Principal</Label>
                </div>
                <p className="text-xs text-muted-foreground">Botões, links e destaques</p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      id="primary-color"
                      value={customPrimaryColor}
                      onChange={(e) => setCustomPrimaryColor(e.target.value)}
                      className="w-14 h-14 rounded-xl border-2 border-border cursor-pointer hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={customPrimaryColor}
                      onChange={(e) => setCustomPrimaryColor(e.target.value)}
                      className="font-mono text-sm"
                      maxLength={7}
                    />
                    <div 
                      className="h-8 rounded-lg shadow-inner" 
                      style={{ backgroundColor: customPrimaryColor }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Sidebar Color */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-hover/30 hover:bg-hover/5 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: customSidebarColor }} />
                  <Label className="text-sm font-medium">Barra Lateral</Label>
                </div>
                <p className="text-xs text-muted-foreground">Menu de navegação</p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      id="sidebar-color"
                      value={customSidebarColor}
                      onChange={(e) => setCustomSidebarColor(e.target.value)}
                      className="w-14 h-14 rounded-xl border-2 border-border cursor-pointer hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={customSidebarColor}
                      onChange={(e) => setCustomSidebarColor(e.target.value)}
                      className="font-mono text-sm"
                      maxLength={7}
                    />
                    <div 
                      className="h-8 rounded-lg shadow-inner" 
                      style={{ backgroundColor: customSidebarColor }}
                    />
                  </div>
                </div>
              </div>

              {/* Hover Color */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-hover/30 hover:bg-hover/5 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: customHoverColor }} />
                  <Label className="text-sm font-medium">Efeito Hover</Label>
                </div>
                <p className="text-xs text-muted-foreground">Botões, cards e tabelas</p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      id="hover-color"
                      value={customHoverColor}
                      onChange={(e) => setCustomHoverColor(e.target.value)}
                      className="w-14 h-14 rounded-xl border-2 border-border cursor-pointer hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={customHoverColor}
                      onChange={(e) => setCustomHoverColor(e.target.value)}
                      className="font-mono text-sm"
                      maxLength={7}
                    />
                    <div 
                      className="h-8 rounded-lg shadow-inner transition-all duration-300" 
                      style={{ backgroundColor: customHoverColor }}
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar Header Color */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-hover/30 hover:bg-hover/5 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: customSidebarHeaderColor }} />
                  <Label className="text-sm font-medium">Cabeçalho da Barra Lateral</Label>
                </div>
                <p className="text-xs text-muted-foreground">Área do logo e nome da empresa</p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      id="sidebar-header-color"
                      value={customSidebarHeaderColor}
                      onChange={(e) => setCustomSidebarHeaderColor(e.target.value)}
                      className="w-14 h-14 rounded-xl border-2 border-border cursor-pointer hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={customSidebarHeaderColor}
                      onChange={(e) => setCustomSidebarHeaderColor(e.target.value)}
                      className="font-mono text-sm"
                      maxLength={7}
                    />
                    <div 
                      className="h-8 rounded-lg shadow-inner transition-all duration-300" 
                      style={{ backgroundColor: customSidebarHeaderColor }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }}>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input 
                placeholder="Nome do usuário" 
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select value={userData.role} onValueChange={(v) => setUserData({ ...userData, role: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="seller">Vendedor</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Administradores têm acesso total. Gerentes podem ver relatórios e configurações. Vendedores só acessam suas próprias vendas.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="gradient-primary text-primary-foreground"
                disabled={isUpdatingRole || isUpdatingName}
              >
                {(isUpdatingRole || isUpdatingName) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Backup Dialog */}
      <BackupDialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen} />

      {/* Onboarding Dialog */}
      <OnboardingDialog 
        open={showOnboarding} 
        onOpenChange={setShowOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </MainLayout>
  );
}
