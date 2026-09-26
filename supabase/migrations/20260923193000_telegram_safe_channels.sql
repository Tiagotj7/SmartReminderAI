-- Start Reminders: Telegram oficial e desativação do WhatsApp automático.
-- Execute depois de 20260923190000_multichannel_reminders.sql.

begin;

alter table public.users
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_verified boolean not null default false;

create unique index if not exists users_telegram_chat_id_unique
  on public.users (telegram_chat_id)
  where telegram_chat_id is not null;

alter table public.reminder_deliveries
  drop constraint if exists reminder_delivery_channel_check;

alter table public.reminder_deliveries
  add constraint reminder_delivery_channel_check
  check (channel in ('push', 'email', 'sms', 'whatsapp', 'telegram', 'mobile'));

commit;
