# SmartReminderAI

Aplicação de lembretes com notificações via PWA, reconstruída com **Next.js App Router**, React, TypeScript, Tailwind CSS e Supabase.

## Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Banco de dados:** Supabase (PostgreSQL + Realtime)
- **Notificações:** Web Push via Service Worker
- **ORM / migrations:** Prisma

## Setup

```bash
npm install
cp .env.example .env.local
# preencha as variáveis públicas do Supabase
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública/anon do Supabase |
| `DATABASE_URL` | Connection string pooled (runtime) |
| `DIRECT_URL` | Connection string direta (migrations) |

O fluxo atual usa cadastro e login por e-mail/senha. No Supabase, habilite o provedor **Email** e execute a migration `supabase/migrations/20260915120000_auth_rls.sql` no SQL Editor. Para desenvolvimento local, a confirmação de e-mail pode ser desativada em Authentication → Providers → Email; em produção, configure SMTP e mantenha a confirmação ativada.

Após executar a migration, cada usuário autenticado pode abrir **Perfil** no cabeçalho para editar nome, telefone, data de nascimento e biografia, enviar uma foto de perfil para o bucket `avatars` e alterar a senha. Os dados pessoais são opcionais.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```
