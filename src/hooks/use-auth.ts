import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "staff" | "afiliado";

export interface AuthProfile {
  id: string;
  tenant_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  roles: AppRole[];
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async (uid: string) => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id, tenant_id, full_name, email, avatar_url").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      if (cancelled) return;
      setProfile((p as AuthProfile) ?? null);
      setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => !cancelled && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    user: session?.user ?? null,
    session,
    profile,
    roles,
    loading,
    isSuperAdmin: roles.includes("super_admin"),
    isAdmin: roles.includes("admin"),
    isStaff: roles.includes("staff") || roles.includes("admin"),
  };
}
