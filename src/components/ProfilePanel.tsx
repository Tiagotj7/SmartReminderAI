'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, LockKeyhole, LogOut, Save, UserCircle, X } from 'lucide-react'
import {
  fetchProfile,
  updatePassword,
  updateProfile,
  uploadAvatar,
  type UserProfile,
} from '../services/profileService'

interface Props {
  userId: string
  email: string | null | undefined
  onClose: () => void
  onSignOut: () => Promise<void>
}

export default function ProfilePanel({ userId, email, onClose, onSignOut }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    void fetchProfile(userId)
      .then((data) => {
        if (!active) return
        setProfile(data)
        setName(data.name ?? '')
        setPhone(data.phone ?? '')
        setBio(data.bio ?? '')
        setBirthDate(data.birthDate ?? '')
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar o perfil.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId])

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(''); setMessage(''); setSaving(true)
    try {
      const updated = await updateProfile(userId, { name, phone, bio, birthDate })
      setProfile(updated)
      setMessage('Informações salvas.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o perfil.')
    } finally { setSaving(false) }
  }

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(''); setMessage('')
    if (newPassword.length < 8) { setError('A nova senha deve ter pelo menos 8 caracteres.'); return }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Use uma letra maiúscula, uma minúscula e um número na nova senha.')
      return
    }
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return }
    setSaving(true)
    try {
      await updatePassword(newPassword)
      setNewPassword(''); setConfirmPassword('')
      setMessage('Senha alterada com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar a senha.')
    } finally { setSaving(false) }
  }

  const selectAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError(''); setMessage(''); setUploading(true)
    try {
      const updated = await uploadAvatar(userId, file)
      setProfile(updated)
      setMessage('Foto de perfil atualizada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a foto.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const signOut = async () => {
    setError(''); setSigningOut(true)
    try {
      await onSignOut()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível sair da conta.')
      setSigningOut(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Meu perfil">
      <div className="modal-content max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-base font-bold text-white">Meu perfil</h2>
            <p className="mt-1 text-xs text-slate-500">Informações pessoais são opcionais.</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost" aria-label="Fechar perfil">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Carregando perfil...</div>
        ) : (
          <div className="space-y-6 p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800 sm:h-20 sm:w-20">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-full w-full p-2 text-slate-500" />
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:opacity-60" title="Alterar foto">
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Foto de perfil</p>
                <p className="mt-1 text-xs text-slate-500">PNG, JPG ou WEBP até 5 MB.</p>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={selectAvatar} className="hidden" />
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="label" htmlFor="profile-email">E-mail</label>
                <input id="profile-email" value={profile?.email ?? email ?? ''} disabled className="input-base cursor-not-allowed opacity-60" />
              </div>
              <div>
                <label className="label" htmlFor="profile-name">Nome</label>
                <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como você quer ser chamado" className="input-base" maxLength={120} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="profile-phone">Telefone</label>
                  <input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="input-base" maxLength={30} />
                </div>
                <div>
                  <label className="label" htmlFor="profile-birth-date">Data de nascimento</label>
                  <input id="profile-birth-date" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="input-base" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="profile-bio">Sobre você</label>
                <textarea id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Informações opcionais" className="input-base resize-none" rows={3} maxLength={500} />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar informações'}
              </button>
            </form>

            <form onSubmit={changePassword} className="space-y-4 border-t border-slate-800 pt-6">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Alterar senha</h3>
              </div>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha" className="input-base" minLength={8} autoComplete="new-password" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" className="input-base" minLength={8} autoComplete="new-password" />
              <button type="submit" disabled={saving} className="btn-secondary w-full">
                <LockKeyhole className="h-4 w-4" /> {saving ? 'Atualizando...' : 'Alterar senha'}
              </button>
            </form>

            {error && <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
            {message && <p className="rounded-lg bg-green-500/10 p-3 text-xs text-green-300">{message}</p>}

            <button type="button" onClick={signOut} disabled={signingOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60">
              <LogOut className="h-4 w-4" /> {signingOut ? 'Saindo...' : 'Sair da conta'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
