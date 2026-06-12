import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, CheckCircle2, XCircle, QrCode, Camera, Pencil, Trash2, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBadge } from "./admin.index";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCPF, formatDate, formatPhone, initials } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/afiliados/$id")({
  component: AfiliadoDetail,
});

type AfiliadoForm = {
  full_name: string; cpf: string; rg: string; birth_date: string;
  phone: string; email: string; profession: string;
  address_street: string; address_number: string; address_city: string;
  address_state: string; address_zip: string;
};

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

  const removeAfiliado = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("afiliados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Afiliado excluído");
      qc.invalidateQueries({ queryKey: ["afiliados"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      navigate({ to: "/admin/afiliados" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  if (isLoading) return <AdminShell title="…"><p className="text-muted-foreground">Carregando…</p></AdminShell>;
  if (!a) return <AdminShell title="Não encontrado"><p>Afiliado não encontrado.</p></AdminShell>;

  return (
    <AdminShell title={a.full_name}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/afiliados" })}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <EditarAfiliadoDialog afiliado={a} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir afiliado?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação remove o cadastro de <strong>{a.full_name}</strong> permanentemente.
                    Mensalidades e movimentações vinculadas perdem a referência. Não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => removeAfiliado.mutate()}>
                    {removeAfiliado.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Excluir definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

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
            <PhotoCard afiliadoId={a.id} tenantId={a.tenant_id} fullName={a.full_name} photoUrl={a.photo_url} />

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

function EditarAfiliadoDialog({ afiliado }: { afiliado: Record<string, unknown> & { id: string } }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const a = afiliado as Record<string, string | null>;
  const [form, setForm] = useState<AfiliadoForm>({
    full_name: (a.full_name as string) ?? "",
    cpf: (a.cpf as string) ?? "",
    rg: a.rg ?? "",
    birth_date: a.birth_date ?? "",
    phone: a.phone ?? "",
    email: a.email ?? "",
    profession: a.profession ?? "",
    address_street: a.address_street ?? "",
    address_number: a.address_number ?? "",
    address_city: a.address_city ?? "",
    address_state: a.address_state ?? "",
    address_zip: a.address_zip ?? "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        full_name: (a.full_name as string) ?? "",
        cpf: (a.cpf as string) ?? "",
        rg: a.rg ?? "",
        birth_date: a.birth_date ?? "",
        phone: a.phone ?? "",
        email: a.email ?? "",
        profession: a.profession ?? "",
        address_street: a.address_street ?? "",
        address_number: a.address_number ?? "",
        address_city: a.address_city ?? "",
        address_state: a.address_state ?? "",
        address_zip: a.address_zip ?? "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setF = <K extends keyof AfiliadoForm>(k: K, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim() || !form.cpf.trim()) throw new Error("Nome e CPF são obrigatórios");
      const { error } = await supabase.from("afiliados").update({
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
      }).eq("id", afiliado.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cadastro atualizado");
      qc.invalidateQueries({ queryKey: ["afiliado", afiliado.id] });
      qc.invalidateQueries({ queryKey: ["afiliados"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" /> Editar
      </Button>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar afiliado</DialogTitle>
          <DialogDescription>Atualize os dados cadastrais.</DialogDescription>
        </DialogHeader>
        <form className="mt-4 space-y-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PhotoCard({ afiliadoId, tenantId, fullName, photoUrl }: {
  afiliadoId: string; tenantId: string; fullName: string; photoUrl: string | null;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [signed, setSigned] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!photoUrl) { setSigned(null); return; }
      const { data } = await supabase.storage.from("afiliado-fotos").createSignedUrl(photoUrl, 3600);
      if (!cancelled) setSigned(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [photoUrl]);

  const onPick = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máx 5 MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${tenantId}/${afiliadoId}/photo-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("afiliado-fotos").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) { setUploading(false); toast.error(up.error.message); return; }
    const { error } = await supabase.from("afiliados").update({ photo_url: path }).eq("id", afiliadoId);
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Foto atualizada");
    qc.invalidateQueries({ queryKey: ["afiliado", afiliadoId] });
  };

  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="text-base">Foto</CardTitle></CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <Avatar className="h-32 w-32 ring-2 ring-border">
          {signed && <AvatarImage src={signed} alt={fullName} />}
          <AvatarFallback className="text-3xl">{initials(fullName)}</AvatarFallback>
        </Avatar>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
        />
        <Button variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Camera className="mr-2 h-4 w-4" />
          {uploading ? "Enviando…" : photoUrl ? "Trocar foto" : "Enviar foto"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">PNG/JPG até 5MB.<br/>Aparece na carteirinha digital.</p>
      </CardContent>
    </Card>
  );
}
