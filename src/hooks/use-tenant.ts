import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
}

/**
 * Loads the current user's tenant (single tenant per user in v1) and
 * applies its brand colors to the document root as CSS variables.
 */
export function useTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user.id).maybeSingle();
      if (!p?.tenant_id) {
        // fallback to demo so the UI never breaks
        const { data: demo } = await supabase.from("tenants").select("id,name,slug,logo_url,primary_color,accent_color").eq("slug", "demo").maybeSingle();
        if (!cancelled) { setTenant((demo as Tenant) ?? null); setLoading(false); }
        return;
      }
      const { data: t } = await supabase
        .from("tenants")
        .select("id,name,slug,logo_url,primary_color,accent_color")
        .eq("id", p.tenant_id)
        .maybeSingle();
      if (!cancelled) { setTenant((t as Tenant) ?? null); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return { tenant, loading };
}
