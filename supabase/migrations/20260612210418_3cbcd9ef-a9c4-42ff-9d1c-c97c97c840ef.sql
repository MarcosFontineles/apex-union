
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS next_matricula integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.next_matricula(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n int; _prefix text;
BEGIN
  UPDATE public.tenants
     SET next_matricula = next_matricula + 1
   WHERE id = _tenant_id
   RETURNING next_matricula - 1 INTO _n;
  IF _n IS NULL THEN RAISE EXCEPTION 'Tenant not found'; END IF;
  SELECT COALESCE(UPPER(LEFT(regexp_replace(slug,'[^a-zA-Z0-9]','','g'),3)), 'M')
    INTO _prefix FROM public.tenants WHERE id = _tenant_id;
  RETURN _prefix || lpad(_n::text, 6, '0');
END; $$;

GRANT EXECUTE ON FUNCTION public.next_matricula(uuid) TO anon, authenticated, service_role;
