import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
    },
  })
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

function randomCode(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(bytes[0] % 1_000_000).padStart(6, '0')
}

async function hashCode(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(code)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sendOtp(phone: string, code: string) {
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  const templateName = Deno.env.get('WHATSAPP_OTP_TEMPLATE_NAME')
  const languageCode = Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') || 'pt_BR'
  if (!phoneNumberId || !accessToken || !templateName) {
    throw new Error('A verificação por WhatsApp ainda não está configurada no backend.')
  }

  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }],
      },
    }),
  })
  if (!response.ok) throw new Error(`Não foi possível enviar o código (${response.status}).`)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return json({ ok: true })
  if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const authorization = request.headers.get('authorization')
  const token = authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Sessão não encontrada.' }, 401)

  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) return json({ error: 'Sessão inválida.' }, 401)
  const userId = authData.user.id

  const body = await request.json().catch(() => ({})) as {
    action?: 'request' | 'confirm'
    phone?: string
    code?: string
  }

  if (body.action === 'request') {
    const phone = normalizePhone(body.phone || '')
    if (!phone || phone.length < 10 || phone.length > 15) {
      return json({ error: 'Informe um número de telefone válido.' }, 400)
    }

    const { count } = await supabase
      .from('phone_verification_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 60 * 60_000).toISOString())
    if ((count || 0) >= 3) return json({ error: 'Limite de códigos atingido. Tente novamente mais tarde.' }, 429)

    const { data: latest } = await supabase
      .from('phone_verification_codes')
      .select('resend_after')
      .eq('user_id', userId)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latest && new Date(latest.resend_after).getTime() > Date.now()) {
      return json({ error: 'Aguarde alguns segundos antes de solicitar outro código.' }, 429)
    }

    const code = randomCode()
    const codeHash = await hashCode(code)
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()
    const resendAfter = new Date(Date.now() + 60_000).toISOString()

    await supabase.from('phone_verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('used_at', null)

    const { error: insertError } = await supabase.from('phone_verification_codes').insert({
      user_id: userId,
      phone_e164: phone,
      code_hash: codeHash,
      expires_at: expiresAt,
      resend_after: resendAfter,
    })
    if (insertError) return json({ error: 'Não foi possível criar o código.' }, 500)

    try {
      await sendOtp(phone, code)
    } catch (error) {
      await supabase.from('phone_verification_codes').update({ used_at: new Date().toISOString() })
        .eq('user_id', userId).eq('code_hash', codeHash)
      return json({ error: error instanceof Error ? error.message : 'Não foi possível enviar o código.' }, 502)
    }

    return json({ ok: true, expiresIn: 600 })
  }

  if (body.action === 'confirm') {
    const code = (body.code || '').replace(/\D/g, '')
    if (!/^\d{6}$/.test(code)) return json({ error: 'Digite o código de 6 dígitos.' }, 400)

    const { data: verification } = await supabase.from('phone_verification_codes')
      .select('id, phone_e164, code_hash, expires_at, attempts, max_attempts, locked_until')
      .eq('user_id', userId)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!verification) return json({ error: 'Código inválido ou expirado.' }, 400)
    if (verification.locked_until && new Date(verification.locked_until).getTime() > Date.now()) {
      return json({ error: 'Código bloqueado. Solicite um novo código.' }, 429)
    }
    if (new Date(verification.expires_at).getTime() <= Date.now()) {
      return json({ error: 'Código expirado. Solicite um novo código.' }, 400)
    }

    const valid = (await hashCode(code)) === verification.code_hash
    if (!valid) {
      const attempts = verification.attempts + 1
      await supabase.from('phone_verification_codes').update({
        attempts,
        locked_until: attempts >= verification.max_attempts ? new Date(Date.now() + 10 * 60_000).toISOString() : null,
      }).eq('id', verification.id)
      return json({ error: attempts >= verification.max_attempts ? 'Código bloqueado. Solicite um novo código.' : 'Código incorreto.' }, 400)
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabase.from('users').update({
      phone_e164: verification.phone_e164,
      phone_verified: true,
      phone_verified_at: now,
      updated_at: now,
    }).eq('id', userId)
    if (updateError) return json({ error: 'Não foi possível confirmar o telefone.' }, 500)

    await supabase.from('phone_verification_codes').update({ used_at: now }).eq('id', verification.id)
    return json({ ok: true, phone: verification.phone_e164 })
  }

  return json({ error: 'Ação inválida.' }, 400)
})
