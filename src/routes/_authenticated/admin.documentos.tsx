import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Download, Trash2, Loader2, Plus } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/admin/documentos")({
  component: DocumentosPage,
});

const CATEGORIAS = ["estatuto", "ata", "convencao", "comunicado", "contrato", "outro"] as const;
const VISIBILIDADES = ["publico", "afiliados", "staff"] as const;

function DocumentosPage() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", categoria: "outro", visibilidade: "staff" });

  const { data: docs } = useQuery({
    queryKey: ["documentos", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("documentos")
        .select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !file) { toast.error("Selecione um arquivo"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${tenant.id}/docs/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const up = await supabase.storage.from("afiliado-documentos").upload(path, file, { contentType: file.type });
    if (up.error) { setUploading(false); toast.error(up.error.message); return; }
    const { error } = await supabase.from("documentos").insert({
      tenant_id: tenant.id,
      titulo: form.titulo,
      descricao: form.descricao || null,
      categoria: form.categoria as typeof CATEGORIAS[number],
      visibilidade: form.visibilidade as typeof VISIBILIDADES[number],
      storage_bucket: "afiliado-documentos",
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Documento enviado");
    setOpen(false);
    setFile(null);
    setForm({ titulo: "", descricao: "", categoria: "outro", visibilidade: "staff" });
    qc.invalidateQueries({ queryKey: ["documentos"] });
  };

  const download = async (path: string, titulo: string) => {
    const { data, error } = await supabase.storage.from("afiliado-documentos").createSignedUrl(path, 120, { download: titulo });
    if (error || !data) { toast.error("Erro ao gerar link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const remove = useMutation({
    mutationFn: async (d: { id: string; storage_path: string }) => {
      await supabase.storage.from("afiliado-documentos").remove([d.storage_path]);
      const { error } = await supabase.from("documentos").delete().eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Documento removido"); qc.invalidateQueries({ queryKey: ["documentos"] }); },
  });

  return (
    <AdminShell title="Documentos">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo documento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Enviar documento</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-1.5">
                  <Label className="text-xs">Título</Label>
                  <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Categoria</Label>
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Visibilidade</Label>
                    <Select value={form.visibilidade} onValueChange={(v) => setForm({ ...form, visibilidade: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{VISIBILIDADES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Arquivo</Label>
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <Button type="button" variant="outline" className="w-full justify-start" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    {file ? file.name : "Selecionar arquivo"}
                  </Button>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={uploading || !file}>
                    {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader><CardTitle>Biblioteca de documentos</CardTitle></CardHeader>
          <CardContent>
            {!docs?.length ? (
              <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto mb-2 h-6 w-6 opacity-50" />
                Nenhum documento ainda.
              </div>
            ) : (
              <div className="divide-y">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 py-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{d.titulo}</p>
                        <Badge variant="outline" className="text-[10px]">{d.categoria}</Badge>
                        <Badge variant="outline" className="text-[10px]">{d.visibilidade}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(d.created_at)} · {d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : ""}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => download(d.storage_path, d.titulo)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir este documento?")) remove.mutate({ id: d.id, storage_path: d.storage_path }); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
