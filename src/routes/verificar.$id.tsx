import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldX, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/verificar/$id")({
  head: () => ({
    meta: [
      { title: "Validação de carteirinha — UnionSaaS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
});

interface VerifyResult {
  id: string;
  matricula: string;
  full_name: string;
  status: string;
  photo_url: string | null;
  tenant_name: string;
  tenant_logo: string | null;
  tenant_primary_color: string;
  joined_at: string | null;
}

function VerifyPage() {
  const { id } = Route.useParams();
  const [data, setData] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("verify_carteirinha", { _afiliado_id: id }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      setData((row as VerifyResult) ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <Centered><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Centered>;
  }

  if (!data) {
    return (
      <Centered>
        <Card className="max-w-sm w-full shadow-elev">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
              <ShieldX className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Carteirinha inválida</h1>
              <p className="mt-1 text-sm text-muted-foreground">Não foi possível validar este código QR. Pode estar expirado ou pertencer a um sindicato inativo.</p>
            </div>
            <Link to="/"><Button variant="outline" className="w-full">Voltar ao início</Button></Link>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  const isActive = data.status === "ativo";

  return (
    <Centered>
      <Card className="max-w-sm w-full shadow-elev overflow-hidden">
        <div className="bg-hero p-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary-foreground/70">
            <Building2 className="h-3.5 w-3.5" /> {data.tenant_name}
          </div>
          <p className="mt-1 text-base font-semibold">Validação oficial de filiação</p>
        </div>
        <CardContent className="p-6 space-y-5">
          <div className={`flex items-center gap-3 rounded-lg p-3 ${isActive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {isActive ? <ShieldCheck className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
            <div>
              <p className="text-sm font-semibold capitalize">{isActive ? "Filiação ativa" : data.status}</p>
              <p className="text-xs opacity-80">Consulta realizada em {formatDate(new Date())}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-20 w-16 items-center justify-center overflow-hidden rounded-md bg-muted ring-1 ring-border">
              {data.photo_url
                ? <img src={data.photo_url} alt={data.full_name} className="h-full w-full object-cover" />
                : <span className="text-2xl font-semibold text-muted-foreground">{data.full_name[0]}</span>}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Filiado</p>
              <p className="font-semibold leading-tight">{data.full_name}</p>
              <p className="mt-1 text-xs font-mono text-muted-foreground">Matrícula {data.matricula}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 text-xs text-muted-foreground">
            Desde {formatDate(data.joined_at)} · ID {data.id.slice(0, 8)}
          </div>
        </CardContent>
      </Card>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-6">{children}</div>;
}
