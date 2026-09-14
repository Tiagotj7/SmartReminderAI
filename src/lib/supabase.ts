import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas no .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
})

let sessionPromise: Promise<string> | null = null

export async function getOrCreateUserId(): Promise<string> {
  if (sessionPromise) return sessionPromise
  sessionPromise = (async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return session.user.id
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) throw new Error(error?.message ?? 'Falha ao criar sessão anônima')
    return data.user.id
  })()
  return sessionPromise
}
