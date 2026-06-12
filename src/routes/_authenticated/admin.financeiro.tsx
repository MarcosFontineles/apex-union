import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wallet, CheckCircle2, Plus, AlertCircle } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  component: Financeiro,
});

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const STATUS: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  pago: { label: "Pago", cls: "bg-success/15 text-success border-success/30" },
  atrasado: { label: "Atrasado", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  isento: { label: "Isento", cls: "bg-muted text-muted-foreground border-border" },
  cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground border-border" },
};

function Financeiro() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const today = new Date();
  const defaultComp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [comp, setComp] = useState(defaultComp);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["mensalidades", tenant?.id, comp],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensalidades")
        .select("id, competencia, due_date, valor, status, paid_at, afiliado_id, afiliados(matricula, full_name)")
        .eq("tenant_id", tenant!.id)
        .eq("competencia", `${comp}-01`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: kpis } = useQuery({
    queryKey: ["mensalidades-kpis", tenant?.id, comp],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("mensalidades")
        .select("valor, status")
        .eq("tenant_id", tenant!.id)
        .eq("competencia", `${comp}-01`);
      const arr = data ?? [];
      const total = arr.reduce((s, r) => s + Number(r.valor), 0);
      const pago = arr.filter((r) => r.status === "pago").reduce((s, r) => s + Number(r.valor), 0);
      const pend = arr.filter((r) => r.status === "pendente" || r.status === "atrasado")
        .reduce((s, r) => s + Number(r.valor), 0);
      return { total, pago, pend, count: arr.length };
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mensalidades")
        .update({ status: "pago", paid_at: new Date().toISOString(), payment_method: "manual" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensalidade quitada");
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
      qc.invalidateQueries({ queryKey: ["mensalidades-kpis"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <AdminShell title="Financeiro">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Label className="text-xs">Competência</Label>
            <Input type="month" value={comp} onChange={(e) => setComp(e.target.value)} className="mt-1 w-44" />
          </div>
          <GerarLoteDialog tenantId={tenant?.id} comp={comp} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Kpi label="Mensalidades" value={String(kpis?.count ?? 0)} icon={Wallet} />
          <Kpi label="Faturado" value={formatBRL(kpis?.total ?? 0)} icon={Wallet} />
          <Kpi label="Recebido" value={formatBRL(kpis?.pago ?? 0)} icon={CheckCircle2} accent="success" />
          <Kpi label="A receber" value={formatBRL(kpis?.pend ?? 0)} icon={AlertCircle} accent="warning" />
        </div>

        <Card className="shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Matrícula</th>
                  <th className="text-left font-medium px-4 py-3">Afiliado</th>
                  <th className="text-left font-medium px-4 py-3">Vencimento</th>
                  <th className="text-right font-medium px-4 py-3">Valor</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (<tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>)}
                {!isLoading && !rows?.length && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhuma mensalidade nesta competência. Use "Gerar lote" para criar para todos os afiliados ativos.
                  </td></tr>
                )}
                {rows?.map((r) => {
                  const meta = STATUS[r.status] ?? STATUS.pendente;
                  return (
                    <tr key={r.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono text-xs">{r.afiliados?.matricula ?? "—"}</td>
                      <td className="px-4 py-3">{r.afiliados?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(r.due_date)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatBRL(Number(r.valor))}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className={meta.cls}>{meta.label}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {r.status !== "pago" && (
                          <Button size="sm" variant="outline" disabled={markPaid.isPending} onClick={() => markPaid.mutate(r.id)}>
                            Marcar pago
                          </Button>
                        )}
                        {r.status === "pago" && r.paid_at && (
                          <span className="text-xs text-muted-foreground">{formatDate(r.paid_at)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Wallet; accent?: "success" | "warning" }) {
  const color = accent === "success" ? "text-success" : accent === "warning" ? "text-warning-foreground" : "text-muted-foreground";
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function GerarLoteDialog({ tenantId, comp }: { tenantId?: string; comp: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState("50.00");
  const [dueDay, setDueDay] = useState("10");
  const [method, setMethod] = useState<"boleto" | "pix" | "manual">("pix");

  const run = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant inválido");
      const { data, error } = await supabase.rpc("generate_mensalidades_lote", {
        _tenant_id: tenantId,
        _competencia: `${comp}-01`,
        _valor: Number(valor),
        _due_day: Number(dueDay),
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(`${count} mensalidades geradas (${method.toUpperCase()})`);
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
      qc.invalidateQueries({ queryKey: ["mensalidades-kpis"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Gerar lote</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar mensalidades em lote</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Competência</Label>
            <Input value={comp} disabled className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Dia do vencimento</Label>
              <Input type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Método (referência)</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">Integração bancária ficará para um próximo ciclo.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? "Gerando…" : "Gerar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
