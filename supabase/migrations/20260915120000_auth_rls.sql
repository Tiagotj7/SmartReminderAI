-- SmartReminderAI: autenticação pública e RLS para Supabase.
-- Execute esta migration no SQL Editor ou pelo sistema de migrations do Supabase.

alter table public.users
  alter column email drop not null;

create unique index if not exists categories_slug_unique
  on public.categories (slug);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', 'Usuário')
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.users.name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.user_settings enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_history enable row level security;
alter table public.reminder_tags enable row level security;
alter table public.tags enable row level security;
alter table public.categories enable row level security;

drop policy if exists "Usuário vê seu próprio perfil" on public.users;
create policy "Usuário vê seu próprio perfil"
on public.users
for select
to authenticated
using (id = auth.uid()::text);

drop policy if exists "Usuário acessa suas configurações" on public.user_settings;
create policy "Usuário acessa suas configurações"
on public.user_settings
for all
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists "Usuário vê seus lembretes" on public.reminders;
create policy "Usuário vê seus lembretes"
on public.reminders
for select
to authenticated
using (user_id = auth.uid()::text);

drop policy if exists "Usuário cria seus lembretes" on public.reminders;
create policy "Usuário cria seus lembretes"
on public.reminders
for insert
to authenticated
with check (user_id = auth.uid()::text);

drop policy if exists "Usuário altera seus lembretes" on public.reminders;
create policy "Usuário altera seus lembretes"
on public.reminders
for update
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists "Usuário exclui seus lembretes" on public.reminders;
create policy "Usuário exclui seus lembretes"
on public.reminders
for delete
to authenticated
using (user_id = auth.uid()::text);

drop policy if exists "Usuário lê seu histórico" on public.reminder_history;
create policy "Usuário lê seu histórico"
on public.reminder_history
for select
to authenticated
using (
  exists (
    select 1
    from public.reminders r
    where r.id = reminder_history.reminder_id
      and r.user_id = auth.uid()::text
  )
);

drop policy if exists "Usuário lê suas relações de tags" on public.reminder_tags;
create policy "Usuário lê suas relações de tags"
on public.reminder_tags
for select
to authenticated
using (
  exists (
    select 1
    from public.reminders r
    where r.id = reminder_tags.reminder_id
      and r.user_id = auth.uid()::text
  )
);

drop policy if exists "Usuário lê tags" on public.tags;
create policy "Usuário lê tags"
on public.tags
for select
to authenticated
using (true);

drop policy if exists "Usuário lê categorias" on public.categories;
create policy "Usuário lê categorias"
on public.categories
for select
to authenticated
using (true);


-- Perfil opcional
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists birth_date date;

drop policy if exists "Usuário atualiza seu próprio perfil" on public.users;
create policy "Usuário atualiza seu próprio perfil"
on public.users
for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

-- Bucket público somente para leitura dos avatares.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Usuário envia seu avatar" on storage.objects;
create policy "Usuário envia seu avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Usuário atualiza seu avatar" on storage.objects;
create policy "Usuário atualiza seu avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Usuário remove seu avatar" on storage.objects;
create policy "Usuário remove seu avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- IDs dos lembretes: garante criação mesmo quando o cliente não enviar id.
create extension if not exists pgcrypto;
alter table public.reminders
  alter column id set default gen_random_uuid()::text;
