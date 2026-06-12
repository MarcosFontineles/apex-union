import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, Link as LinkIcon, FileSpreadsheet, ArrowRight } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const { tenant, loading } = useTenant();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#1E40AF");
  const [accent, setAccent] = useState("#3B82F6");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setPrimary(tenant.primary_color);
    setAccent(tenant.accent_color);
    setLogoPath(tenant.logo_url);
  }, [tenant]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!logoPath) { setLogoPreview(null); return; }
      const { data } = await supabase.storage.from("tenant-assets").createSignedUrl(logoPath, 3600);
      if (!cancelled) setLogoPreview(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [logoPath]);

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant) throw new Error("Tenant não carregado");
      const { error } = await supabase.rpc("update_tenant_branding", {
        _tenant_id: tenant.id,
        _name: name,
        _logo_url: logoPath ?? "",
        _primary_color: primary,
        _accent_color: accent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Identidade visual salva");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const onPickLogo = async (file: File) => {
    if (!tenant) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Máx 2 MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${tenant.id}/logo-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (up.error) { toast.error(up.error.message); return; }
    setLogoPath(path);
    toast.success("Logo enviado — clique em salvar para aplicar");
  };

  if (loading || !tenant) {
    return <AdminShell title="Configurações"><p className="text-muted-foreground">Carregando…</p></AdminShell>;
  }

  const cadastroUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/cadastro/${tenant.slug}`;

  return (
    <AdminShell title="Configurações">
      <div className="grid gap-6 max-w-3xl">
        <Card className="shadow-card">
          <CardHeader><CardTitle>Identidade visual (White Label)</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-[140px_1fr] items-start">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">sem logo</span>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && onPickLogo(e.target.files[0])} />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                  {logoPath ? "Trocar" : "Enviar logo"}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do sindicato</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cor primária</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)}
                        className="h-10 w-12 cursor-pointer rounded-md border bg-transparent" />
                      <Input value={primary} onChange={(e) => setPrimary(e.target.value)} className="font-mono" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cor de destaque</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)}
                        className="h-10 w-12 cursor-pointer rounded-md border bg-transparent" />
                      <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="font-mono" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
              <p className="text-xs uppercase tracking-wider text-white/70">Pré-visualização</p>
              <p className="mt-1 text-lg font-semibold text-white">{name || "Seu sindicato"}</p>
            </div>

            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar identidade visual
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle>Link público de auto-cadastro</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Compartilhe este link para receber novas filiações.</p>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <code className="flex-1 truncate text-xs">{cadastroUrl}</code>
              <Button size="sm" variant="outline" onClick={() => {
                navigator.clipboard.writeText(cadastroUrl);
                toast.success("Link copiado");
              }}>Copiar</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle>Importação em lote</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
              <FileSpreadsheet className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Importar afiliados por CSV</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Carregue planilhas com mapeamento de colunas e pré-visualização antes de importar.
                </p>
              </div>
              <Link to="/admin/importar">
                <Button size="sm" variant="outline">
                  Abrir <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle>Dados do sindicato</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Slug:</span> <code>{tenant.slug}</code></p>
            <p><span className="text-muted-foreground">ID:</span> <code className="text-xs">{tenant.id}</code></p>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
