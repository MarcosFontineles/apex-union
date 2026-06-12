import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Wallet, Gavel, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const { user } = useAuth();

  const { data: a } = useQuery({
    queryKey: ["portal-afiliado", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("afiliados")
        .select("id, full_name, matricula, status, joined_at, tenant_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  if (!a) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Sua conta ainda não está vinculada a um cadastro de afiliado.</p>
          <p className="text-xs text-muted-foreground">Entre em contato com o seu sindicato para vincular sua matrícula a este e-mail.</p>
        </CardContent>
      </Card>
    );
  }

  const links = [
    { to: "/portal/carteirinha", icon: CreditCard, label: "Minha carteirinha", desc: "QR Code e dados oficiais" },
    { to: "/portal/financeiro", icon: Wallet, label: "Financeiro", desc: "Mensalidades e pagamentos" },
    { to: "/portal/juridico", icon: Gavel, label: "Jurídico", desc: "Processos e aposentadoria" },
  ];

  return (
    <div className="space-y-5">
      <Card className="shadow-card">
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Matrícula</p>
          <p className="mt-1 text-2xl font-semibold font-mono">{a.matricula}</p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Filiado em {formatDate(a.joined_at)}</span>
            <span className="font-medium capitalize text-success">{a.status}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {links.map((l) => (
          <Link key={l.to} to={l.to as never} className="block">
            <Card className="shadow-card transition hover:shadow-elev">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <l.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.label}</p>
                  <p className="text-xs text-muted-foreground">{l.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
