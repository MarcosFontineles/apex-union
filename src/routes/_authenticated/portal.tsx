import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { CreditCard, Wallet, Gavel, LogOut, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalLayout,
});

const TABS = [
  { to: "/portal", label: "Início", icon: Home, exact: true },
  { to: "/portal/carteirinha", label: "Carteirinha", icon: CreditCard, exact: false },
  { to: "/portal/financeiro", label: "Financeiro", icon: Wallet, exact: false },
  { to: "/portal/juridico", label: "Jurídico", icon: Gavel, exact: false },
];

function PortalLayout() {
  const { profile } = useAuth();
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
    <div className="min-h-screen bg-secondary/40 pb-20">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-2xl px-5 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary-foreground/60">Portal do Afiliado</p>
            <p className="mt-1 text-lg font-semibold">{profile?.full_name ?? "Bem-vindo"}</p>
          </div>
          <button onClick={signOut} className="rounded-full p-2 bg-primary-foreground/10 hover:bg-primary-foreground/20" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {TABS.map((t) => {
            const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to as never}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
