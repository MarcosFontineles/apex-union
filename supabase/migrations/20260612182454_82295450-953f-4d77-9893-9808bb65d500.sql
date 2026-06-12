
-- ========================
-- PROCESSOS JURÍDICOS
-- ========================
CREATE TYPE public.processo_status AS ENUM ('aberto','em_andamento','suspenso','encerrado','arquivado');
CREATE TYPE public.processo_tipo AS ENUM ('trabalhista','civel','previdenciario','tributario','administrativo','outro');

CREATE TABLE public.processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  afiliado_id uuid REFERENCES public.afiliados(id) ON DELETE SET NULL,
  numero_processo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  tipo processo_tipo NOT NULL DEFAULT 'trabalhista',
  status processo_status NOT NULL DEFAULT 'aberto',
  vara text,
  comarca text,
  uf text,
  advogado_responsavel text,
  valor_causa numeric(14,2),
  data_distribuicao date,
  proxima_audiencia timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_processos_tenant ON public.processos(tenant_id);
CREATE INDEX idx_processos_afiliado ON public.processos(afiliado_id);
CREATE INDEX idx_processos_status ON public.processos(tenant_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processos TO authenticated;
GRANT ALL ON public.processos TO service_role;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin manage processos" ON public.processos
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "tenant staff manage processos" ON public.processos
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "afiliado read own processos" ON public.processos
  FOR SELECT TO authenticated
  USING (
    afiliado_id IN (
      SELECT a.id FROM public.afiliados a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.tenant_id = p.tenant_id AND a.email = p.email
    )
  );

CREATE TRIGGER trg_processos_updated BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========================
-- ANDAMENTOS DO PROCESSO
-- ========================
CREATE TABLE public.processo_andamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  data_andamento timestamptz NOT NULL DEFAULT now(),
  descricao text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_andamentos_processo ON public.processo_andamentos(processo_id, data_andamento DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_andamentos TO authenticated;
GRANT ALL ON public.processo_andamentos TO service_role;
ALTER TABLE public.processo_andamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage andamentos" ON public.processo_andamentos
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "afiliado read own andamentos" ON public.processo_andamentos
  FOR SELECT TO authenticated
  USING (
    processo_id IN (
      SELECT pr.id FROM public.processos pr
      JOIN public.afiliados a ON a.id = pr.afiliado_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.tenant_id = p.tenant_id AND a.email = p.email
    )
  );

-- ========================
-- DOCUMENTOS (institucionais e por afiliado)
-- ========================
CREATE TYPE public.documento_categoria AS ENUM ('estatuto','ata','convencao','comunicado','contrato','outro');
CREATE TYPE public.documento_visibilidade AS ENUM ('publico','afiliados','staff');

CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  afiliado_id uuid REFERENCES public.afiliados(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  categoria documento_categoria NOT NULL DEFAULT 'outro',
  visibilidade documento_visibilidade NOT NULL DEFAULT 'staff',
  storage_bucket text NOT NULL DEFAULT 'afiliado-documentos',
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documentos_tenant ON public.documentos(tenant_id);
CREATE INDEX idx_documentos_afiliado ON public.documentos(afiliado_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage documentos" ON public.documentos
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "afiliado read tenant documentos" ON public.documentos
  FOR SELECT TO authenticated
  USING (
    visibilidade IN ('publico','afiliados')
    AND tenant_id = public.current_tenant_id()
    AND (afiliado_id IS NULL OR afiliado_id IN (
      SELECT a.id FROM public.afiliados a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.tenant_id = p.tenant_id AND a.email = p.email
    ))
  );

CREATE TRIGGER trg_documentos_updated BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========================
-- RPC: atualizar branding do tenant (admin do tenant)
-- ========================
CREATE OR REPLACE FUNCTION public.update_tenant_branding(
  _tenant_id uuid,
  _name text,
  _logo_url text,
  _primary_color text,
  _accent_color text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), _tenant_id)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.tenants
     SET name = COALESCE(_name, name),
         logo_url = _logo_url,
         primary_color = COALESCE(_primary_color, primary_color),
         accent_color = COALESCE(_accent_color, accent_color),
         updated_at = now()
   WHERE id = _tenant_id;
END; $$;

-- ========================
-- Storage policies para tenant-assets (logos do tenant)
-- ========================
CREATE POLICY "tenant-assets read auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'tenant-assets');

CREATE POLICY "tenant-assets insert staff" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (public.is_super_admin(auth.uid())
         OR public.is_tenant_admin(auth.uid(), (split_part(name, '/', 1))::uuid))
  );

CREATE POLICY "tenant-assets update staff" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-assets'
    AND (public.is_super_admin(auth.uid())
         OR public.is_tenant_admin(auth.uid(), (split_part(name, '/', 1))::uuid))
  );

CREATE POLICY "tenant-assets delete staff" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-assets'
    AND (public.is_super_admin(auth.uid())
         OR public.is_tenant_admin(auth.uid(), (split_part(name, '/', 1))::uuid))
  );

CREATE POLICY "afiliado-documentos read staff" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'afiliado-documentos'
    AND (public.is_super_admin(auth.uid())
         OR public.is_tenant_admin(auth.uid(), (split_part(name, '/', 1))::uuid))
  );

CREATE POLICY "afiliado-documentos write staff" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'afiliado-documentos'
    AND (public.is_super_admin(auth.uid())
         OR public.is_tenant_admin(auth.uid(), (split_part(name, '/', 1))::uuid))
  );

CREATE POLICY "afiliado-documentos delete staff" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'afiliado-documentos'
    AND (public.is_super_admin(auth.uid())
         OR public.is_tenant_admin(auth.uid(), (split_part(name, '/', 1))::uuid))
  );
