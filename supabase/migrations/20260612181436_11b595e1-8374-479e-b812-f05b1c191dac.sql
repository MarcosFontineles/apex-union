
-- ============================================================
-- Mensalidades (financial module)
-- ============================================================
CREATE TYPE public.mensalidade_status AS ENUM ('pendente','pago','atrasado','isento','cancelado');

CREATE TABLE public.mensalidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  afiliado_id uuid NOT NULL REFERENCES public.afiliados(id) ON DELETE CASCADE,
  competencia date NOT NULL, -- always day=01
  due_date date NOT NULL,
  valor numeric(10,2) NOT NULL CHECK (valor >= 0),
  status public.mensalidade_status NOT NULL DEFAULT 'pendente',
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (afiliado_id, competencia)
);

CREATE INDEX idx_mensalidades_tenant ON public.mensalidades(tenant_id, competencia DESC);
CREATE INDEX idx_mensalidades_afiliado ON public.mensalidades(afiliado_id, competencia DESC);
CREATE INDEX idx_mensalidades_status ON public.mensalidades(tenant_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensalidades TO authenticated;
GRANT ALL ON public.mensalidades TO service_role;

ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff manage mensalidades" ON public.mensalidades
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Afiliado reads own mensalidades" ON public.mensalidades
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.afiliados a WHERE a.id = afiliado_id AND a.user_id = auth.uid()));

CREATE TRIGGER trg_mensalidades_updated
  BEFORE UPDATE ON public.mensalidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Bootstrap super admin (zero-state recovery)
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_super_admin()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    RAISE EXCEPTION 'Super admin already exists';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'super_admin')
    ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'user_id', _uid);
END; $$;

REVOKE ALL ON FUNCTION public.claim_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_super_admin() TO authenticated;

-- ============================================================
-- Super-admin creates a tenant and assigns an admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_tenant_as_super_admin(
  _name text, _slug text, _admin_user_id uuid DEFAULT NULL,
  _primary_color text DEFAULT '#1E40AF', _accent_color text DEFAULT '#3B82F6'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant_id uuid; _uid uuid := auth.uid();
BEGIN
  IF NOT public.is_super_admin(_uid) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.tenants (name, slug, primary_color, accent_color, status)
    VALUES (_name, _slug, _primary_color, _accent_color, 'ativo')
    RETURNING id INTO _tenant_id;
  IF _admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (_admin_user_id, 'admin', _tenant_id)
      ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET tenant_id = _tenant_id WHERE id = _admin_user_id AND tenant_id IS NULL;
  END IF;
  RETURN _tenant_id;
END; $$;

REVOKE ALL ON FUNCTION public.create_tenant_as_super_admin(text,text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_as_super_admin(text,text,uuid,text,text) TO authenticated;

-- ============================================================
-- Generate mensalidades in batch for a competencia
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_mensalidades_lote(
  _tenant_id uuid, _competencia date, _valor numeric, _due_day int DEFAULT 10
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count int; _comp date := date_trunc('month', _competencia)::date;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), _tenant_id)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.mensalidades (tenant_id, afiliado_id, competencia, due_date, valor, status)
  SELECT _tenant_id, a.id, _comp, (_comp + (_due_day - 1)) , _valor, 'pendente'
  FROM public.afiliados a
  WHERE a.tenant_id = _tenant_id AND a.status = 'ativo'
    AND NOT EXISTS (SELECT 1 FROM public.mensalidades m WHERE m.afiliado_id = a.id AND m.competencia = _comp);
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END; $$;

REVOKE ALL ON FUNCTION public.generate_mensalidades_lote(uuid,date,numeric,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_mensalidades_lote(uuid,date,numeric,int) TO authenticated;

-- ============================================================
-- Storage policies for afiliados to upload their OWN photo
-- ============================================================
CREATE POLICY "Afiliado uploads own photo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'afiliado-fotos'
    AND EXISTS (
      SELECT 1 FROM public.afiliados a
      WHERE a.user_id = auth.uid()
        AND a.tenant_id = (storage.foldername(name))[1]::uuid
        AND a.id = (storage.foldername(name))[2]::uuid
    )
  );

CREATE POLICY "Afiliado updates own photo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'afiliado-fotos'
    AND EXISTS (
      SELECT 1 FROM public.afiliados a
      WHERE a.user_id = auth.uid()
        AND a.tenant_id = (storage.foldername(name))[1]::uuid
        AND a.id = (storage.foldername(name))[2]::uuid
    )
  );

CREATE POLICY "Afiliado reads own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('afiliado-fotos','afiliado-documentos')
    AND EXISTS (
      SELECT 1 FROM public.afiliados a
      WHERE a.user_id = auth.uid()
        AND a.tenant_id = (storage.foldername(name))[1]::uuid
        AND a.id = (storage.foldername(name))[2]::uuid
    )
  );
