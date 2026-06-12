import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Afiliado = { id: string; matricula: string; full_name: string };

type Props = {
  tenantId?: string;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function AfiliadoPicker({
  tenantId, value, onChange, placeholder = "Selecionar afiliado…", disabled, className,
}: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: afiliados } = useQuery({
    queryKey: ["afiliado-picker", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("afiliados")
        .select("id, matricula, full_name")
        .eq("tenant_id", tenantId!)
        .order("full_name", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Afiliado[];
    },
  });

  const selected = useMemo(
    () => afiliados?.find((a) => a.id === value),
    [afiliados, value],
  );

  const emptyForm = { full_name: "", cpf: "", phone: "", email: "" };
  const [form, setForm] = useState(emptyForm);
  const setF = <K extends keyof typeof emptyForm>(k: K, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Sindicato não selecionado");
      if (!form.full_name.trim() || !form.cpf.replace(/\D/g, "")) {
        throw new Error("Nome e CPF são obrigatórios");
      }
      const { data: mat, error: mErr } = await supabase.rpc("next_matricula", { _tenant_id: tenantId });
      if (mErr) throw mErr;
      const { data, error } = await supabase
        .from("afiliados")
        .insert({
          tenant_id: tenantId,
          matricula: mat as string,
          full_name: form.full_name.trim(),
          cpf: form.cpf.replace(/\D/g, ""),
          phone: form.phone.replace(/\D/g, "") || null,
          email: form.email || null,
          status: "ativo",
          joined_at: new Date().toISOString().slice(0, 10),
          consent_lgpd: true,
          consent_lgpd_at: new Date().toISOString(),
        })
        .select("id, matricula, full_name")
        .single();
      if (error) throw error;
      return data as Afiliado;
    },
    onSuccess: (a) => {
      toast.success(`Afiliado criado — ${a.matricula}`);
      setForm(emptyForm);
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["afiliado-picker"] });
      qc.invalidateQueries({ queryKey: ["afiliados"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      onChange(a.id);
    },
    onError: (e) => {
      const m = e instanceof Error ? e.message : "Erro ao criar";
      toast.error(m.includes("duplicate") ? "Já existe um afiliado com esse CPF." : m);
    },
  });

  const openCreate = () => {
    setOpen(false);
    setForm((s) => ({ ...s, full_name: search.trim() && !/^\d/.test(search) ? search.trim() : s.full_name }));
    setCreateOpen(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled || !tenantId}
            className={cn("w-full justify-between font-normal", className)}
          >
            <span className="truncate">
              {selected ? (
                <>
                  <span className="font-mono text-xs text-muted-foreground mr-2">{selected.matricula}</span>
                  {selected.full_name}
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar por nome ou matrícula…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  Nenhum afiliado encontrado.
                </div>
              </CommandEmpty>
              {!!afiliados?.length && (
                <CommandGroup heading="Afiliados">
                  {afiliados.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={`${a.matricula} ${a.full_name}`}
                      onSelect={() => { onChange(a.id); setOpen(false); }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === a.id ? "opacity-100" : "opacity-0")} />
                      <span className="font-mono text-xs text-muted-foreground mr-2">{a.matricula}</span>
                      {a.full_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={openCreate} className="text-primary">
                  <UserPlus className="mr-2 h-4 w-4" />
                  + Criar novo afiliado
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setForm(emptyForm); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo afiliado</DialogTitle>
            <DialogDescription>
              Cadastro rápido. A matrícula é gerada automaticamente.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo*</Label>
              <Input required value={form.full_name} onChange={(e) => setF("full_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CPF*</Label>
              <Input required maxLength={14} value={formatCPF(form.cpf)} onChange={(e) => setF("cpf", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input value={formatPhone(form.phone)} onChange={(e) => setF("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar e selecionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
