import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/juridico")({
  component: () => (
    <AdminShell title="Jurídico">
      <Card className="max-w-2xl shadow-card">
        <CardHeader><CardTitle>Gestão Jurídica</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Processos judiciais, prazos, histórico de movimentações e gestão de aposentadoria.</p>
          <p>Módulo previsto para o próximo ciclo. A base de afiliados já está conectada.</p>
          <Link to="/admin"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button></Link>
        </CardContent>
      </Card>
    </AdminShell>
  ),
});
