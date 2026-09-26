import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Reminder = {
  id: string
  user_id: string
  title: string
  description: string | null
  date_time: string
  next_run_at: string | null
  timezone: string
  channels: string[]
  repeat: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
}

type User = {
  id: string
  email: string | null
  phone_e164: string | null
  phone_verified: boolean
  telegram_chat_id: string | null
  telegram_verified: boolean
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const workerSecret = Deno.env.get('REMINDER_WORKER_SECRET')
const supabase = createClient(supabaseUrl, serviceRoleKey)

const MAX_ATTEMPTS = 3
const RETRY_MINUTES = [1, 5, 30]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function retryAt(attempt: number) {
  const minutes = RETRY_MINUTES[Math.min(attempt, RETRY_MINUTES.length - 1)]
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function nextOccurrence(occurrenceAt: string, repeat: Reminder['repeat']) {
  if (repeat === 'NONE') return null
  const next = new Date(occurrenceAt)
  if (repeat === 'DAILY') next.setUTCDate(next.getUTCDate() + 1)
  if (repeat === 'WEEKLY') next.setUTCDate(next.getUTCDate() + 7)
  if (repeat === 'MONTHLY') next.setUTCMonth(next.getUTCMonth() + 1)
  if (repeat === 'YEARLY') next.setUTCFullYear(next.getUTCFullYear() + 1)
  return next
}

function renderTemplate(reminder: Reminder, user: User) {
  const localDate = new Date(reminder.date_time).toLocaleString('pt-BR', {
    timeZone: reminder.timezone || 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
  return {
    title: reminder.title,
    description: reminder.description || '',
    date: localDate,
    name: user.email?.split('@')[0] || 'você',
  }
}

async function sendWhatsApp(reminder: Reminder, user: User) {
  throw new Error('WhatsApp automático desativado por segurança: não usamos Meta, WhatsApp Web ou APIs não oficiais')
}

async function sendTelegram(reminder: Reminder, user: User) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken || !user.telegram_chat_id || !user.telegram_verified) {
    throw new Error('Telegram não configurado ou chat do usuário não verificado')
  }

  const values = renderTemplate(reminder, user)
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.telegram_chat_id,
      text: `🔔 Lembrete: ${values.title}\n⏰ Horário: ${values.date}\n📝 ${values.description || 'Sem descrição'}`,
    }),
  })
  const result = await response.json()
  if (!response.ok || !result.ok) throw new Error(`Telegram ${response.status}: ${result.description || 'falha no envio'}`)
  return String(result.result?.message_id || '')
}

async function sendEmail(reminder: Reminder, user: User) {
  const serviceId = Deno.env.get('EMAILJS_SERVICE_ID')
  const templateId = Deno.env.get('EMAILJS_TEMPLATE_ID')
  const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY')
  if (!serviceId || !templateId || !publicKey || !user.email) {
    throw new Error('EmailJS não configurado ou usuário sem e-mail')
  }

  const values = renderTemplate(reminder, user)
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_email: user.email,
        name: values.name,
        title: values.title,
        date: values.date,
        description: values.description || 'Sem descrição',
      },
    }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(`EmailJS ${response.status}: ${JSON.stringify(result)}`)
  return result?.id || `emailjs-${Date.now()}`
}

async function processChannel(reminder: Reminder, user: User, channel: string, occurrenceAt: string) {
  if (channel === 'push') {
    return { skipped: true, reason: 'Web Push backend será conectado ao registrar devices/VAPID' }
  }

  const { data: delivery, error: insertError } = await supabase
    .from('reminder_deliveries')
    .upsert({
      reminder_id: reminder.id,
      occurrence_at: occurrenceAt,
      channel,
      status: 'pending',
      next_attempt_at: new Date().toISOString(),
    }, { onConflict: 'reminder_id,occurrence_at,channel', ignoreDuplicates: true })
    .select('id, status, attempts')
    .single()

  if (insertError && insertError.code !== 'PGRST116') throw insertError
  if (!delivery || delivery.status === 'sent') return { skipped: true }

  const { data: claimed, error: claimError } = await supabase
    .from('reminder_deliveries')
    .update({ status: 'processing', attempts: delivery.attempts + 1, updated_at: new Date().toISOString() })
    .eq('id', delivery.id)
    .in('status', ['pending', 'failed'])
    .lt('attempts', MAX_ATTEMPTS)
    .select('id')
    .maybeSingle()

  if (claimError) throw claimError
  if (!claimed) return { skipped: true }

  try {
    let providerMessageId: string | null = null
    if (channel === 'whatsapp') providerMessageId = await sendWhatsApp(reminder, user)
    else if (channel === 'email') providerMessageId = await sendEmail(reminder, user)
    else if (channel === 'telegram') providerMessageId = await sendTelegram(reminder, user)
    else throw new Error(`Canal não suportado: ${channel}`)

    await supabase.from('reminder_deliveries').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider_message_id: providerMessageId,
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', delivery.id)
    return { sent: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const nextAttempt = delivery.attempts < MAX_ATTEMPTS ? retryAt(delivery.attempts) : null
    await supabase.from('reminder_deliveries').update({
      status: delivery.attempts < MAX_ATTEMPTS ? 'failed' : 'failed',
      last_error: message.slice(0, 1000),
      next_attempt_at: nextAttempt,
      updated_at: new Date().toISOString(),
    }).eq('id', delivery.id)
    return { sent: false, error: message }
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  if (workerSecret && request.headers.get('x-worker-secret') !== workerSecret) {
    return json({ error: 'Não autorizado' }, 401)
  }

  const { data: reminders, error: claimError } = await supabase
    .rpc('claim_due_reminders', { p_limit: 50 }) as { data: Reminder[] | null; error: Error | null }
  if (claimError) return json({ error: claimError.message }, 500)

  const results = []
  for (const reminder of reminders || []) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, phone_e164, phone_verified, telegram_chat_id, telegram_verified')
      .eq('id', reminder.user_id)
      .single() as { data: User | null; error: Error | null }

    if (userError || !user) {
      results.push({ id: reminder.id, error: userError?.message || 'Usuário não encontrado' })
      continue
    }

    const occurrenceAt = reminder.next_run_at || reminder.date_time
    const channels = Array.isArray(reminder.channels) ? reminder.channels : ['push']
    const channelResults = []
    for (const channel of channels) {
      channelResults.push({ channel, ...(await processChannel(reminder, user, channel, occurrenceAt)) })
    }

    const hasPending = channelResults.some((result) => !result.sent && !result.skipped)
    const nextDate = nextOccurrence(occurrenceAt, reminder.repeat)

    await supabase.from('reminders').update({
      status: hasPending ? 'failed' : nextDate ? 'scheduled' : 'sent',
      next_run_at: nextDate?.toISOString() || null,
      sent_at: hasPending ? null : new Date().toISOString(),
      claimed_at: null,
      last_error: hasPending ? 'Um ou mais canais falharam; verifique deliveries' : null,
    }).eq('id', reminder.id)

    results.push({ id: reminder.id, channels: channelResults })
  }

  return json({ processed: results.length, results })
})
