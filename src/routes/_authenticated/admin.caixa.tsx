import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Wallet, Loader2, FileText } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/caixa")({
  component: Caixa,
});

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "debito", label: "Cartão de Débito" },
  { value: "credito", label: "Cartão de Crédito" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
];

const methodLabel = (m?: string | null) =>
  PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m ?? "—";

function firstOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function lastOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function Caixa() {
  const { tenant } = useTenant();
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(lastOfMonth());

  const { data: rows, isLoading } = useQuery({
    queryKey: ["caixa", tenant?.id, from, to],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixa_movimentos")
        .select("id, kind, valor, payment_method, description, occurred_at, created_at, afiliados(matricula, full_name)")
        .eq("tenant_id", tenant!.id)
        .gte("occurred_at", from)
        .lte("occurred_at", to)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: saldoAnterior } = useQuery({
    queryKey: ["caixa-saldo-anterior", tenant?.id, from],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixa_movimentos")
        .select("kind, valor")
        .eq("tenant_id", tenant!.id)
        .lt("occurred_at", from);
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + (r.kind === "entrada" ? Number(r.valor) : -Number(r.valor)), 0);
    },
  });

  const totals = useMemo(() => {
    const arr = rows ?? [];
    const entradas = arr.filter((r) => r.kind === "entrada").reduce((s, r) => s + Number(r.valor), 0);
    const saidas = arr.filter((r) => r.kind === "saida").reduce((s, r) => s + Number(r.valor), 0);
    return { entradas, saidas, periodo: entradas - saidas };
  }, [rows]);

  const saldoAtual = (saldoAnterior ?? 0) + totals.periodo;

  return (
    <AdminShell title="Livro Caixa">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-40" />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-40" />
            </div>
          </div>
          <div className="flex gap-2">
            <NovoMovimentoDialog tenantId={tenant?.id} defaultKind="entrada" />
            <NovoMovimentoDialog tenantId={tenant?.id} defaultKind="saida" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Kpi label="Saldo anterior" value={formatBRL(saldoAnterior ?? 0)} icon={Wallet} />
          <Kpi label="Entradas" value={formatBRL(totals.entradas)} icon={ArrowDownCircle} accent="success" />
          <Kpi label="Saídas" value={formatBRL(totals.saidas)} icon={ArrowUpCircle} accent="danger" />
          <Kpi label="Saldo atual" value={formatBRL(saldoAtual)} icon={Wallet} accent={saldoAtual >= 0 ? "success" : "danger"} />
        </div>

        <Card className="shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Data</th>
                  <th className="text-left font-medium px-4 py-3">Tipo</th>
                  <th className="text-left font-medium px-4 py-3">Descrição</th>
                  <th className="text-left font-medium px-4 py-3">Afiliado</th>
                  <th className="text-left font-medium px-4 py-3">Método</th>
                  <th className="text-right font-medium px-4 py-3">Valor</th>
                  <th className="text-right font-medium px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (<tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>)}
                {!isLoading && !rows?.length && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Sem movimentações no período. Registre uma entrada ou saída.
                  </td></tr>
                )}
                {rows?.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(r.occurred_at)}</td>
                    <td className="px-4 py-3">
                      {r.kind === "entrada" ? (
                        <Badge variant="outline" className="bg-success/15 text-success border-success/30">Entrada</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">Saída</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">{r.description ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {r.afiliados ? (
                        <>
                          <div className="font-mono">{r.afiliados.matricula}</div>
                          <div>{r.afiliados.full_name}</div>
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{methodLabel(r.payment_method)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.kind === "entrada" ? "text-success" : "text-destructive"}`}>
                      {r.kind === "entrada" ? "+" : "−"} {formatBRL(Number(r.valor))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ExcluirMovimentoButton id={r.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows && rows.length > 0 && (
                <tfoot className="bg-muted/40 text-sm font-medium">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right">Saldo do período</td>
                    <td className={`px-4 py-3 text-right ${totals.periodo >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatBRL(totals.periodo)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}

function Kpi({ label, value, icon: Icon, accent }: {
  label: string; value: string; icon: typeof Wallet; accent?: "success" | "warning" | "danger";
}) {
  const color = accent === "success" ? "text-success"
    : accent === "danger" ? "text-destructive"
    : accent === "warning" ? "text-warning-foreground"
    : "text-muted-foreground";
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NovoMovimentoDialog({ tenantId, defaultKind }: { tenantId?: string; defaultKind: "entrada" | "saida" }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"entrada" | "saida">(defaultKind);
  const [valor, setValor] = useState("");
  const [method, setMethod] = useState("dinheiro");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));

  const reset = () => {
    setKind(defaultKind); setValor(""); setMethod("dinheiro");
    setDescription(""); setOccurredAt(new Date().toISOString().slice(0, 10));
  };

  const run = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Sindicato inválido");
      const v = Number(valor);
      if (!v || v <= 0) throw new Error("Valor inválido");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("caixa_movimentos").insert({
        tenant_id: tenantId,
        kind,
        valor: v,
        payment_method: method,
        description: description || null,
        occurred_at: occurredAt,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(kind === "entrada" ? "Entrada registrada" : "Saída registrada");
      qc.invalidateQueries({ queryKey: ["caixa"] });
      qc.invalidateQueries({ queryKey: ["caixa-saldo-anterior"] });
      reset();
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const isEntrada = defaultKind === "entrada";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant={isEntrada ? "default" : "outline"}>
          {isEntrada ? <ArrowDownCircle className="mr-2 h-4 w-4" /> : <ArrowUpCircle className="mr-2 h-4 w-4" />}
          Nova {isEntrada ? "entrada" : "saída"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar {kind === "entrada" ? "entrada" : "saída"}</DialogTitle>
          <DialogDescription>Movimentação manual no livro caixa.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as "entrada" | "saida")}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Método</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" placeholder="Ex.: Pagamento de aluguel da sede" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirMovimentoButton({ id }: { id: string }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("caixa_movimentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimentação excluída");
      qc.invalidateQueries({ queryKey: ["caixa"] });
      qc.invalidateQueries({ queryKey: ["caixa-saldo-anterior"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => del.mutate()}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
