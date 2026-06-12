-- Caixa (livro caixa) — movimentações financeiras
CREATE TYPE public.caixa_kind AS ENUM ('entrada', 'saida');

CREATE TABLE public.caixa_movimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind public.caixa_kind NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  payment_method TEXT,
  description TEXT,
  mensalidade_id UUID REFERENCES public.mensalidades(id) ON DELETE SET NULL,
  afiliado_id UUID REFERENCES public.afiliados(id) ON DELETE SET NULL,
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX caixa_mov_tenant_date_idx ON public.caixa_movimentos (tenant_id, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixa_movimentos TO authenticated;
GRANT ALL ON public.caixa_movimentos TO service_role;

ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant admins manage caixa"
  ON public.caixa_movimentos
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

CREATE TRIGGER set_updated_at_caixa
  BEFORE UPDATE ON public.caixa_movimentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();