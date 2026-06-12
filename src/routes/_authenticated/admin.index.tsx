import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, TrendingUp, Wallet, ArrowUpRight } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { tenant } = useTenant();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const [total, ativos, pendentes, novos] = await Promise.all([
        supabase.from("afiliados").select("*", { count: "exact", head: true }).eq("tenant_id", tenant!.id),
        supabase.from("afiliados").select("*", { count: "exact", head: true }).eq("tenant_id", tenant!.id).eq("status", "ativo"),
        supabase.from("afiliados").select("*", { count: "exact", head: true }).eq("tenant_id", tenant!.id).eq("status", "pendente"),
        supabase
          .from("afiliados")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant!.id)
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);
      return {
        total: total.count ?? 0,
        ativos: ativos.count ?? 0,
        pendentes: pendentes.count ?? 0,
        novos: novos.count ?? 0,
      };
    },
  });

  const { data: recentes } = useQuery({
    queryKey: ["recent-afiliados", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("afiliados")
        .select("id, matricula, full_name, status, created_at")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Afiliados ativos", value: stats?.ativos ?? 0, icon: Users, hint: `${stats?.total ?? 0} no total` },
    { label: "Pendentes de aprovação", value: stats?.pendentes ?? 0, icon: UserPlus, hint: "Aguardando análise" },
    { label: "Novos (30 dias)", value: stats?.novos ?? 0, icon: TrendingUp, hint: "Crescimento da base" },
    { label: "Arrecadação prevista", value: "—", icon: Wallet, hint: "Conecte o módulo financeiro" },
  ];

  return (
    <AdminShell title={tenant?.name ?? "Painel administrativo"}>
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">{c.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cadastros recentes</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Últimos afiliados cadastrados.</p>
            </div>
            <Link to="/admin/afiliados" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Ver todos <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {!recentes?.length ? (
              <div className="rounded-md border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                Nenhum afiliado ainda. Compartilhe o link de auto-cadastro do seu sindicato.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentes.map((a) => (
                  <Link
                    key={a.id}
                    to="/admin/afiliados/$id"
                    params={{ id: a.id }}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.full_name}</p>
                      <p className="text-xs text-muted-foreground">Matrícula {a.matricula} · {formatDate(a.created_at)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ativo: { label: "Ativo", cls: "bg-success/15 text-success border-success/30" },
    pendente: { label: "Pendente", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
    inativo: { label: "Inativo", cls: "bg-muted text-muted-foreground border-border" },
    suspenso: { label: "Suspenso", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const m = map[status] ?? map.inativo;
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}
