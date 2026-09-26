import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const botUsername = Deno.env.get('TELEGRAM_BOT_USERNAME')?.replace(/^@/, '')
const supabase = createClient(supabaseUrl, serviceRoleKey)

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-max-age': '86400',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function randomToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  if (!botUsername) return json({ error: 'TELEGRAM_BOT_USERNAME não configurado.' }, 500)

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Sessão não encontrada.' }, 401)
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) return json({ error: 'Sessão inválida.' }, 401)

  const userId = authData.user.id
  const rawToken = randomToken()
  const tokenHash = await hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()

  await supabase.from('telegram_link_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null)

  const { error: insertError } = await supabase.from('telegram_link_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  })
  if (insertError) return json({ error: 'Não foi possível criar o link de conexão.' }, 500)

  return json({
    ok: true,
    expiresIn: 600,
    url: `https://t.me/${botUsername}?start=${rawToken}`,
  })
})
