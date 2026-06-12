import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/portal/juridico")({
  component: PortalJuridico,
});

function PortalJuridico() {
  const { user } = useAuth();

  const { data: processos } = useQuery({
    queryKey: ["meus-processos", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("processos")
        .select("id, numero_processo, titulo, status, tipo, proxima_audiencia, advogado_responsavel, descricao, processo_andamentos(id, descricao, data_andamento)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!processos?.length) {
    return (
      <Card className="shadow-card">
        <CardHeader><CardTitle>Meus processos</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground py-8 text-center">
          <Gavel className="mx-auto mb-2 h-6 w-6 opacity-50" />
          Você não possui processos vinculados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {processos.map((p) => {
        const ands = (p.processo_andamentos as { id: string; descricao: string; data_andamento: string }[] | null)
          ?.sort((a, b) => b.data_andamento.localeCompare(a.data_andamento)).slice(0, 5) ?? [];
        return (
          <Card key={p.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex-1">{p.titulo}</CardTitle>
                <Badge variant="outline">{p.status}</Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{p.numero_processo}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Tipo:</span> {p.tipo}</div>
                <div><span className="text-muted-foreground">Advogado:</span> {p.advogado_responsavel ?? "—"}</div>
                {p.proxima_audiencia && <div className="col-span-2"><span className="text-muted-foreground">Próxima audiência:</span> {formatDate(p.proxima_audiencia)}</div>}
              </div>
              {ands.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Últimos andamentos</p>
                  {ands.map((a) => (
                    <div key={a.id} className="border-l-2 border-primary pl-3">
                      <p className="text-xs text-muted-foreground">{formatDate(a.data_andamento)}</p>
                      <p className="text-sm">{a.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
