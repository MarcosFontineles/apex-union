import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/hooks/use-tenant";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: () => {
    const { tenant } = useTenant();
    return (
      <AdminShell title="Configurações">
        <div className="grid gap-6 max-w-3xl">
          <Card className="shadow-card">
            <CardHeader><CardTitle>White Label</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">Identidade visual aplicada ao seu sindicato.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Cor primária</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="h-10 w-10 rounded-md border" style={{ background: tenant?.primary_color }} />
                    <code className="text-xs">{tenant?.primary_color}</code>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Cor de destaque</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="h-10 w-10 rounded-md border" style={{ background: tenant?.accent_color }} />
                    <code className="text-xs">{tenant?.accent_color}</code>
                  </div>
                </div>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">Edição visual será habilitada no próximo ciclo.</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle>Dados do sindicato</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Nome:</span> {tenant?.name}</p>
              <p><span className="text-muted-foreground">Slug:</span> <code>{tenant?.slug}</code></p>
            </CardContent>
          </Card>
        </div>
      </AdminShell>
    );
  },
});
