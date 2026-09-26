-- Start Reminders: base incremental para lembretes multicanal.
-- Execute depois de 20260915120000_auth_rls.sql.
-- O worker usa service_role; usuários comuns continuam protegidos por RLS.

begin;

create extension if not exists pgcrypto;

-- Telefone normalizado para integrações. O campo users.phone antigo continua
-- sendo preservado para compatibilidade com a interface atual.
alter table public.users
  add column if not exists phone_e164 text,
  add column if not exists phone_country_code text,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists phone_verified_at timestamptz;

create unique index if not exists users_phone_e164_unique
  on public.users (phone_e164)
  where phone_e164 is not null;

-- OTP: nunca armazena o código puro, somente hash SHA-256.
create table if not exists public.phone_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  phone_e164 text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  requested_ip inet,
  resend_after timestamptz not null default now(),
  locked_until timestamptz,
  constraint phone_otp_attempts_valid check (attempts >= 0 and attempts <= max_attempts)
);

create index if not exists phone_otp_user_created_idx
  on public.phone_verification_codes (user_id, created_at desc);
create index if not exists phone_otp_expiry_idx
  on public.phone_verification_codes (expires_at)
  where used_at is null;

-- Um lembrete passa a ter um instante absoluto (UTC), fuso informativo e canais.
alter table public.reminders
  add column if not exists timezone text not null default 'America/Sao_Paulo',
  add column if not exists channels jsonb not null default '["push"]'::jsonb,
  add column if not exists status text not null default 'scheduled',
  add column if not exists next_run_at timestamptz,
  add column if not exists claimed_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists last_error text;

update public.reminders
set next_run_at = date_time
where next_run_at is null;

alter table public.reminders
  drop constraint if exists reminders_status_check;
alter table public.reminders
  add constraint reminders_status_check
  check (status in ('scheduled', 'processing', 'sent', 'cancelled', 'failed'));

alter table public.reminders
  drop constraint if exists reminders_channels_array_check;
alter table public.reminders
  add constraint reminders_channels_array_check
  check (jsonb_typeof(channels) = 'array');

create index if not exists reminders_due_idx
  on public.reminders (next_run_at, status)
  where completed = false and status in ('scheduled', 'processing');

-- Uma linha por canal e ocorrência. A combinação única evita duplicidade
-- mesmo quando dois workers tentam processar o mesmo lembrete.
create table if not exists public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id text not null references public.reminders(id) on delete cascade,
  occurrence_at timestamptz not null,
  channel text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  provider_message_id text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  next_attempt_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminder_delivery_channel_check check (channel in ('push', 'email', 'sms', 'whatsapp', 'mobile')),
  constraint reminder_delivery_status_check check (status in ('pending', 'processing', 'sent', 'failed')),
  constraint reminder_delivery_unique_occurrence unique (reminder_id, occurrence_at, channel)
);

create index if not exists reminder_deliveries_retry_idx
  on public.reminder_deliveries (next_attempt_at, status)
  where status in ('pending', 'failed');

-- Subscriptions por dispositivo, preparadas para Web Push e futuro mobile.
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  platform text not null,
  endpoint text,
  push_p256dh text,
  push_auth text,
  device_token text,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_platform_check check (platform in ('web', 'android', 'ios', 'desktop'))
);

create unique index if not exists devices_endpoint_unique
  on public.devices (endpoint)
  where endpoint is not null;
create index if not exists devices_user_active_idx
  on public.devices (user_id, revoked_at);

-- RLS para o frontend: acesso somente aos próprios dados. O worker com
-- service_role bypassa RLS.
alter table public.phone_verification_codes enable row level security;
alter table public.reminder_deliveries enable row level security;
alter table public.devices enable row level security;

drop policy if exists "Usuário lê seus OTPs" on public.phone_verification_codes;
create policy "Usuário lê seus OTPs"
on public.phone_verification_codes for select to authenticated
using (user_id = auth.uid()::text);

drop policy if exists "Usuário lê suas entregas" on public.reminder_deliveries;
create policy "Usuário lê suas entregas"
on public.reminder_deliveries for select to authenticated
using (exists (
  select 1 from public.reminders r
  where r.id = reminder_deliveries.reminder_id
    and r.user_id = auth.uid()::text
));

drop policy if exists "Usuário gerencia seus dispositivos" on public.devices;
create policy "Usuário gerencia seus dispositivos"
on public.devices for all to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- Claim atômico com SKIP LOCKED: somente um worker assume cada lembrete.
create or replace function public.claim_due_reminders(p_limit integer default 50)
returns setof public.reminders
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
    from public.reminders
    where completed = false
      and next_run_at is not null
      and next_run_at <= now()
      and (
        status = 'scheduled'
        or (status = 'processing' and claimed_at < now() - interval '10 minutes')
      )
    order by next_run_at
    for update skip locked
    limit greatest(1, least(p_limit, 200))
  )
  update public.reminders r
  set status = 'processing', claimed_at = now(), last_error = null
  from candidates c
  where r.id = c.id
  returning r.*;
$$;

revoke all on function public.claim_due_reminders(integer) from public, anon, authenticated;

commit;
