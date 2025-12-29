import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Building2,
    Calendar,
    ChevronRight,
    CreditCard,
    RefreshCw,
    ShieldCheck,
    User as UserIcon,
    AlertCircle,
    Mail,
    Building
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    owner_id: string;
    active: boolean;
    plan: string;
    subscription_status: string;
    subscription_expires_at: string | null;
    owner?: {
        name: string;
        email: string;
    };
    company_settings?: {
        name: string;
        email: string;
    }[];
}

export default function SaaSManagement() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [newExpirationDate, setNewExpirationDate] = useState("");
    const { toast } = useToast();

    const fetchTenants = async () => {
        setLoading(true);
        // @ts-ignore
        const { data, error } = await supabase.rpc('get_saas_dashboard_data');
        if (error) {
            console.error("RPC Error, falling back:", error);
            toast({
                title: "Atualização de Banco de Dados Necessária",
                description: "Execute o SQL de migração no Supabase para visualizar todos os tenants.",
                variant: "destructive",
            });
            await fetchTenantsFallback();
        } else {
            setTenants((data as any) || []);
            setLoading(false);
        }
    };

    const fetchTenantsFallback = async () => {
        setLoading(true);
        // 1. Fetch Tenants
        const { data: tenantsData, error: tenantsError } = await supabase
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });

        if (tenantsError) {
            console.error(tenantsError);
            toast({
                title: "Erro ao buscar instâncias",
                description: tenantsError.message,
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        if (!tenantsData || tenantsData.length === 0) {
            setTenants([]);
            setLoading(false);
            return;
        }

        const ownerIds = Array.from(new Set((tenantsData as any[]).map(t => t.owner_id).filter(Boolean)));
        const tenantIds = tenantsData.map(t => t.id);

        // 2. Fetch Profiles (Owners) manually to avoid FK issues
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', ownerIds);

        if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
        }

        // 3. Fetch Company Settings manually
        const { data: companiesData, error: companiesError } = await supabase
            .from('company_settings')
            .select('tenant_id, name, email')
            .in('tenant_id', tenantIds);

        if (companiesError) {
            console.error("Error fetching companies:", companiesError);
        }

        // 4. Merge Data
        const mergedTenants = (tenantsData as any[]).map(tenant => {
            const owner = profilesData?.find(p => p.id === tenant.owner_id);
            const company = companiesData?.find(c => c.tenant_id === tenant.id);

            return {
                ...tenant,
                owner: owner ? { name: owner.name, email: owner.email } : undefined,
                company_settings: company ? [{ name: company.name, email: company.email }] : []
            };
        });

        setTenants(mergedTenants as unknown as Tenant[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleUpdateSubscription = async () => {
        if (!selectedTenant || !newExpirationDate) return;

        const { error } = await supabase
            .from('tenants')
            // @ts-ignore
            .update({
                subscription_expires_at: new Date(newExpirationDate).toISOString(),
                subscription_status: 'active'
            })
            .eq('id', selectedTenant.id);

        if (error) {
            toast({
                title: "Erro ao atualizar",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Assinatura atualizada!",
                description: `A instância ${selectedTenant.name} foi renovada.`,
            });
            fetchTenants(); // Refresh data to get updates
            setIsDetailOpen(false);
        }
    };

    const toggleTenantStatus = async (tenant: Tenant) => {
        const { error } = await supabase
            .from('tenants')
            .update({ active: !tenant.active })
            .eq('id', tenant.id);

        if (error) {
            toast({
                title: "Erro ao alterar status",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: tenant.active ? "Instância desativada" : "Instância ativada",
                description: `A instância ${tenant.name} foi alterada com sucesso.`,
            });
            fetchTenants(); // Refresh data
        }
    };

    const getStatusBadge = (status: string, expiresAt: string | null) => {
        if (expiresAt && new Date(expiresAt) < new Date()) {
            return <Badge variant="destructive">Expirado</Badge>;
        }
        switch (status) {
            case 'active': return <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>;
            case 'past_due': return <Badge variant="destructive">Pendente</Badge>;
            case 'inactive': return <Badge variant="secondary">Inativo</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        Gestão SaaS
                    </h1>
                    <p className="text-muted-foreground mt-1">Controle global de instâncias e faturamento.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchTenants} disabled={loading} variant="outline" size="sm">
                        <RefreshCw className={loading ? "animate-spin mr-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                        Atualizar
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            Total de Instâncias
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenants.length}</div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-green-500" />
                            Assinaturas Ativas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tenants.filter(t => t.subscription_status === 'active' && (!t.subscription_expires_at || new Date(t.subscription_expires_at) > new Date())).length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            Expiradas / Inativas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tenants.filter(t => !t.active || (t.subscription_expires_at && new Date(t.subscription_expires_at) < new Date())).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Empresas Cadastradas</CardTitle>
                    <CardDescription>Lista completa de todos os tenants no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead>Responsável</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Plano</TableHead>
                                    <TableHead>Expiração</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenants.map((tenant) => (
                                    <TableRow key={tenant.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <Building className="h-3 w-3 text-muted-foreground" />
                                                    {tenant.company_settings?.[0]?.name || tenant.name}
                                                </div>
                                                <span className="text-xs text-muted-foreground">{tenant.slug}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <div className="flex items-center gap-2">
                                                    <UserIcon className="h-3 w-3 text-muted-foreground" />
                                                    <span>{tenant.owner?.name || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                    <Mail className="h-3 w-3" />
                                                    <span>{tenant.owner?.email || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(tenant.subscription_status, tenant.subscription_expires_at)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <Badge variant="outline" className="capitalize w-fit">{tenant.plan || 'Gratuito'}</Badge>
                                                <span className="text-[10px] text-muted-foreground mt-1">
                                                    {tenant.subscription_status === 'active' ? 'Pago' : 'Não Pago'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {tenant.subscription_expires_at ? (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(tenant.subscription_expires_at), "dd/MM/yyyy", { locale: ptBR })}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Vitalício</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedTenant(tenant);
                                                    setNewExpirationDate(tenant.subscription_expires_at ? tenant.subscription_expires_at.split('T')[0] : "");
                                                    setIsDetailOpen(true);
                                                }}
                                            >
                                                Gerenciar
                                                <ChevronRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Gerenciar Instância</DialogTitle>
                        <DialogDescription>
                            Ajuste as configurações globais para {selectedTenant?.company_settings?.[0]?.name || selectedTenant?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                                <Label className="text-base">Acesso ao Sistema</Label>
                                <p className="text-xs text-muted-foreground">Desative para bloquear o acesso da empresa.</p>
                            </div>
                            <Button
                                variant={selectedTenant?.active ? "destructive" : "default"}
                                size="sm"
                                onClick={() => selectedTenant && toggleTenantStatus(selectedTenant)}
                            >
                                {selectedTenant?.active ? "Desativar" : "Ativar"}
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expiration">Data de Expiração</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="expiration"
                                    type="date"
                                    value={newExpirationDate}
                                    onChange={(e) => setNewExpirationDate(e.target.value)}
                                />
                                <Button onClick={handleUpdateSubscription}>Salvar</Button>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <UserIcon className="h-4 w-4" />
                                Informações Detalhadas
                            </Label>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Proprietário</p>
                                    <p className="font-medium truncate">{selectedTenant?.owner?.name || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Email</p>
                                    <p className="font-medium truncate">{selectedTenant?.owner?.email || 'N/A'}</p>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <p className="text-muted-foreground">ID do Proprietário</p>
                                    <p className="font-mono text-[10px] text-muted-foreground truncate">{selectedTenant?.owner_id}</p>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <p className="text-muted-foreground">Empresa (Config)</p>
                                    <p className="font-medium">{selectedTenant?.company_settings?.[0]?.name || 'Não configurada'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ... unchanged styles

