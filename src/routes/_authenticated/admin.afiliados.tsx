import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Search, Copy, ExternalLink, UserPlus, Upload, Download, FileText,
  MoreHorizontal, Eye, CheckCircle2, XCircle, Pause, Check, Loader2,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBadge } from "./admin.index";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { formatCPF, formatDate, formatPhone } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/afiliados")({
  component: AfiliadosList,
});

type StatusFilter = "todos" | "ativo" | "pendente" | "inativo" | "suspenso";

function AfiliadosList() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [linkOpen, setLinkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const emptyForm = {
    full_name: "", cpf: "", rg: "", birth_date: "", phone: "", email: "",
    profession: "", address_street: "", address_number: "", address_city: "",
    address_state: "", address_zip: "",
  };
  const [form, setForm] = useState(emptyForm);
  const setF = <K extends keyof typeof emptyForm>(k: K, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const signupUrl = tenant ? `${window.location.origin}/cadastro/${tenant.slug}` : "";

  const createAfiliado = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Sindicato não selecionado");
      if (!form.full_name.trim() || !form.cpf.trim()) throw new Error("Nome e CPF são obrigatórios");
      const { data: mat, error: mErr } = await supabase.rpc("next_matricula", { _tenant_id: tenant.id });
      if (mErr) throw mErr;
      const { error } = await supabase.from("afiliados").insert({
        tenant_id: tenant.id,
        matricula: mat as string,
        full_name: form.full_name.trim(),
        cpf: form.cpf.replace(/\D/g, ""),
        rg: form.rg || null,
        birth_date: form.birth_date || null,
        phone: form.phone.replace(/\D/g, "") || null,
        email: form.email || null,
        profession: form.profession || null,
        address_street: form.address_street || null,
        address_number: form.address_number || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_zip: form.address_zip || null,
        status: "ativo",
        joined_at: new Date().toISOString().slice(0, 10),
        consent_lgpd: true,
        consent_lgpd_at: new Date().toISOString(),
      });
      if (error) throw error;
      return mat as string;
    },
    onSuccess: (mat) => {
      toast.success(`Afiliado cadastrado — matrícula ${mat}`);
      setForm(emptyForm);
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["afiliados"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => {
      const m = e instanceof Error ? e.message : "Erro ao cadastrar";
      toast.error(m.includes("duplicate") ? "Já existe cadastro com esse CPF neste sindicato." : m);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["afiliados", tenant?.id, q, status],
    enabled: !!tenant?.id,
    queryFn: async () => {
      let query = supabase
        .from("afiliados")
        .select("id, matricula, full_name, cpf, email, status, phone, created_at")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "todos") query = query.eq("status", status);
      if (q.trim()) query = query.or(`full_name.ilike.%${q}%,matricula.ilike.%${q}%,cpf.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = useMemo(() => {
    const c = { ativo: 0, pendente: 0, inativo: 0, suspenso: 0 };
    (data ?? []).forEach((a) => { c[a.status as keyof typeof c] = (c[a.status as keyof typeof c] ?? 0) + 1; });
    return c;
  }, [data]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, novo }: { id: string; novo: "ativo" | "inativo" | "suspenso" | "pendente" }) => {
      const patch: { status: typeof novo; joined_at?: string } = { status: novo };
      if (novo === "ativo") patch.joined_at = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("afiliados").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["afiliados"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar"),
  });

  const copyLink = async () => {
    if (!signupUrl) return;
    try {
      await navigator.clipboard.writeText(signupUrl);
      toast.success("Link copiado para a área de transferência");
    } catch {
      setLinkOpen(true);
    }
  };

  const exportCSV = () => {
    if (!data?.length) { toast.error("Nada para exportar"); return; }
    const rows = [
      ["Matrícula", "Nome", "CPF", "E-mail", "Telefone", "Status", "Cadastrado em"],
      ...data.map((a) => [
        a.matricula, a.full_name, formatCPF(a.cpf), a.email ?? "",
        a.phone ? formatPhone(a.phone) : "", a.status, formatDate(a.created_at),
      ]),
    ];
    const csv = rows.map((r) =>
      r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"),
    ).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afiliados-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${data.length} registros exportados`);
  };

  const printRelatorio = () => {
    if (!data?.length) { toast.error("Nada para imprimir"); return; }
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const linhas = data.map((a) => `
      <tr>
        <td>${a.matricula}</td>
        <td>${a.full_name}</td>
        <td>${formatCPF(a.cpf)}</td>
        <td>${a.phone ? formatPhone(a.phone) : "-"}</td>
        <td>${a.status}</td>
        <td>${formatDate(a.created_at)}</td>
      </tr>`).join("");
    w.document.write(`
      <html><head><title>Relatório de Afiliados — ${tenant?.name ?? ""}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 4px}
        .meta{color:#666;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd}
        th{background:#f5f5f5;text-transform:uppercase;font-size:10px;letter-spacing:.05em}
      </style></head><body>
      <h1>Relatório de Afiliados — ${tenant?.name ?? ""}</h1>
      <div class="meta">Gerado em ${new Date().toLocaleString("pt-BR")} • ${data.length} registros</div>
      <table><thead><tr>
        <th>Matrícula</th><th>Nome</th><th>CPF</th><th>Telefone</th><th>Status</th><th>Cadastro</th>
      </tr></thead><tbody>${linhas}</tbody></table>
      <script>window.onload=()=>setTimeout(()=>window.print(),200)</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <AdminShell title="Afiliados">
      <div className="space-y-6">
        {/* Toolbar de ações */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} disabled={!tenant}>
              <UserPlus className="mr-2 h-4 w-4" /> Novo cadastro
            </Button>
            <Button variant="outline" onClick={copyLink} disabled={!tenant}>
              <Copy className="mr-2 h-4 w-4" /> Copiar link de auto-cadastro
            </Button>
            <Link to="/admin/importar">
              <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Importar CSV</Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            <Button variant="outline" onClick={printRelatorio}>
              <FileText className="mr-2 h-4 w-4" /> Relatório
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, matrícula ou CPF"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
              <SelectItem value="suspenso">Suspensos</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-muted-foreground">
            {data?.length ?? 0} resultado(s) • Ativos: {counts.ativo} • Pendentes: {counts.pendente}
          </div>
        </div>

        {/* Tabela */}
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
                  <th className="text-right font-medium px-4 py-3 w-10">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>
                )}
                {!isLoading && !data?.length && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhum afiliado encontrado.</td></tr>
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
                    <td className="px-4 py-3 text-muted-foreground">{a.phone ? formatPhone(a.phone) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/afiliados/$id" params={{ id: a.id }}>
                              <Eye className="mr-2 h-4 w-4" /> Abrir cadastro
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {a.status !== "ativo" && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: a.id, novo: "ativo" })}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-success" /> Aprovar / Ativar
                            </DropdownMenuItem>
                          )}
                          {a.status !== "suspenso" && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: a.id, novo: "suspenso" })}>
                              <Pause className="mr-2 h-4 w-4 text-warning" /> Suspender
                            </DropdownMenuItem>
                          )}
                          {a.status !== "inativo" && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: a.id, novo: "inativo" })}>
                              <XCircle className="mr-2 h-4 w-4 text-destructive" /> Inativar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Dialog fallback do link */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de auto-cadastro</DialogTitle>
            <DialogDescription>
              Compartilhe este link com novos afiliados. Eles poderão se cadastrar pela página pública.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={signupUrl} onFocus={(e) => e.currentTarget.select()} />
            <Button
              onClick={() => {
                navigator.clipboard?.writeText(signupUrl).then(
                  () => toast.success("Copiado"),
                  () => toast.error("Não foi possível copiar — selecione manualmente"),
                );
              }}
            >
              <Check className="mr-2 h-4 w-4" /> Copiar
            </Button>
          </div>
          <DialogFooter>
            <a href={signupUrl} target="_blank" rel="noreferrer">
              <Button variant="outline"><ExternalLink className="mr-2 h-4 w-4" /> Abrir página</Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de novo cadastro */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo afiliado</DialogTitle>
            <DialogDescription>
              Cadastro feito pela administração. A matrícula é gerada automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form
            className="mt-4 space-y-5"
            onSubmit={(e) => { e.preventDefault(); createAfiliado.mutate(); }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Nome completo*</Label>
                <Input required value={form.full_name} onChange={(e) => setF("full_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CPF*</Label>
                <Input required maxLength={14} value={formatCPF(form.cpf)} onChange={(e) => setF("cpf", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">RG</Label>
                <Input value={form.rg} onChange={(e) => setF("rg", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data de nascimento</Label>
                <Input type="date" value={form.birth_date} onChange={(e) => setF("birth_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Profissão</Label>
                <Input value={form.profession} onChange={(e) => setF("profession", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input value={formatPhone(form.phone)} onChange={(e) => setF("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Logradouro</Label>
                <Input value={form.address_street} onChange={(e) => setF("address_street", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Número</Label>
                <Input value={form.address_number} onChange={(e) => setF("address_number", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CEP</Label>
                <Input value={form.address_zip} onChange={(e) => setF("address_zip", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cidade</Label>
                <Input value={form.address_city} onChange={(e) => setF("address_city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">UF</Label>
                <Input maxLength={2} value={form.address_state} onChange={(e) => setF("address_state", e.target.value.toUpperCase())} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createAfiliado.isPending}>
                {createAfiliado.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar afiliado
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
