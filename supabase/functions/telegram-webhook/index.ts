import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
const supabase = createClient(supabaseUrl, serviceRoleKey)

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string }
    text?: string
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function reply(chatId: number | string, text: string) {
  if (!botToken) return
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ ok: true })
  if (webhookSecret && request.headers.get('x-telegram-webhook-secret') !== webhookSecret) {
    return json({ error: 'Não autorizado' }, 401)
  }

  const update = await request.json().catch(() => ({})) as TelegramUpdate
  const chatId = update.message?.chat?.id
  const text = update.message?.text || ''
  const match = text.match(/^\/start(?:\s+([a-f0-9]{48}))?$/i)
  if (!chatId || !match?.[1]) {
    if (chatId) await reply(chatId, 'Abra o Telegram pelo botão Conectar Telegram dentro do Start Reminders para vincular sua conta.')
    return json({ ok: true })
  }

  const tokenHash = await hashToken(match[1])
  const { data: link, error: linkError } = await supabase
    .from('telegram_link_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .maybeSingle()

  if (linkError || !link || new Date(link.expires_at).getTime() <= Date.now()) {
    await reply(chatId, 'Este link expirou. Gere um novo link no seu perfil do Start Reminders.')
    return json({ ok: true })
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase.from('users').update({
    telegram_chat_id: String(chatId),
    telegram_verified: true,
    updated_at: now,
  }).eq('id', link.user_id)

  if (updateError) {
    await reply(chatId, 'Não foi possível concluir a conexão. Tente gerar um novo link no site.')
    return json({ ok: true })
  }

  await supabase.from('telegram_link_tokens').update({ used_at: now }).eq('id', link.id)
  await reply(chatId, 'Telegram conectado ao Start Reminders. Você receberá seus lembretes aqui.')
  return json({ ok: true })
})
