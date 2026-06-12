import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, CheckCircle2, XCircle, ArrowRight, FileSpreadsheet } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/importar")({
  component: ImportPage,
});

const TARGET_FIELDS = [
  { key: "full_name", label: "Nome completo *", required: true },
  { key: "cpf", label: "CPF *", required: true },
  { key: "matricula", label: "Matrícula" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "rg", label: "RG" },
  { key: "birth_date", label: "Nascimento (AAAA-MM-DD)" },
  { key: "profession", label: "Profissão" },
  { key: "address_street", label: "Endereço" },
  { key: "address_number", label: "Número" },
  { key: "address_city", label: "Cidade" },
  { key: "address_state", label: "UF" },
  { key: "address_zip", label: "CEP" },
] as const;

type Step = 1 | 2 | 3 | 4;

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

function ImportPage() {
  const { tenant } = useTenant();
  const [step, setStep] = useState<Step>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // target -> csv header
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ ok: number; fail: number; errors: string[] } | null>(null);

  const handleFile = async (f: File) => {
    const text = await f.text();
    const parsed = parseCSV(text);
    if (!parsed.length) { toast.error("Arquivo vazio"); return; }
    const [hdr, ...rest] = parsed;
    setHeaders(hdr.map((h) => h.trim()));
    setRows(rest);
    // auto-map by name (case-insensitive)
    const m: Record<string, string> = {};
    TARGET_FIELDS.forEach((t) => {
      const found = hdr.find((h) => h.trim().toLowerCase() === t.key.toLowerCase()
        || h.trim().toLowerCase() === t.label.replace(/\s\*.*/, "").toLowerCase());
      if (found) m[t.key] = found;
    });
    setMapping(m);
    setStep(2);
  };

  const runImport = async () => {
    if (!tenant) return;
    setStep(4);
    setProgress(0);
    let ok = 0, fail = 0;
    const errors: string[] = [];
    const idxOf = (target: string) => {
      const h = mapping[target]; if (!h) return -1;
      return headers.indexOf(h);
    };
    const tsBase = Date.now();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const get = (k: string) => { const ix = idxOf(k); return ix >= 0 ? r[ix]?.trim() : undefined; };
      const cpf = (get("cpf") ?? "").replace(/\D/g, "");
      const full_name = get("full_name") ?? "";
      if (!cpf || !full_name) { fail++; errors.push(`Linha ${i + 2}: CPF ou nome ausente`); }
      else {
        const matricula = get("matricula") || `IMP${tsBase}${String(i).padStart(4, "0")}`;
        const payload = {
          tenant_id: tenant.id,
          status: "pendente" as const,
          full_name, cpf, matricula,
          email: get("email") || null,
          phone: get("phone") || null,
          rg: get("rg") || null,
          birth_date: get("birth_date") || null,
          profession: get("profession") || null,
          address_street: get("address_street") || null,
          address_number: get("address_number") || null,
          address_city: get("address_city") || null,
          address_state: get("address_state") || null,
          address_zip: get("address_zip") || null,
        };
        const { error } = await supabase.from("afiliados").insert(payload);
        if (error) { fail++; errors.push(`Linha ${i + 2}: ${error.message}`); }
        else ok++;
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }
    setResult({ ok, fail, errors: errors.slice(0, 20) });
  };

  return (
    <AdminShell title="Importar CSV">
      <div className="mx-auto max-w-4xl space-y-6">
        <Steps current={step} />

        {step === 1 && (
          <Card className="shadow-card">
            <CardHeader><CardTitle>1. Selecione o arquivo CSV</CardTitle></CardHeader>
            <CardContent>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30 p-12 text-center hover:bg-muted/50">
                <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Clique para selecionar um arquivo .csv</span>
                <span className="mt-1 text-xs text-muted-foreground">Use vírgula como separador. A primeira linha deve conter os títulos das colunas.</span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>2. Mapeie as colunas</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{rows.length} linhas detectadas em {headers.length} colunas.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {TARGET_FIELDS.map((t) => (
                <div key={t.key} className="grid grid-cols-2 items-center gap-3">
                  <Label className="text-sm">{t.label}</Label>
                  <Select value={mapping[t.key] ?? "__none"} onValueChange={(v) => setMapping((m) => ({ ...m, [t.key]: v === "__none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="— Ignorar —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Ignorar —</SelectItem>
                      {headers.map((h) => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
                <Button
                  disabled={!mapping.full_name || !mapping.cpf}
                  onClick={() => setStep(3)}
                >Pré-visualizar <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>3. Pré-visualização (5 primeiras linhas)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60">
                    <tr>{TARGET_FIELDS.filter((t) => mapping[t.key]).map((t) => (
                      <th key={t.key} className="px-3 py-2 text-left font-medium">{t.label.replace(" *", "")}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        {TARGET_FIELDS.filter((t) => mapping[t.key]).map((t) => (
                          <td key={t.key} className="px-3 py-2">{r[headers.indexOf(mapping[t.key])] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button>
                <Button onClick={runImport}>Importar {rows.length} afiliados</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="shadow-card">
            <CardHeader><CardTitle>4. Importando…</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} />
              <p className="text-center text-sm text-muted-foreground">{progress}%</p>
              {result && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-success/30 bg-success/10 p-4 text-center">
                      <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
                      <p className="mt-2 text-2xl font-semibold">{result.ok}</p>
                      <p className="text-xs text-muted-foreground">Importados com sucesso</p>
                    </div>
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-center">
                      <XCircle className="mx-auto h-6 w-6 text-destructive" />
                      <p className="mt-2 text-2xl font-semibold">{result.fail}</p>
                      <p className="text-xs text-muted-foreground">Falharam</p>
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                      <p className="mb-2 font-medium">Erros (primeiros 20):</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {result.errors.map((e, i) => (<li key={i}>• {e}</li>))}
                      </ul>
                    </div>
                  )}
                  <Button onClick={() => { setStep(1); setResult(null); setRows([]); setHeaders([]); setMapping({}); setProgress(0); }} className="w-full">
                    Nova importação
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card border-dashed">
          <CardContent className="flex items-start gap-3 pt-6 text-sm text-muted-foreground">
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Modelo sugerido de cabeçalho: <code className="text-foreground">full_name,cpf,matricula,email,phone,birth_date,profession,address_street,address_number,address_city,address_state,address_zip</code></p>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function Steps({ current }: { current: Step }) {
  const labels = ["Upload", "Mapeamento", "Pré-visualização", "Importação"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const n = (i + 1) as Step;
        const done = n < current; const active = n === current;
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
              done ? "bg-success text-success-foreground border-success"
              : active ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-muted-foreground border-border"
            }`}>{n}</div>
            <span className={`text-xs ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{l}</span>
            {i < labels.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
