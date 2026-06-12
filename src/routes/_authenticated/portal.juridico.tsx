import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/portal/juridico")({
  component: () => (
    <Card className="shadow-card">
      <CardHeader><CardTitle>Jurídico</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Em breve: acompanhamento de processos e status de aposentadoria.</p>
      </CardContent>
    </Card>
  ),
});
