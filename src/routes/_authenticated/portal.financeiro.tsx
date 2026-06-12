import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, FileText, Wallet, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/financeiro")({
  component: PortalFinanceiro,
});

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const STATUS: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pendente: { label: "Pendente", cls: "bg-warning/15 text-warning-foreground border-warning/40", icon: Clock },
  pago: { label: "Pago", cls: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  atrasado: { label: "Atrasado", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertCircle },
  isento: { label: "Isento", cls: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground border-border", icon: AlertCircle },
};

function fakePixCode(id: string, valor: number) {
  // Placeholder copy-paste string until a real PSP is integrated.
  return `00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540${valor.toFixed(2).length.toString().padStart(2,"0")}${valor.toFixed(2)}5802BR5913UNIONSAAS6009SAO PAULO62${(7+id.length).toString().padStart(2,"0")}0503***${id.slice(0,8)}6304ABCD`;
}

function PortalFinanceiro() {
  const { user } = useAuth();

  const { data: afiliado } = useQuery({
    queryKey: ["portal-fin-afiliado", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("afiliados")
        .select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: rows } = useQuery({
    queryKey: ["portal-mensalidades", afiliado?.id],
    enabled: !!afiliado?.id,
    queryFn: async () => {
      const { data } = await supabase.from("mensalidades")
        .select("id, competencia, due_date, valor, status, paid_at, payment_method")
        .eq("afiliado_id", afiliado!.id)
        .order("competencia", { ascending: false });
      return data ?? [];
    },
  });

  const totalDevido = (rows ?? []).filter(r => r.status === "pendente" || r.status === "atrasado")
    .reduce((s, r) => s + Number(r.valor), 0);
  const totalPago = (rows ?? []).filter(r => r.status === "pago")
    .reduce((s, r) => s + Number(r.valor), 0);

  const copyPix = async (id: string, valor: number) => {
    try {
      await navigator.clipboard.writeText(fakePixCode(id, valor));
      toast.success("Código PIX copiado");
    } catch { toast.error("Não foi possível copiar"); }
  };

  if (!afiliado) {
    return <Card className="p-6 text-sm text-muted-foreground">Vincule sua matrícula para ver o financeiro.</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">A pagar</p>
            <p className="mt-1 text-xl font-semibold text-warning-foreground">{formatBRL(totalDevido)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Pago no período</p>
            <p className="mt-1 text-xl font-semibold text-success">{formatBRL(totalPago)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Mensalidades</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!rows?.length && (
            <p className="text-sm text-muted-foreground">Nenhuma mensalidade emitida ainda.</p>
          )}
          {rows?.map((r) => {
            const meta = STATUS[r.status] ?? STATUS.pendente;
            const Icon = meta.icon;
            const competencia = new Date(r.competencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            const aberto = r.status === "pendente" || r.status === "atrasado";
            return (
              <div key={r.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{competencia}</p>
                    <p className="text-xs text-muted-foreground">Vencimento {formatDate(r.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatBRL(Number(r.valor))}</p>
                    <Badge variant="outline" className={`${meta.cls} mt-1`}>
                      <Icon className="mr-1 h-3 w-3" />{meta.label}
                    </Badge>
                  </div>
                </div>
                {aberto && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => copyPix(r.id, Number(r.valor))}>
                      <Copy className="mr-2 h-3.5 w-3.5" /> Copiar PIX
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" disabled>
                      <FileText className="mr-2 h-3.5 w-3.5" /> Boleto
                    </Button>
                  </div>
                )}
                {r.status === "pago" && r.paid_at && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Quitado em {formatDate(r.paid_at)} {r.payment_method ? `· ${r.payment_method}` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Wallet className="h-3.5 w-3.5" /> Pagamento real
          </p>
          <p>Os códigos PIX e boletos são placeholders até a integração com um PSP (Asaas, Pagar.me, Stripe etc.) ser ativada pelo administrador.</p>
        </CardContent>
      </Card>
    </div>
  );
}
