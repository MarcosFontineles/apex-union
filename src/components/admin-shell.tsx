import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Building2, LayoutDashboard, Users, Settings, LogOut, FileText, Wallet, Gavel, Upload, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; superOnly?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/afiliados", label: "Afiliados", icon: Users },
  { to: "/admin/importar", label: "Importar CSV", icon: Upload, exact: false },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet, exact: false },
  { to: "/admin/juridico", label: "Jurídico", icon: Gavel, exact: false },
  { to: "/admin/documentos", label: "Documentos", icon: FileText, exact: false },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings, exact: false },
  { to: "/admin/tenants", label: "Sindicatos", icon: Shield, exact: false, superOnly: true },
];

export function AdminShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const { profile, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[260px_1fr] bg-secondary/40">
      <aside className="hidden md:flex flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary">
            <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">UnionSaaS</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.filter((i) => !i.superOnly || isSuperAdmin).map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as never}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                {initials(profile?.full_name ?? profile?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.full_name ?? "Usuário"}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{profile?.email}</p>
            </div>
            <button onClick={signOut} className="rounded p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" title="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-col min-h-0">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </header>
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
