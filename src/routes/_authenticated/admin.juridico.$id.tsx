import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "range@" as never;
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Plus, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/juridico/$id")({
  component: ProcessoDetail,
});

const STATUSES = ["aberto", "em_andamento", "suspenso", "encerrado", "arquivado"] as const;

function ProcessoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [novoAndamento, setNovoAndamento] = useState("");

  const { data: p } = useQuery({
    queryKey: ["processo", id],
    queryFn: async () => {
      const { data } = await supabase.from("processos")
        .select("*, afiliado:afiliados(id, full_name, matricula)")
        .eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: andamentos } = useQuery({
    queryKey: ["andamentos", id],
    queryFn: async () => {
      const { data } = await supabase.from("processo_andamentos")
        .select("*").eq("processo_id", id).order("data_andamento", { ascending: false });
      return data ?? [];
    },
  });

  const addAndamento = useMutation({
    mutationFn: async () => {
      if (!p) throw new Error("Processo");
      const { error } = await supabase.from("processo_andamentos").insert({
        processo_id: id, tenant_id: p.tenant_id, descricao: novoAndamento,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNovoAndamento("");
      toast.success("Andamento adicionado");
      qc.invalidateQueries({ queryKey: ["andamentos", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const setStatus = useMutation({
    mutationFn: async (status: typeof STATUSES[number]) => {
      const { error } = await supabase.from("processos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["processo", id] }); },
  });

  if (!p) return <AdminShell title="Carregando…"><p className="text-muted-foreground">Carregando…</p></AdminShell>;

  const afi = p.afiliado as { id: string; full_name: string; matricula: string } | null;

  return (
    <AdminShell title={p.titulo}>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/juridico" })}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Dados do processo</CardTitle>
              <p className="font-mono text-xs text-muted-foreground">{p.numero_processo}</p>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <FI label="Tipo" value={p.tipo} />
                <FI label="Vara" value={p.vara ?? "—"} />
                <FI label="Comarca / UF" value={[p.comarca, p.uf].filter(Boolean).join(" / ") || "—"} />
                <FI label="Advogado" value={p.advogado_responsavel ?? "—"} />
                <FI label="Valor da causa" value={p.valor_causa ? `R$ ${Number(p.valor_causa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"} />
                <FI label="Distribuição" value={formatDate(p.data_distribuicao)} />
                <FI label="Próxima audiência" value={formatDate(p.proxima_audiencia)} />
                <FI label="Afiliado" value={afi ? `${afi.full_name} (${afi.matricula})` : "—"} />
              </dl>
              {p.descricao && (
                <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="text-xs uppercase text-muted-foreground mb-1">Descrição</p>
                  <p className="whitespace-pre-wrap">{p.descricao}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className="text-sm">{p.status}</Badge>
              <Select value={p.status} onValueChange={(v) => setStatus.mutate(v as typeof STATUSES[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Andamentos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea rows={2} placeholder="Descreva a movimentação…" value={novoAndamento} onChange={(e) => setNovoAndamento(e.target.value)} />
              <Button size="sm" disabled={!novoAndamento.trim() || addAndamento.isPending} onClick={() => addAndamento.mutate()}>
                {addAndamento.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Adicionar andamento
              </Button>
            </div>
            <div className="space-y-3">
              {!andamentos?.length ? (
                <p className="text-sm text-muted-foreground">Nenhum andamento registrado.</p>
              ) : andamentos.map((a) => (
                <div key={a.id} className="relative rounded-md border-l-2 border-primary bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{formatDate(a.data_andamento)}</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{a.descricao}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function FI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
