# Arena Beach Serra

Plataforma premium para reserva de quadras de beach sports e eventos exclusivos em Serra/ES.

## Funcionalidades

- Reserva de quadras de vôlei de praia, futevôlei e beach tennis
- Espaços exclusivos para eventos corporativos e aniversários
- Pagamento via Pix ou cartão de crédito (MercadoPago)
- Painel administrativo com dashboard, financeiro, relatórios e gestão de horários
- Notificações ao vivo no painel admin

## Tecnologias

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Prisma ORM** + **PostgreSQL** (Neon)
- **NextAuth v5** (autenticação JWT, CredentialsProvider)
- **MercadoPago** (PIX e cartão)
- **TanStack Query** (data fetching no client)
- **Pusher** / **Socket.io** (notificações em tempo real)
- **Vercel Blob** (armazenamento de arquivos)
- **Vitest** (testes)
- Deploy na **Vercel**

## Como executar

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.local.example .env.local
# preencha: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET,
#   MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_PUBLIC_KEY,
#   NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY, MERCADOPAGO_WEBHOOK_SECRET,
#   NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_WHATSAPP_NUMBER
# (em produção: também DIRECT_URL e BLOB_READ_WRITE_TOKEN)

# Gerar o Prisma Client e aplicar o schema
npm run db:generate
npm run db:migrate

# (opcional) popular o banco
npm run db:seed

# Iniciar desenvolvimento
npm run dev
```

A aplicação será iniciada em `http://localhost:3000`.

## Scripts principais

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (custom server com Socket.io via `tsx server.ts`) |
| `npm run build` | `prisma generate && next build` |
| `npm start` | Servidor de produção |
| `npm test` | Executa os testes (Vitest) |
| `npm run lint` | Lint com ESLint |
| `npm run db:migrate` | Cria/aplica migrations em desenvolvimento |
| `npm run db:migrate:deploy` | Aplica migrations em produção |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run db:seed` | Popula o banco com dados iniciais |

## Estrutura do projeto

```
src/
├── app/                  # App Router (Next.js)
│   ├── (client)/         # Rotas do cliente: /, /booking, /payment, /bookings, /profile
│   ├── (admin)/          # Painel admin (sidebar/topbar): dashboard, bookings, courts,
│   │                     #   clients, financeiro, horarios, reports, settings
│   ├── (admin-auth)/     # Login admin (sem layout admin)
│   ├── api/              # Rotas de API (stats, courts, financeiro, clients, webhook)
│   ├── login/            # Login do cliente
│   ├── cadastro/         # Cadastro de cliente
│   ├── auth.ts           # NextAuth (Node.js — Prisma + bcrypt)
│   ├── auth.config.ts    # Config Edge-safe (usado no middleware)
│   └── middleware.ts
├── core/                 # Constantes, erros e utilitários
├── infrastructure/       # Database e repositories
├── models/entities/      # Entidades de domínio
├── repositories/         # Repositórios de dados
├── services/             # Serviços (MercadoPago, etc.)
├── usecases/             # Casos de uso (bookings, payments)
├── viewmodels/           # Lógica de apresentação (admin/client)
├── views/                # Componentes e providers de UI
├── types/                # Tipos compartilhados (ex.: payment-enums)
└── __tests__/            # Testes
```

## Deploy

O projeto está vinculado ao projeto **`arenabeachserra`** na Vercel.

```bash
# Deploy de produção via CLI
npx vercel --prod
```

Ou via Git: um `push` para `main` dispara o deploy de produção (quando o repositório
está conectado ao projeto na Vercel).

Domínio de produção: **https://arenabeachserra.com.br**

## Licença

MIT
