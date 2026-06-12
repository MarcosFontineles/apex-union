import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Entrar — UnionSaaS" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail se necessário.");
        navigate({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (result.error) {
      toast.error("Falha ao entrar com Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block bg-hero">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.2) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-foreground/15 backdrop-blur">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-semibold">UnionSaaS</span>
          </Link>
          <div className="max-w-md">
            <p className="text-2xl font-medium leading-snug text-balance">
              "Conseguimos digitalizar 12 mil carteirinhas em uma semana. O QR Code acabou com a fila no balcão."
            </p>
            <p className="mt-4 text-sm text-primary-foreground/70">Diretor Administrativo — Sindicato parceiro</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">UnionSaaS</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Acessar a plataforma</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Administradores, equipe e afiliados.</p>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value={mode} className="mt-6">
              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signup" ? "Criar conta" : "Entrar"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
                <GoogleIcon className="mr-2 h-4 w-4" />
                Continuar com Google
              </Button>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-xs text-muted-foreground text-center">
            Ao continuar você concorda com os Termos de Uso e a Política de Privacidade (LGPD).
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.7 2.5 2.5 6.7 2.5 12s4.2 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.5H12z" />
    </svg>
  );
}
