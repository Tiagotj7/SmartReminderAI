import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Variáveis do Supabase não configuradas no .env')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: true,
  },
})

// ═══════════════════════════════════════════════════════
// SESSÃO ANÔNIMA
// ═══════════════════════════════════════════════════════
// O app não tem tela de login. Para ter um user_id real (e permitir
// políticas de RLS por usuário), usamos "Anonymous Sign-ins" do Supabase:
// cada dispositivo/navegador ganha uma sessão anônima persistida,
// sem precisar de e-mail/senha. Requer habilitar "Anonymous sign-ins"
// em Authentication → Providers no painel do Supabase.
let sessionPromise: Promise<string> | null = null

export async function getOrCreateUserId(): Promise<string> {
  if (sessionPromise) return sessionPromise

  sessionPromise = (async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return session.user.id

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Falha ao criar sessão anônima')
    }
    return data.user.id
  })()

  return sessionPromise
}