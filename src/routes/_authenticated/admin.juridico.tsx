import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Gavel, Loader2, Search } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/juridico")({
  component: JuridicoList,
});

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  aberto: { label: "Aberto", cls: "bg-primary/15 text-primary border-primary/30" },
  em_andamento: { label: "Em andamento", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  suspenso: { label: "Suspenso", cls: "bg-muted text-muted-foreground border-border" },
  encerrado: { label: "Encerrado", cls: "bg-success/15 text-success border-success/30" },
  arquivado: { label: "Arquivado", cls: "bg-muted text-muted-foreground border-border" },
};

const TIPOS = ["trabalhista", "civel", "previdenciario", "tributario", "administrativo", "outro"] as const;

function JuridicoList() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const { data: processos } = useQuery({
    queryKey: ["processos", tenant?.id, q],
    enabled: !!tenant?.id,
    queryFn: async () => {
      let query = supabase.from("processos")
        .select("id, numero_processo, titulo, status, tipo, proxima_audiencia, afiliado:afiliados(full_name, matricula)")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });
      if (q) query = query.or(`titulo.ilike.%${q}%,numero_processo.ilike.%${q}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  const { data: afiliados } = useQuery({
    queryKey: ["afiliados-mini", tenant?.id],
    enabled: !!tenant?.id && open,
    queryFn: async () => {
      const { data } = await supabase.from("afiliados")
        .select("id, full_name, matricula").eq("tenant_id", tenant!.id).order("full_name").limit(500);
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    numero_processo: "", titulo: "", descricao: "", tipo: "trabalhista",
    vara: "", comarca: "", uf: "", advogado_responsavel: "",
    valor_causa: "", data_distribuicao: "", afiliado_id: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!tenant) throw new Error("Tenant");
      const { error } = await supabase.from("processos").insert({
        tenant_id: tenant.id,
        numero_processo: form.numero_processo,
        titulo: form.titulo,
        descricao: form.descricao || null,
        tipo: form.tipo as typeof TIPOS[number],
        vara: form.vara || null,
        comarca: form.comarca || null,
        uf: form.uf || null,
        advogado_responsavel: form.advogado_responsavel || null,
        valor_causa: form.valor_causa ? Number(form.valor_causa) : null,
        data_distribuicao: form.data_distribuicao || null,
        afiliado_id: form.afiliado_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Processo cadastrado");
      setOpen(false);
      setForm({ numero_processo: "", titulo: "", descricao: "", tipo: "trabalhista", vara: "", comarca: "", uf: "", advogado_responsavel: "", valor_causa: "", data_distribuicao: "", afiliado_id: "" });
      qc.invalidateQueries({ queryKey: ["processos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <AdminShell title="Jurídico">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por número ou título…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo processo</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Cadastrar processo</DialogTitle></DialogHeader>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
                <F label="Número do processo" full>
                  <Input required value={form.numero_processo} onChange={(e) => setForm({ ...form, numero_processo: e.target.value })} />
                </F>
                <F label="Título" full>
                  <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
                </F>
                <F label="Tipo">
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </F>
                <F label="Afiliado relacionado">
                  <Select value={form.afiliado_id} onValueChange={(v) => setForm({ ...form, afiliado_id: v })}>
                    <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                    <SelectContent>
                      {afiliados?.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name} · {a.matricula}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </F>
                <F label="Vara"><Input value={form.vara} onChange={(e) => setForm({ ...form, vara: e.target.value })} /></F>
                <F label="Comarca"><Input value={form.comarca} onChange={(e) => setForm({ ...form, comarca: e.target.value })} /></F>
                <F label="UF"><Input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></F>
                <F label="Advogado responsável"><Input value={form.advogado_responsavel} onChange={(e) => setForm({ ...form, advogado_responsavel: e.target.value })} /></F>
                <F label="Valor da causa (R$)"><Input type="number" step="0.01" value={form.valor_causa} onChange={(e) => setForm({ ...form, valor_causa: e.target.value })} /></F>
                <F label="Data de distribuição"><Input type="date" value={form.data_distribuicao} onChange={(e) => setForm({ ...form, data_distribuicao: e.target.value })} /></F>
                <F label="Descrição" full>
                  <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </F>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cadastrar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader><CardTitle>Processos</CardTitle></CardHeader>
          <CardContent>
            {!processos?.length ? (
              <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
                <Gavel className="mx-auto mb-2 h-6 w-6 opacity-50" />
                Nenhum processo cadastrado ainda.
              </div>
            ) : (
              <div className="divide-y">
                {processos.map((p) => {
                  const s = STATUS_MAP[p.status] ?? STATUS_MAP.aberto;
                  const afi = (p.afiliado as { full_name: string; matricula: string } | null);
                  return (
                    <Link key={p.id} to="/admin/juridico/$id" params={{ id: p.id }}
                      className="flex items-center justify-between gap-4 py-3 -mx-2 px-2 rounded-md hover:bg-muted/50 transition">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-sm">{p.titulo}</p>
                          <Badge variant="outline" className={s.cls}>{s.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{p.numero_processo}</p>
                        {afi && <p className="text-xs text-muted-foreground">{afi.full_name} · {afi.matricula}</p>}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{p.tipo}</p>
                        {p.proxima_audiencia && <p className="mt-0.5">📅 {formatDate(p.proxima_audiencia)}</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function F({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
