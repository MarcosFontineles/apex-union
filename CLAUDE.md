# Guia de Exportação — Continuação no Claude

> Projeto: **UnionSaaS** — Sistema de gestão de sindicatos/associações  
> Stack: TanStack Start v1 + React 19 + Supabase + Tailwind CSS v4

---

## 1. Como obter o código

Este projeto já está versionado no Git. Você tem duas opções:

### Opção A: Conectar ao GitHub (recomendado)
1. No editor da Lovable, clique no menu **+ (Plus)** → **GitHub** → **Connect project**
2. Autorize o app da Lovable no GitHub
3. Selecione a conta/organização e crie o repositório
4. Após a sincronização, clone o repo no seu ambiente local:
   ```bash
   git clone https://github.com/<usuario>/<repo>.git
   cd <repo>
   ```

### Opção B: Download direto (apenas código, sem histórico Git)
- No editor da Lovable: **Code Editor** → **Download codebase** (plano pago, desktop)
- Ou exporte os dados do banco em: **Cloud → Database → Tables** (CSV)

---

## 2. Variáveis de ambiente

Copie `.env` para `.env.local` e confirme as seguintes variáveis:

```bash
# Supabase — obrigatórias
SUPABASE_PROJECT_ID="..."
SUPABASE_PUBLISHABLE_KEY="..."
SUPABASE_URL="https://....supabase.co"
VITE_SUPABASE_PROJECT_ID="..."
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_URL="https://....supabase.co"
```

> ⚠️ **Chave de serviço**: o `SUPABASE_SERVICE_ROLE_KEY` **não está disponível** na Lovable Cloud. Se precisar de operações admin (ex: edge functions, seeds), você precisará de acesso ao projeto Supabase diretamente.

---

## 3. Comandos para rodar localmente

```bash
# Instalar dependências (o projeto usa bun, mas npm funciona)
bun install

# Servidor de desenvolvimento
bun dev
# ou: npm run dev

# Build de produção
bun run build

# Preview do build
bun run preview
```

---

## 4. Arquitetura do projeto

### Stack principal
- **Framework**: TanStack Start v1 (full-stack React, SSR/SSG)
- **Build tool**: Vite 7
- **Router**: TanStack Router (file-based routing em `src/routes/`)
- **Query**: TanStack React Query
- **Backend**: Supabase (Postgres + Auth + Storage)
- **Styling**: Tailwind CSS v4 com tokens via CSS variables (oklch)
- **Server functions**: `createServerFn` do `@tanstack/react-start`
- **UI components**: shadcn/ui (Radix + Tailwind)

### Estrutura de rotas (`src/routes/`)
```
index.tsx                  → Landing page
auth.tsx                   → Tela de login/cadastro
cadastro.$slug.tsx        → Auto-cadastro público (por tenant)
verificar.$id.tsx         → Verificação de cadastro

_authenticated/
  route.tsx                → Layout protegido (middleware de auth)
  admin.tsx                → Dashboard admin
  admin.afiliados.tsx      → CRUD de afiliados + formulário inline
  admin.afiliados.$id.tsx  → Ficha do afiliado
  admin.financeiro.tsx     → Mensalidades, parcelas, pagamentos
  admin.juridico.tsx       → Casos jurídicos
  admin.juridico.$id.tsx   → Detalhe do caso
  admin.documentos.tsx      → Documentos
  admin.configuracoes.tsx  → Config + Importação CSV
  admin.importar.tsx       → Importação em lote (também acessível via Config)
  admin.tenants.tsx        → Gestão de tenants
  portal.tsx               → Layout do portal do associado
  portal.index.tsx         → Dashboard do associado
  portal.carteirinha.tsx   → Carteirinha digital
  portal.financeiro.tsx    → Financeiro do associado
  portal.juridico.tsx      → Jurídico do associado
```

### Database (`supabase/migrations/`)
- `tenants` — multi-tenancy (slug, nome, cor, logo, next_matricula)
- `afiliados` — associados/afiliados (matrícula auto-incrementada por tenant)
- `mensalidades` — cobranças/parcelas com status e método de pagamento
- `juridico_casos` — casos jurídicos
- `user_roles` — papéis de usuário (admin, moderator, user)
- Função `next_matricula(tenant_id)` — gera matrícula sequencial atomicamente

---

## 5. Regras importantes para continuação

### Design System
- **Nunca** use cores hardcoded como `text-white`, `bg-black`, `bg-[#...]`
- Use sempre os tokens CSS: `bg-primary`, `text-muted-foreground`, `border-border`, etc.
- O tema é **institucional azul/cinza** — oklch com primária azul-profundo

### Server Functions
- Use `createServerFn` do `@tanstack/react-start` (nunca do `@tanstack/start`)
- Funções protegidas usam `.middleware([requireSupabaseAuth])`
- **Nunca** chame funções protegidas em `loader` de rotas públicas — use `useServerFn` + `useQuery` no componente
- `supabaseAdmin` só dentro de handlers `.server.ts`

### Multi-tenancy
- A maioria das tabelas tem `tenant_id`
- Matrículas são geradas via `next_matricula()` — prefixo baseado no slug do tenant + 6 dígitos

### Pagamentos (Financeiro)
- Métodos suportados: `dinheiro`, `pix`, `boleto`, `debito`, `credito`
- Parcelamento: 1–36 meses via `parcelas` no cadastro de cobrança
- Status: `pendente`, `pago`, `atrasado`, `cancelado`

---

## 6. Dados que você precisa recriar

Se estiver migrando para outro Supabase:
1. Aplique todas as migrations em `supabase/migrations/`
2. Configure Auth (Google OAuth recomendado)
3. Ative RLS em todas as tabelas públicas
4. Crie um tenant inicial em `tenants`
5. Crie seu usuário admin e atribua a role `admin` em `user_roles`

---

## 7. O que foi implementado até aqui

- ✅ Sistema multi-tenant com auto-cadastro público por slug
- ✅ CRUD de afiliados com matrícula auto-incrementada
- ✅ Módulo financeiro com mensalidades, parcelas e múltiplos métodos de pagamento
- ✅ Portal do associado (carteirinha, financeiro, jurídico)
- ✅ Módulo jurídico com casos e documentos
- ✅ Importação em lote via CSV
- ✅ Autenticação com Supabase Auth
- ✅ Design system institucional com Tailwind v4

---

Pronto para continuar! 🚀
