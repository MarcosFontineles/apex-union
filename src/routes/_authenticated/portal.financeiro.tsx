import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/portal/financeiro")({
  component: () => (
    <Card className="shadow-card">
      <CardHeader><CardTitle>Financeiro</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Em breve: linha digitável, PIX e histórico de mensalidades.</p>
        <p>O módulo financeiro será conectado no próximo ciclo.</p>
      </CardContent>
    </Card>
  ),
});
