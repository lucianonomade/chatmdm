import { Lock, Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export function TrialExpiredScreen() {
  const { signOut } = useAuth();

  const handleContactWhatsApp = () => {
    const message = encodeURIComponent("Olá! Meu período de teste do sistema expirou e gostaria de contratar.");
    window.open(`https://wa.me/5500000000000?text=${message}`, '_blank');
  };

  const handleContactEmail = () => {
    window.open('mailto:contato@seudominio.com?subject=Interesse em contratar o sistema', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-destructive/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
            Período de Teste Expirado
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Seu período de teste de 5 dias terminou. Para continuar utilizando o sistema, entre em contato conosco.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Durante o período de teste, você teve acesso a todas as funcionalidades do sistema. 
              Esperamos que tenha aproveitado!
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-center text-foreground">
              Entre em contato para contratar:
            </p>
            
            <Button 
              onClick={handleContactWhatsApp}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <MessageCircle className="w-5 h-5" />
              Falar pelo WhatsApp
            </Button>
            
            <Button 
              onClick={handleContactEmail}
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              <Mail className="w-5 h-5" />
              Enviar E-mail
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <Button 
              onClick={signOut}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
