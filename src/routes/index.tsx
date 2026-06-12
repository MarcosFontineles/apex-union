import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Shield, Users, Wallet, FileSignature, QrCode, BarChart3, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UnionSaaS — Plataforma white-label de gestão sindical" },
      { name: "description", content: "Sistema completo para sindicatos, associações e colônias de pescadores. Cadastro de afiliados, carteirinha digital, jurídico, financeiro e LGPD em uma única plataforma multi-tenant." },
      { property: "og:title", content: "UnionSaaS — Gestão Sindical White Label" },
      { property: "og:description", content: "Carteirinha digital, auto-cadastro, financeiro e jurídico para sindicatos modernos." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight">UnionSaaS</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#modulos" className="hover:text-foreground transition-colors">Módulos</a>
            <a href="#seguranca" className="hover:text-foreground transition-colors">Segurança</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/cadastro/$slug" params={{ slug: "demo" }}>
              <Button size="sm" variant="default">Filiar-se</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.18) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Plataforma SaaS Multi-tenant • LGPD-ready
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              A nova geração da gestão sindical e associativa
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/80">
              Modernize seu sindicato, associação ou colônia de pescadores. Auto-cadastro de afiliados,
              carteirinha digital com QR Code, jurídico, financeiro e secretaria — tudo em uma plataforma
              white-label, segura e responsiva.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/cadastro/$slug" params={{ slug: "demo" }}>
                <Button size="lg" variant="secondary" className="font-semibold">
                  Experimentar auto-cadastro
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                  Acesso administrativo
                </Button>
              </Link>
            </div>
            <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3">
              {[
                ["Isolamento", "Multi-tenant por design"],
                ["LGPD", "Auditoria e consentimento"],
                ["Mobile-first", "Portal do afiliado"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-2xl font-semibold tracking-tight">{k}</dt>
                  <dd className="mt-1 text-sm text-primary-foreground/70">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modulos" className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-glow">Módulos</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Tudo que sua instituição precisa para operar
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Users, title: "Cadastro de Afiliados", desc: "Sócios, dependentes, documentos digitalizados, assinatura por canvas e fluxo de aprovação." },
            { icon: QrCode, title: "Carteirinha Digital", desc: "Frente e verso, foto, QR Code dinâmico e link público de verificação em tempo real." },
            { icon: Wallet, title: "Financeiro", desc: "Mensalidades, carnês, boleto, PIX e histórico completo de pagamentos do associado." },
            { icon: FileSignature, title: "Jurídico", desc: "Processos, prazos, aposentadorias e movimentações com acesso restrito ao afiliado." },
            { icon: BarChart3, title: "Secretaria", desc: "Assembleias, atas digitais, protocolos numerados e geração automática de declarações." },
            { icon: Shield, title: "LGPD & Auditoria", desc: "Consentimento registrado, criptografia de campos sensíveis e log de quem acessou o quê." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-xl border border-border bg-card p-6 shadow-card transition hover:shadow-elev">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground transition group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="seguranca" className="border-t border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">Pronto para começar?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore o sindicato de demonstração ou solicite acesso administrativo.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/cadastro/$slug" params={{ slug: "demo" }}>
              <Button size="lg">Auto-cadastro demo</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">Entrar</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} UnionSaaS — White-label para sindicatos e associações.</span>
          <span>LGPD • Marco Civil • Multi-tenant</span>
        </div>
      </footer>
    </div>
  );
}
