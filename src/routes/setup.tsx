import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
  head: () => ({
    meta: [
      { title: "Bootstrap · UnionSaaS" },
      { name: "description", content: "Configuração inicial do super-administrador da plataforma UnionSaaS." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function SetupPage() {
  const navigate = useNavigate();
  const { user, loading, isSuperAdmin } = useAuth();
  const [exists, setExists] = useState<boolean | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "super_admin");
      setExists((count ?? 0) > 0);
    })();
  }, []);

  const claim = async () => {
    setClaiming(true);
    const { error } = await supabase.rpc("claim_super_admin");
    setClaiming(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Você agora é o super-administrador.");
    navigate({ to: "/admin" });
  };

  return (
    <main className="min-h-screen bg-hero flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Bootstrap super-admin</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Esta tela só funciona enquanto a plataforma <strong>ainda não tem</strong> um super-administrador.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user && !loading && (
            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
              <p>Faça login primeiro com a conta que você quer promover.</p>
              <Link to="/auth"><Button className="mt-3 w-full">Entrar <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          )}

          {user && isSuperAdmin && (
            <div className="rounded-md border border-success/30 bg-success/10 p-4 text-sm text-success-foreground">
              Você já é super-admin.
              <Link to="/admin"><Button className="mt-3 w-full">Ir para o painel</Button></Link>
            </div>
          )}

          {user && !isSuperAdmin && exists === true && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Já existe um super-admin cadastrado. Para receber o papel, peça a um super-admin existente.
            </div>
          )}

          {user && !isSuperAdmin && exists === false && (
            <>
              <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
                <p>Conta logada: <strong>{user.email}</strong></p>
                <p className="mt-1 text-muted-foreground">Ao confirmar, esta conta receberá o papel <code>super_admin</code> e poderá criar sindicatos.</p>
              </div>
              <Button onClick={claim} disabled={claiming} className="w-full">
                {claiming ? "Promovendo…" : "Sou eu — me promova a super-admin"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
