
-- ========== ENUMS ==========
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'staff', 'afiliado');
CREATE TYPE public.afiliado_status AS ENUM ('pendente', 'ativo', 'inativo', 'suspenso');
CREATE TYPE public.tenant_status AS ENUM ('ativo', 'suspenso', 'cancelado');

-- ========== TENANTS ==========
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1E40AF',
  accent_color TEXT NOT NULL DEFAULT '#3B82F6',
  status public.tenant_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT ON public.tenants TO anon;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========== USER_ROLES ==========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, tenant_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========== SECURITY DEFINER HELPERS ==========
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','staff')
      AND tenant_id = _tenant_id
  );
$$;

-- ========== AFILIADOS ==========
CREATE TABLE public.afiliados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  matricula TEXT NOT NULL,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  rg TEXT,
  birth_date DATE,
  phone TEXT,
  email TEXT,
  address_street TEXT,
  address_number TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  photo_url TEXT,
  signature_url TEXT,
  profession TEXT,
  status public.afiliado_status NOT NULL DEFAULT 'pendente',
  consent_lgpd BOOLEAN NOT NULL DEFAULT false,
  consent_lgpd_at TIMESTAMPTZ,
  joined_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, matricula),
  UNIQUE (tenant_id, cpf)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.afiliados TO authenticated;
GRANT ALL ON public.afiliados TO service_role;
ALTER TABLE public.afiliados ENABLE ROW LEVEL SECURITY;

-- ========== DEPENDENTES ==========
CREATE TABLE public.dependentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id UUID NOT NULL REFERENCES public.afiliados(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  relation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependentes TO authenticated;
GRANT ALL ON public.dependentes TO service_role;
ALTER TABLE public.dependentes ENABLE ROW LEVEL SECURITY;

-- ========== AUDIT LOG ==========
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ========== RLS POLICIES ==========
-- tenants
CREATE POLICY "Anon can read active tenants by slug" ON public.tenants
  FOR SELECT TO anon USING (status = 'ativo');
CREATE POLICY "Auth can read own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin manages tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Tenant admin updates own tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), id));

-- profiles
CREATE POLICY "User reads own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "User updates own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Tenant admin reads tenant profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));

-- user_roles
CREATE POLICY "User reads own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admin manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Tenant admin reads tenant roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- afiliados
CREATE POLICY "Tenant staff manages afiliados" ON public.afiliados
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Afiliado reads own record" ON public.afiliados
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- dependentes
CREATE POLICY "Tenant staff manages dependentes" ON public.dependentes
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Afiliado reads own dependentes" ON public.dependentes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.afiliados a WHERE a.id = dependentes.afiliado_id AND a.user_id = auth.uid()));

-- audit_logs
CREATE POLICY "Tenant admin reads audit" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Authenticated inserts audit" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ========== TRIGGERS ==========
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_afiliados_updated BEFORE UPDATE ON public.afiliados FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== PUBLIC VERIFICATION (carteirinha) ==========
-- Returns limited safe data for QR code verification
CREATE OR REPLACE FUNCTION public.verify_carteirinha(_afiliado_id UUID)
RETURNS TABLE (
  id UUID,
  matricula TEXT,
  full_name TEXT,
  status public.afiliado_status,
  photo_url TEXT,
  tenant_name TEXT,
  tenant_logo TEXT,
  tenant_primary_color TEXT,
  joined_at DATE
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.matricula, a.full_name, a.status, a.photo_url,
         t.name, t.logo_url, t.primary_color, a.joined_at
  FROM public.afiliados a
  JOIN public.tenants t ON t.id = a.tenant_id
  WHERE a.id = _afiliado_id AND t.status = 'ativo';
$$;
GRANT EXECUTE ON FUNCTION public.verify_carteirinha(UUID) TO anon, authenticated;

-- ========== SEED DEMO TENANT ==========
INSERT INTO public.tenants (name, slug, primary_color, accent_color)
VALUES ('Sindicato Demo', 'demo', '#1E40AF', '#3B82F6');
