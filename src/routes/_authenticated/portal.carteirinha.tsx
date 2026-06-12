import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Building2, Download, RotateCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCPF, formatDate } from "@/lib/format";
import { generateCarteirinhaPDF } from "@/lib/carteirinha-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/carteirinha")({
  component: Carteirinha,
});

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

function Carteirinha() {
  const { user } = useAuth();
  const [flipped, setFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["carteirinha", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: a } = await supabase
        .from("afiliados")
        .select("id, full_name, matricula, cpf, joined_at, photo_url, status, tenant_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!a) return null;
      const { data: t } = await supabase
        .from("tenants")
        .select("name, logo_url, primary_color, accent_color")
        .eq("id", a.tenant_id)
        .maybeSingle();
      let photoSigned: string | null = null;
      if (a.photo_url) {
        const path = a.photo_url.split("/afiliado-fotos/")[1] ?? a.photo_url;
        const { data: signed } = await supabase.storage
          .from("afiliado-fotos").createSignedUrl(path, 600);
        photoSigned = signed?.signedUrl ?? null;
      }
      return { a, t, photoSigned };
    },
  });

  const verifyUrl = useMemo(
    () => (data?.a ? `${window.location.origin}/verificar/${data.a.id}` : ""),
    [data?.a],
  );

  const handleDownload = async () => {
    if (!data?.a || !data.t) return;
    setDownloading(true);
    try {
      const photo_data_url = data.photoSigned ? await urlToDataUrl(data.photoSigned) : null;
      const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
      const qr_data_url = canvas?.toDataURL("image/png") ?? null;
      generateCarteirinhaPDF({
        full_name: data.a.full_name,
        matricula: data.a.matricula,
        cpf: formatCPF(data.a.cpf),
        joined_at: data.a.joined_at ? formatDate(data.a.joined_at) : null,
        tenant_name: data.t.name ?? "Sindicato",
        primary_color: data.t.primary_color ?? "#1E40AF",
        accent_color: data.t.accent_color ?? "#3B82F6",
        verify_url: verifyUrl,
        photo_data_url,
        qr_data_url,
      });
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (!data?.a) {
    return <Card className="p-6 text-sm text-muted-foreground">Carteirinha indisponível.</Card>;
  }

  const { a, t, photoSigned } = data;

  return (
    <div className="space-y-4">
      {/* hidden canvas QR for PDF capture */}
      <div ref={qrRef} className="hidden">
        <QRCodeCanvas value={verifyUrl} size={256} level="M" />
      </div>

      <div className="perspective-[1200px]">
        <div
          onClick={() => setFlipped((f) => !f)}
          className="relative h-[230px] cursor-pointer transition-transform duration-700 [transform-style:preserve-3d]"
          style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <CardFace>
            <div className="flex h-full flex-col justify-between p-5 text-primary-foreground">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/70">Carteira de Filiado</p>
                  <p className="mt-1 font-semibold leading-tight">{t?.name ?? "Sindicato"}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-foreground/15 backdrop-blur">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex h-20 w-16 items-center justify-center overflow-hidden rounded-md bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
                  {photoSigned ? (
                    <img src={photoSigned} alt={a.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold opacity-60">{a.full_name?.[0]}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">Nome</p>
                  <p className="truncate font-semibold">{a.full_name}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-primary-foreground/60">Matrícula</p>
                  <p className="font-mono text-sm">{a.matricula}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-primary-foreground/70">
                <span>Desde {formatDate(a.joined_at)}</span>
                <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verificável</span>
              </div>
            </div>
          </CardFace>

          <CardFace back>
            <div className="grid h-full grid-cols-[1fr_auto] gap-4 p-5 text-foreground">
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Validação</p>
                  <p className="mt-1 text-sm font-semibold leading-tight">Aponte a câmera para confirmar</p>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><span className="text-foreground font-medium">CPF:</span> {formatCPF(a.cpf)}</p>
                  <p className="truncate"><span className="text-foreground font-medium">ID:</span> {a.id.slice(0, 8)}</p>
                  <p className="break-all">{verifyUrl}</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="rounded-md bg-background p-2 ring-1 ring-border">
                  <QRCodeSVG value={verifyUrl} size={112} level="M" />
                </div>
              </div>
            </div>
          </CardFace>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setFlipped((f) => !f)}>
          <RotateCw className="mr-2 h-4 w-4" />
          {flipped ? "Frente" : "Verso"}
        </Button>
        <Button onClick={handleDownload} disabled={downloading}>
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Gerando…" : "Baixar PDF"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Toque na carteirinha para girar. O PDF gerado tem tamanho real (85,6 × 54 mm).
      </p>
    </div>
  );
}

function CardFace({ children, back = false }: { children: React.ReactNode; back?: boolean }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-2xl shadow-elev [backface-visibility:hidden]"
      style={{
        transform: back ? "rotateY(180deg)" : undefined,
        background: back ? "var(--card)" : "var(--gradient-hero)",
        border: back ? "1px solid var(--border)" : "1px solid oklch(1 0 0 / 0.15)",
      }}
    >
      {children}
    </div>
  );
}
