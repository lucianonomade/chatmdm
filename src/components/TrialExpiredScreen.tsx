import { useState, useEffect } from "react";
import { Lock, Phone, Mail, MessageCircle, CheckCircle2, Loader2, Copy, Check, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "@/components/ui/masked-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TrialExpiredScreen() {
  const { signOut, authUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string; id: string } | null>(null);
  const [showPixDialog, setShowPixDialog] = useState(false);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const [billingForm, setBillingForm] = useState({
    name: "",
    email: "",
    taxId: "",
    cellphone: "",
  });

  const handleContactWhatsApp = () => {
    const message = encodeURIComponent("Olá! Meu período de teste do sistema expirou e gostaria de contratar.");
    window.open(`https://wa.me/5500000000000?text=${message}`, '_blank');
  };

  const handleCreateBilling = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-abacate-billing', {
        body: {
          amount: 5000,
          description: 'Ativação do Sistema - Licença 30 dias',
          customer: {
            name: billingForm.name,
            email: billingForm.email,
            taxId: billingForm.taxId,
            cellphone: billingForm.cellphone
          }
        }
      });

      if (error) {
        console.error('Edge Function Error Details:', error);
        throw new Error(error.message || "Erro no servidor de pagamentos");
      }

      if (data.qrCode) {
        setPixData(data);
        setShowPixDialog(true);
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error creating billing:', error);
      toast.error(error.message || "Erro ao gerar cobrança");
    } finally {
      setLoading(false);
    }
  };

  const startBillingProcess = () => {
    setBillingForm({
      name: authUser?.name || "",
      email: authUser?.email || "",
      taxId: "",
      cellphone: "",
    });
    setShowBillingForm(true);
  };

  const copyToClipboard = () => {
    if (pixData?.copyPaste) {
      navigator.clipboard.writeText(pixData.copyPaste);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Poll for payment status
  useEffect(() => {
    let interval: number;
    if (showPixDialog && pixData?.id) {
      interval = window.setInterval(async () => {
        const { data } = await supabase
          .from('tenant_payments')
          .select('status')
          .eq('abacate_billing_id', pixData.id)
          .single();

        if (data?.status === 'PAID') {
          toast.success("Pagamento confirmado! Reiniciando...");
          window.location.reload();
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [showPixDialog, pixData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-destructive/20 overflow-hidden">
        <div className="h-2 bg-destructive" />
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
            Acesso Bloqueado
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Seu período de teste de 7 dias terminou. Para continuar utilizando o sistema, ative sua assinatura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm font-medium text-primary">Plano Profissional</p>
                <p className="text-2xl font-bold">R$ 50,00</p>
              </div>
              <div className="p-2 bg-background rounded-lg border">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2 mb-4">
              <li className="flex items-center gap-2">✓ Acesso ilimitado a todas as funções</li>
              <li className="flex items-center gap-2">✓ Suporte técnico via WhatsApp</li>
              <li className="flex items-center gap-2">✓ Backups automáticos diários</li>
            </ul>
            <Button
              onClick={startBillingProcess}
              className="w-full gap-2 gradient-primary py-6 text-lg hover:scale-[1.02] transition-transform"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
              Ativar Agora via PIX
            </Button>
          </Card>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-center text-muted-foreground">
              Dúvidas ou problemas?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleContactWhatsApp}
                variant="outline"
                className="gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>

              <Button
                onClick={signOut}
                variant="ghost"
              >
                Sair da conta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPixDialog} onOpenChange={setShowPixDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento via PIX</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código para pagar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <div className="bg-white p-4 rounded-xl border-2 border-primary/10">
              <img src={pixData?.qrCode} alt="QR Code PIX" className="w-64 h-64" />
            </div>

            <div className="w-full space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase text-center">Código Copia e Cola</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted p-3 rounded-lg text-[10px] break-all font-mono border select-all">
                  {pixData?.copyPaste}
                </div>
                <Button size="icon" onClick={copyToClipboard} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              Aguardando confirmação do pagamento...
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBillingForm} onOpenChange={setShowBillingForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Informações de Faturamento</DialogTitle>
            <DialogDescription>
              Confirme seus dados para gerar o PIX com segurança.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo / Razão Social</Label>
              <Input
                value={billingForm.name}
                onChange={(e) => setBillingForm({ ...billingForm, name: e.target.value })}
                placeholder="Ex: João Silva ou Empresa Ltda"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={billingForm.email}
                onChange={(e) => setBillingForm({ ...billingForm, email: e.target.value })}
                placeholder="seu@email.com"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF ou CNPJ</Label>
                <MaskedInput
                  mask={billingForm.taxId.length > 11 ? "cnpj" : "cpf"}
                  value={billingForm.taxId}
                  onChange={(value) => setBillingForm({ ...billingForm, taxId: value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp / Telefone</Label>
                <MaskedInput
                  mask="phone"
                  value={billingForm.cellphone}
                  onChange={(value) => setBillingForm({ ...billingForm, cellphone: value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBillingForm(false)}>
              Cancelar
            </Button>
            <Button
              className="gradient-primary"
              disabled={
                loading ||
                !billingForm.name ||
                !billingForm.email ||
                billingForm.taxId.replace(/\D/g, '').length < 11 ||
                billingForm.cellphone.replace(/\D/g, '').length < 10
              }
              onClick={() => {
                setShowBillingForm(false);
                handleCreateBilling();
              }}
            >
              Gerar PIX
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
