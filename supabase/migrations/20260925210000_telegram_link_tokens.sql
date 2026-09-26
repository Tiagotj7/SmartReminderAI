-- Start Reminders: vinculação automática de Telegram por link temporário.
-- Execute depois de 20260923193000_telegram_safe_channels.sql.

begin;

create table if not exists public.telegram_link_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_tokens_user_created_idx
  on public.telegram_link_tokens (user_id, created_at desc);

create index if not exists telegram_link_tokens_pending_idx
  on public.telegram_link_tokens (expires_at)
  where used_at is null;

alter table public.telegram_link_tokens enable row level security;

drop policy if exists "Usuário cria seu token Telegram" on public.telegram_link_tokens;
create policy "Usuário cria seu token Telegram"
on public.telegram_link_tokens for insert to authenticated
with check (user_id = auth.uid()::text);

drop policy if exists "Usuário lê seus tokens Telegram" on public.telegram_link_tokens;
create policy "Usuário lê seus tokens Telegram"
on public.telegram_link_tokens for select to authenticated
using (user_id = auth.uid()::text);

notify pgrst, 'reload schema';

commit;
