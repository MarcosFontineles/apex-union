import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CheckCircle2, XCircle, QrCode } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBadge } from "./admin.index";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCPF, formatDate, formatPhone } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/afiliados/$id")({
  component: AfiliadoDetail,
});

function AfiliadoDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: a, isLoading } = useQuery({
    queryKey: ["afiliado", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("afiliados").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async (status: "ativo" | "inativo" | "suspenso" | "pendente") => {
      const patch: { status: typeof status; joined_at?: string } = { status };
      if (status === "ativo" && !a?.joined_at) patch.joined_at = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("afiliados").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["afiliado", id] });
      qc.invalidateQueries({ queryKey: ["afiliados"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (isLoading) return <AdminShell title="…"><p className="text-muted-foreground">Carregando…</p></AdminShell>;
  if (!a) return <AdminShell title="Não encontrado"><p>Afiliado não encontrado.</p></AdminShell>;

  return (
    <AdminShell title={a.full_name}>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/afiliados" })}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Dados cadastrais</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Matrícula <span className="font-mono">{a.matricula}</span></p>
                </div>
                <StatusBadge status={a.status} />
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <Field label="CPF" value={formatCPF(a.cpf)} />
                  <Field label="RG" value={a.rg ?? "—"} />
                  <Field label="Nascimento" value={formatDate(a.birth_date)} />
                  <Field label="Profissão" value={a.profession ?? "—"} />
                  <Field label="Telefone" value={a.phone ? formatPhone(a.phone) : "—"} />
                  <Field label="E-mail" value={a.email ?? "—"} />
                  <Field label="Endereço" value={[a.address_street, a.address_number].filter(Boolean).join(", ") || "—"} />
                  <Field label="Cidade / UF" value={[a.address_city, a.address_state].filter(Boolean).join(" / ") || "—"} />
                  <Field label="CEP" value={a.address_zip ?? "—"} />
                  <Field label="Filiado em" value={formatDate(a.joined_at)} />
                </dl>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Consentimento LGPD</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-3 text-sm">
                {a.consent_lgpd ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span>Aceito em {formatDate(a.consent_lgpd_at)}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span>Não registrado</span>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Ações</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {a.status !== "ativo" && (
                  <Button className="w-full" onClick={() => setStatus.mutate("ativo")} disabled={setStatus.isPending}>
                    Aprovar e ativar
                  </Button>
                )}
                {a.status === "ativo" && (
                  <Button variant="outline" className="w-full" onClick={() => setStatus.mutate("suspenso")}>
                    Suspender
                  </Button>
                )}
                {a.status !== "inativo" && (
                  <Button variant="ghost" className="w-full" onClick={() => setStatus.mutate("inativo")}>
                    Marcar como inativo
                  </Button>
                )}
                <Link to="/verificar/$id" params={{ id: a.id }} target="_blank" className="block pt-2">
                  <Button variant="outline" className="w-full">
                    <QrCode className="mr-2 h-4 w-4" /> Página pública de verificação
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
