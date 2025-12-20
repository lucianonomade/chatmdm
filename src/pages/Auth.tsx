import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const loginSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  companyName: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
});

const forgotPasswordSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Login header color (fixed white as original)
  const loginHeaderColor = "#ffffff";

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const validateForm = () => {
    try {
      if (mode === 'login') {
        loginSchema.parse({ name, password });
      } else if (mode === 'signup') {
        signupSchema.parse({ name, email, password, companyName });
      } else {
        forgotPasswordSchema.parse({ name });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Look up email by name
      const { data: userEmail, error: emailError } = await supabase
        .rpc('get_email_by_name', { p_name: name.trim() });

      if (emailError || !userEmail) {
        toast({
          title: "Usuário não encontrado",
          description: "Não foi possível encontrar um usuário com esse nome.",
          variant: "destructive",
        });
        return;
      }

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setMode('login');
        setName("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot') {
      await handleForgotPassword();
      return;
    }
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (mode === 'login') {
        // Check if the input looks like an email (for backwards compatibility)
        const isEmail = name.includes('@');
        let userEmail = isEmail ? name : null;

        if (!isEmail) {
          // Look up email by name using secure database function
          const { data: emailResult, error: emailError } = await supabase
            .rpc('get_email_by_name', { p_name: name.trim() });

          if (emailError || !emailResult) {
            toast({
              title: "Usuário não encontrado",
              description: "Não encontramos esse nome. Tente entrar com seu EMAIL.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          
          userEmail = emailResult;
        }

        const { error } = await signIn(userEmail!, password);
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Erro no login",
              description: "Nome ou senha incorretos.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          sessionStorage.removeItem('dailyTasksSeen');
          sessionStorage.setItem('justLoggedIn', 'true');
          toast({
            title: "Bem-vindo!",
            description: "Login realizado com sucesso.",
          });
          // Não navegar manualmente aqui: aguardar o AuthProvider atualizar o user/session
          // e o useEffect acima redirecionar, evitando "loop" de rotas e conflitos de DOM.
        }
      } else {
        const { error } = await signUp(email, password, name, companyName);
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Email já cadastrado",
              description: "Este email já está em uso. Tente fazer login.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro no cadastro",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Conta criada!",
            description: "Você pode fazer login agora.",
          });
          setMode('login');
          setPassword("");
          setCompanyName("");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Entrar no Sistema';
      case 'signup': return 'Criar Conta';
      case 'forgot': return 'Recuperar Senha';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return 'Entre com suas credenciais para acessar';
      case 'signup': return 'Preencha os dados para criar sua conta';
      case 'forgot': return 'Digite seu nome para receber o link de recuperação';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-md shadow-xl border-0 overflow-hidden">
        <div style={{ backgroundColor: loginHeaderColor }}>
          <CardHeader className="text-center pb-4 sm:pb-6 pt-6 sm:pt-8">
            <div 
              className="mx-auto mb-3 sm:mb-4 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-border bg-background"
            >
              <Store className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">
              {getTitle()}
            </CardTitle>
            <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
              {getDescription()}
            </CardDescription>
          </CardHeader>
        </div>
        
        <CardContent className="pb-6 sm:pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Email ou Nome</Label>
              <Input
                id="name"
                placeholder={mode === 'forgot' ? "Digite seu nome cadastrado" : mode === 'login' ? "Seu email ou nome" : "Seu nome completo"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete={mode === 'login' ? 'username' : undefined}
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name}</p>
              ) : null}
            </div>
            
            {mode === 'signup' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    placeholder="Nome da sua empresa"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                  />
                  {errors.companyName ? (
                    <p className="text-sm text-destructive">{errors.companyName}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                  {errors.email ? (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  ) : null}
                </div>
              </>
            ) : null}
            
            {mode !== 'forgot' ? (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-sm text-destructive">{errors.password}</p>
                ) : null}
              </div>
            ) : null}

            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setErrors({});
                  setPassword("");
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Esqueci minha senha
              </button>
            ) : null}
            
            <Button 
              type="submit" 
              className="w-full gradient-primary text-primary-foreground"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'login' ? 'Entrando...' : mode === 'signup' ? 'Criando...' : 'Enviando...'}
                </>
              ) : (
                mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar Conta' : 'Enviar Link'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-2">
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Voltar ao login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {mode === 'login' 
                  ? 'Não tem conta? Cadastre-se' 
                  : 'Já tem conta? Faça login'}
              </button>
            )}
          </div>
        </CardContent>
        
        <div className="border-t py-2 sm:py-3 text-center text-xs sm:text-sm text-muted-foreground -mt-2">
          Sistema de Gestão Gráfica v2.0
        </div>
      </Card>
    </div>
  );
}