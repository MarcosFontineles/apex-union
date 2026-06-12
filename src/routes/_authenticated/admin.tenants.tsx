import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tenants")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r) => r.role === "super_admin")) throw redirect({ to: "/admin" });
  },
  component: TenantsPage,
});

function TenantsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", primary_color: "#1E40AF", accent_color: "#3B82F6" });

  const { data: tenants } = useQuery({
    queryKey: ["all-tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_tenant_as_super_admin", {
        _name: form.name, _slug: form.slug,
        _primary_color: form.primary_color, _accent_color: form.accent_color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sindicato criado");
      setOpen(false);
      setForm({ name: "", slug: "", primary_color: "#1E40AF", accent_color: "#3B82F6" });
      qc.invalidateQueries({ queryKey: ["all-tenants"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <AdminShell title="Sindicatos (Super Admin)">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo sindicato</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar novo sindicato</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Slug (URL)</Label>
                  <Input required pattern="[a-z0-9\-]+" value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cor primária</Label>
                    <Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cor de destaque</Label>
                    <Input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="h-10" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader><CardTitle>Todos os sindicatos</CardTitle></CardHeader>
          <CardContent>
            {!tenants?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum sindicato.</p>
            ) : (
              <div className="divide-y">
                {tenants.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md text-white"
                      style={{ background: `linear-gradient(135deg, ${t.primary_color}, ${t.accent_color})` }}>
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground"><code>{t.slug}</code> · criado em {formatDate(t.created_at)}</p>
                    </div>
                    <Badge variant="outline" className={t.status === "ativo" ? "bg-success/15 text-success border-success/30" : ""}>{t.status}</Badge>
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
