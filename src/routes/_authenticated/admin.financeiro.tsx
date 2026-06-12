import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const STUBS: Record<string, { title: string; desc: string }> = {
  financeiro: { title: "Financeiro", desc: "Mensalidades, carnês, boleto, PIX e simulação de integração bancária." },
  juridico: { title: "Jurídico", desc: "Processos, prazos, aposentadorias e movimentações." },
  documentos: { title: "Documentos", desc: "Gerador de PDFs de declarações e lotes de carteirinhas para impressão." },
  configuracoes: { title: "Configurações", desc: "White label, dados do sindicato, equipe e permissões." },
};

function makeStub(key: string) {
  const meta = STUBS[key];
  return function Stub() {
    return (
      <AdminShell title={meta.title}>
        <Card className="max-w-2xl shadow-card">
          <CardHeader><CardTitle>{meta.title}</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{meta.desc}</p>
            <p>Este módulo será construído no próximo ciclo. A base multi-tenant, RLS e auditoria já estão prontas para receber a lógica.</p>
            <Link to="/admin"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao dashboard</Button></Link>
          </CardContent>
        </Card>
      </AdminShell>
    );
  };
}

export const Route = createFileRoute("/_authenticated/admin/financeiro")({ component: makeStub("financeiro") });
