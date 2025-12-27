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
    AlertCircle
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
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast({
                title: "Erro ao buscar instâncias",
                description: error.message,
                variant: "destructive",
            });
        } else {
            setTenants(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleUpdateSubscription = async () => {
        if (!selectedTenant || !newExpirationDate) return;

        const { error } = await supabase
            .from('tenants')
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
            fetchTenants();
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
            fetchTenants();
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
                <Button onClick={fetchTenants} disabled={loading} variant="outline" size="sm">
                    <RefreshCw className={loading ? "animate-spin mr-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                    Atualizar
                </Button>
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
                                                <span className="font-medium">{tenant.name}</span>
                                                <span className="text-xs text-muted-foreground">{tenant.slug}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(tenant.subscription_status, tenant.subscription_expires_at)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">{tenant.plan || 'Free'}</Badge>
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
                            Ajuste as configurações globais para {selectedTenant?.name}.
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

                        <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <UserIcon className="h-4 w-4" />
                                Informações do Proprietário
                            </Label>
                            <p className="text-xs text-muted-foreground truncate">ID: {selectedTenant?.owner_id}</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
