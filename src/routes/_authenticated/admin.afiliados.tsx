import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Copy, ExternalLink } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBadge } from "./admin.index";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/hooks/use-tenant";
import { formatCPF, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/afiliados")({
  component: AfiliadosList,
});

function AfiliadosList() {
  const { tenant } = useTenant();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["afiliados", tenant?.id, q],
    enabled: !!tenant?.id,
    queryFn: async () => {
      let query = supabase
        .from("afiliados")
        .select("id, matricula, full_name, cpf, status, phone, created_at")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (q.trim()) query = query.or(`full_name.ilike.%${q}%,matricula.ilike.%${q}%,cpf.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const copyLink = () => {
    if (!tenant) return;
    const url = `${window.location.origin}/cadastro/${tenant.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de auto-cadastro copiado");
  };

  return (
    <AdminShell title="Afiliados">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, matrícula ou CPF" className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" /> Link de auto-cadastro
            </Button>
            {tenant && (
              <a href={`/cadastro/${tenant.slug}`} target="_blank" rel="noreferrer">
                <Button variant="ghost"><ExternalLink className="mr-2 h-4 w-4" /> Abrir</Button>
              </a>
            )}
          </div>
        </div>

        <Card className="shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Matrícula</th>
                  <th className="text-left font-medium px-4 py-3">Nome</th>
                  <th className="text-left font-medium px-4 py-3">CPF</th>
                  <th className="text-left font-medium px-4 py-3">Telefone</th>
                  <th className="text-left font-medium px-4 py-3">Cadastrado em</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>
                )}
                {!isLoading && !data?.length && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Nenhum afiliado encontrado.</td></tr>
                )}
                {data?.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs">{a.matricula}</td>
                    <td className="px-4 py-3">
                      <Link to="/admin/afiliados/$id" params={{ id: a.id }} className="font-medium text-foreground hover:underline">
                        {a.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCPF(a.cpf)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
