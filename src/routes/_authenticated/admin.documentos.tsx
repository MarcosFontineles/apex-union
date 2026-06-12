import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/documentos")({
  component: () => (
    <AdminShell title="Documentos">
      <Card className="max-w-2xl shadow-card">
        <CardHeader><CardTitle>Documentação automática</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Geração de PDFs (declarações de filiação) e lotes de carteirinhas para impressão.</p>
          <p>Módulo previsto para o próximo ciclo.</p>
          <Link to="/admin"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button></Link>
        </CardContent>
      </Card>
    </AdminShell>
  ),
});
