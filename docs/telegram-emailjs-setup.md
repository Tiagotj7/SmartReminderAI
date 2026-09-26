# Telegram automático e EmailJS

## O que foi implementado

O perfil agora tem o botão **Conectar Telegram**. O usuário não precisa copiar `chat_id` nem cadastrar telefone no Telegram:

1. clica em **Conectar Telegram**;
2. o site abre o bot com um token temporário;
3. toca em **Iniciar** no Telegram;
4. o webhook salva o `chat.id` na conta correta;
5. os lembretes com canal `telegram` são enviados pela Bot API oficial.

O e-mail continua sendo enviado pelo EmailJS para `users.email`.

O WhatsApp automático foi removido da interface e permanece desativado no worker.

## SQL completo

Execute no Supabase SQL Editor, depois das migrations anteriores:

```sql
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
```

## Secrets do Supabase

Configure os secrets:

```bash
supabase secrets set \
  TELEGRAM_BOT_TOKEN="TOKEN_DO_BOT" \
  TELEGRAM_BOT_USERNAME="SmartRemindersAI_bot" \
  TELEGRAM_WEBHOOK_SECRET="uma-chave-aleatoria-longa" \
  EMAILJS_SERVICE_ID="service_xxxxx" \
  EMAILJS_TEMPLATE_ID="template_xxxxx" \
  EMAILJS_PUBLIC_KEY="sua_public_key"
```

Não coloque esses valores no GitHub ou em `NEXT_PUBLIC_*`. O `TELEGRAM_BOT_TOKEN` é segredo. O EmailJS `PUBLIC_KEY` é usado como identificador da API, mas também fica no backend nesta implementação.

## Publicar as funções

```bash
supabase functions deploy create-telegram-link --no-verify-jwt
supabase functions deploy telegram-webhook --no-verify-jwt
supabase functions deploy dispatch-reminders --no-verify-jwt
```

## Configurar o webhook

Substitua `SEU_TOKEN` pelo token do bot, `SEU_PROJECT_REF` pelo identificador do projeto Supabase e `SUA_CHAVE` pela mesma chave configurada em `TELEGRAM_WEBHOOK_SECRET`:

```bash
curl -X POST \
  "https://api.telegram.org/botSEU_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://SEU_PROJECT_REF.supabase.co/functions/v1/telegram-webhook",
    "secret_token": "SUA_CHAVE",
    "allowed_updates": ["message"]
  }'
```

Verifique:

```bash
curl "https://api.telegram.org/botSEU_TOKEN/getWebhookInfo"
```

O campo `url` deve apontar para `telegram-webhook`.

## Configurar no site

Depois de publicar o frontend na Vercel:

1. abra o perfil;
2. clique em **Conectar Telegram**;
3. toque em **Iniciar** no bot;
4. crie um lembrete;
5. selecione **Telegram**.

Para e-mail, selecione **E-mail** no formulário. O template EmailJS deve usar `{{to_email}}` no campo destinatário.
