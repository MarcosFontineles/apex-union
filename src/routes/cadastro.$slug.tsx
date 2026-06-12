import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Building2, CheckCircle2, Loader2, Eraser } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatCPF, formatPhone } from "@/lib/format";

export const Route = createFileRoute("/cadastro/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Auto-cadastro — ${params.slug}` },
      { name: "description", content: "Realize sua filiação digital de forma segura. Anexe seus documentos, assine eletronicamente e acompanhe seu status." },
    ],
  }),
  component: PublicSignup,
});

interface TenantPublic { id: string; name: string; primary_color: string; }

function PublicSignup() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const sigRef = useRef<SignatureCanvas | null>(null);

  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [success, setSuccess] = useState<{ id: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    cpf: "",
    rg: "",
    birth_date: "",
    phone: "",
    email: "",
    profession: "",
    address_street: "",
    address_number: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    consent: false,
  });

  useEffect(() => {
    supabase.from("tenants").select("id, name, primary_color").eq("slug", slug).eq("status", "ativo").maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true);
        else setTenant(data as TenantPublic);
      });
  }, [slug]);

  if (notFound) {
    return (
      <Centered>
        <Card className="max-w-md w-full shadow-card">
          <CardHeader><CardTitle>Sindicato não encontrado</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>O link de cadastro <code>{slug}</code> não corresponde a nenhum sindicato ativo.</p>
            <Link to="/"><Button variant="outline">Voltar ao início</Button></Link>
          </CardContent>
        </Card>
      </Centered>
    );
  }
  if (!tenant) return <Centered><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Centered>;

  if (success) {
    return (
      <Centered>
        <Card className="max-w-md w-full shadow-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Cadastro recebido!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sua filiação ao {tenant.name} foi registrada como pendente.
                A equipe administrativa fará a análise em breve.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Protocolo: <code>{success.id.slice(0, 8)}</code></p>
            <Link to="/"><Button variant="outline" className="w-full">Voltar ao início</Button></Link>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) { toast.error("É necessário aceitar o termo LGPD"); return; }
    if (sigRef.current?.isEmpty()) { toast.error("Por favor, assine no campo abaixo"); return; }

    setSubmitting(true);
    try {
      const matricula = `M${Date.now().toString().slice(-7)}`;
      const signaturePng = sigRef.current!.toDataURL("image/png");

      const { data: created, error } = await supabase.from("afiliados").insert({
        tenant_id: tenant.id,
        matricula,
        full_name: form.full_name,
        cpf: form.cpf.replace(/\D/g, ""),
        rg: form.rg || null,
        birth_date: form.birth_date || null,
        phone: form.phone.replace(/\D/g, "") || null,
        email: form.email || null,
        profession: form.profession || null,
        address_street: form.address_street || null,
        address_number: form.address_number || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_zip: form.address_zip || null,
        signature_url: signaturePng,
        status: "pendente",
        consent_lgpd: true,
        consent_lgpd_at: new Date().toISOString(),
      }).select("id").maybeSingle();

      if (error) throw error;
      setSuccess({ id: created!.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar cadastro";
      if (msg.includes("duplicate")) toast.error("Já existe um cadastro com esse CPF neste sindicato.");
      else toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-2xl px-5 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground">
            <Building2 className="h-4 w-4" /> UnionSaaS
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Filiação ao {tenant.name}</h1>
          <p className="mt-1 text-sm text-primary-foreground/80">Preencha seus dados, aceite o termo LGPD e assine digitalmente.</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <form onSubmit={onSubmit} className="space-y-6">
          <Section title="Dados pessoais">
            <Grid>
              <Field label="Nome completo" required full>
                <Input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
              </Field>
              <Field label="CPF" required>
                <Input required inputMode="numeric" maxLength={14} value={formatCPF(form.cpf)} onChange={(e) => set("cpf", e.target.value)} />
              </Field>
              <Field label="RG"><Input value={form.rg} onChange={(e) => set("rg", e.target.value)} /></Field>
              <Field label="Data de nascimento"><Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} /></Field>
              <Field label="Profissão"><Input value={form.profession} onChange={(e) => set("profession", e.target.value)} /></Field>
              <Field label="Telefone"><Input inputMode="tel" value={formatPhone(form.phone)} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            </Grid>
          </Section>

          <Section title="Endereço">
            <Grid>
              <Field label="Logradouro" full><Input value={form.address_street} onChange={(e) => set("address_street", e.target.value)} /></Field>
              <Field label="Número"><Input value={form.address_number} onChange={(e) => set("address_number", e.target.value)} /></Field>
              <Field label="CEP"><Input value={form.address_zip} onChange={(e) => set("address_zip", e.target.value)} /></Field>
              <Field label="Cidade"><Input value={form.address_city} onChange={(e) => set("address_city", e.target.value)} /></Field>
              <Field label="UF"><Input maxLength={2} value={form.address_state} onChange={(e) => set("address_state", e.target.value.toUpperCase())} /></Field>
            </Grid>
          </Section>

          <Section title="Assinatura digital">
            <p className="text-xs text-muted-foreground mb-2">Assine no espaço abaixo usando o dedo (mobile) ou mouse.</p>
            <div className="rounded-md border border-input bg-card">
              <SignatureCanvas
                ref={sigRef}
                penColor="#0F172A"
                canvasProps={{ className: "w-full h-40 rounded-md" }}
              />
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => sigRef.current?.clear()}>
              <Eraser className="mr-1.5 h-3.5 w-3.5" /> Limpar
            </Button>
          </Section>

          <Section title="Consentimento">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <Checkbox checked={form.consent} onCheckedChange={(v) => set("consent", v === true)} className="mt-0.5" />
              <span className="text-muted-foreground leading-relaxed">
                Declaro que os dados acima são verdadeiros e <strong className="text-foreground">autorizo o {tenant.name}</strong> a tratar
                meus dados pessoais para fins de filiação, atendimento, comunicação e cumprimento de obrigações legais, nos termos da
                <strong className="text-foreground"> Lei nº 13.709/2018 (LGPD)</strong>. Posso solicitar exclusão a qualquer momento.
              </span>
            </label>
          </Section>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar cadastro
          </Button>
        </form>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}
function Field({ label, required, full, children }: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}{required && <span className="text-destructive">*</span>}</Label>
      {children}
    </div>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-6">{children}</div>;
}
