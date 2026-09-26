import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  phone: string | null
  phoneVerified: boolean
  telegramChatId: string | null
  telegramVerified: boolean
  bio: string | null
  birthDate: string | null
}

const PROFILE_FIELDS = 'id, email, name, avatar_url, phone, phone_verified, telegram_chat_id, telegram_verified, bio, birth_date'

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    email: (row.email as string | null) ?? null,
    name: (row.name as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    phoneVerified: Boolean(row.phone_verified),
    telegramChatId: (row.telegram_chat_id as string | null) ?? null,
    telegramVerified: Boolean(row.telegram_verified),
    bio: (row.bio as string | null) ?? null,
    birthDate: (row.birth_date as string | null) ?? null,
  }
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

export async function fetchProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_FIELDS)
    .eq('id', userId)
    .single()

  if (error) throw new Error(error.message)
  return mapProfile(data)
}

export async function updateProfile(
  userId: string,
  data: Pick<UserProfile, 'name' | 'phone' | 'bio' | 'birthDate'>,
): Promise<UserProfile> {
  const { data: updated, error } = await supabase
    .from('users')
    .update({
      name: data.name?.trim() || null,
      phone: data.phone?.trim() || null,
      phone_e164: normalizePhone(data.phone ?? ''),
      phone_verified: false,
      phone_verified_at: null,
      bio: data.bio?.trim() || null,
      birth_date: data.birthDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select(PROFILE_FIELDS)
    .single()

  if (error) throw new Error(error.message)
  return mapProfile(updated)
}

export async function uploadAvatar(userId: string, file: File): Promise<UserProfile> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Escolha um arquivo de imagem.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('A imagem deve ter no máximo 5 MB.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (uploadError) throw new Error(uploadError.message)

  const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ avatar_url: publicData.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select(PROFILE_FIELDS)
    .single()

  if (updateError) throw new Error(updateError.message)
  return mapProfile(updated)
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}
