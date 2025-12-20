import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Apple, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Instalar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Download className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Instalar Gráfica PDV</CardTitle>
          <CardDescription>
            Instale o aplicativo no seu dispositivo para acesso rápido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <p className="text-green-600 font-medium">✓ App já instalado!</p>
              <Button onClick={() => navigate("/")} className="w-full">
                Abrir Sistema
              </Button>
            </div>
          ) : (
            <>
              {deferredPrompt && (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="mr-2 h-5 w-5" />
                  Instalar Agora
                </Button>
              )}

              {isIOS && (
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Apple className="w-5 h-5" />
                    <span className="font-medium">iPhone / iPad</span>
                  </div>
                  <ol className="text-sm space-y-2 text-muted-foreground">
                    <li>1. Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta)</li>
                    <li>2. Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                    <li>3. Toque em <strong>"Adicionar"</strong></li>
                  </ol>
                </div>
              )}

              {isAndroid && !deferredPrompt && (
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    <span className="font-medium">Android</span>
                  </div>
                  <ol className="text-sm space-y-2 text-muted-foreground">
                    <li>1. Toque no menu do navegador (três pontos)</li>
                    <li>2. Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong></li>
                    <li>3. Confirme a instalação</li>
                  </ol>
                </div>
              )}

              {!isIOS && !isAndroid && (
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    <span className="font-medium">Computador</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No Chrome, clique no ícone de instalação na barra de endereço ou acesse pelo menu → "Instalar Gráfica PDV"
                  </p>
                </div>
              )}

              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Continuar no Navegador
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
