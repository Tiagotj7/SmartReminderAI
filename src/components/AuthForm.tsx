'use client'

import { useMemo, useState } from 'react'
import { Bell, Eye, EyeOff, LockKeyhole, Mail, LogIn, UserPlus } from 'lucide-react'
import type { useAuth } from '../hooks/useAuth'

type AuthApi = ReturnType<typeof useAuth>

type PasswordRule = { label: string; valid: boolean }

function GoogleLogo() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.35 12.23c0-.78-.07-1.53-.23-2.25H12v4.26h5.24a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.38Z"/><path fill="#34A853" d="M12 21.6c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.52A9.75 9.75 0 0 0 12 21.6Z"/><path fill="#FBBC05" d="M6.53 13.69A5.86 5.86 0 0 1 6.22 12c0-.59.11-1.16.31-1.69V7.79H3.28A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.05 1.03 4.21l3.25-2.52Z"/><path fill="#EA4335" d="M12 6.28c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.36 14.63 2.4 12 2.4a9.75 9.75 0 0 0-8.72 5.39l3.25 2.52C7.3 8 9.46 6.28 12 6.28Z"/></svg>
}

export default function AuthForm({ auth }: { auth: AuthApi }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const rules = useMemo<PasswordRule[]>(() => [
    { label: 'Pelo menos 8 caracteres', valid: password.length >= 8 },
    { label: 'Uma letra maiúscula', valid: /[A-Z]/.test(password) },
    { label: 'Uma letra minúscula', valid: /[a-z]/.test(password) },
    { label: 'Um número', valid: /\d/.test(password) },
    { label: 'Um caractere especial', valid: /[^A-Za-z0-9]/.test(password) },
  ], [password])
  const strength = rules.filter(rule => rule.valid).length
  const strongPassword = strength === rules.length

  const changeMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode); setError(''); setMessage(''); setPassword(''); setConfirmPassword('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('')
    if (mode === 'signup') {
      if (!strongPassword) { setError('Crie uma senha forte seguindo todos os requisitos.'); return }
      if (password !== confirmPassword) { setError('As senhas não coincidem.'); return }
    }
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await auth.signUp(email, password)
        setMessage('Cadastro realizado. Verifique seu e-mail para confirmar a conta.')
        setMode('login'); setPassword(''); setConfirmPassword('')
      } else await auth.signIn(email, password)
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível realizar a operação.') }
    finally { setSubmitting(false) }
  }

  const google = async () => {
    setError(''); setSubmitting(true)
    try { await auth.signInWithGoogle() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível entrar com Google.'); setSubmitting(false) }
  }

  return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl"><div className="text-center mb-8"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30"><Bell className="h-7 w-7" /></div><h1 className="text-2xl font-bold">Smart Reminders</h1><p className="mt-2 text-sm text-slate-400">Organize sua rotina com lembretes inteligentes</p></div><div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1 mb-6"><button onClick={() => changeMode('login')} className={`rounded-lg py-2 text-sm font-medium ${mode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><LogIn className="mr-2 inline h-4 w-4" />Entrar</button><button onClick={() => changeMode('signup')} className={`rounded-lg py-2 text-sm font-medium ${mode === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><UserPlus className="mr-2 inline h-4 w-4" />Cadastrar</button></div><button onClick={google} disabled={submitting} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-white py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"><GoogleLogo />Continuar com Google</button><div className="my-5 flex items-center gap-3 text-xs text-slate-600"><div className="h-px flex-1 bg-slate-800" />ou<div className="h-px flex-1 bg-slate-800" /></div><form onSubmit={submit} className="space-y-4"><label className="block text-xs font-medium text-slate-300">E-mail<div className="relative mt-2"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" className="input-base pl-10" /></div></label><label className="block text-xs font-medium text-slate-300">Senha<div className="relative mt-2"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input required minLength={mode === 'signup' ? 8 : 1} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Crie uma senha forte' : 'Sua senha'} className="input-base pl-10 pr-10" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>{mode === 'signup' && <div className="-mt-2 space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="flex gap-1">{[1, 2, 3, 4, 5].map(level => <div key={level} className={`h-1.5 flex-1 rounded-full ${strength >= level ? (strength <= 2 ? 'bg-red-500' : strength <= 4 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-slate-700'}`} />)}</div><p className="text-xs text-slate-400">Força da senha: <span className={strongPassword ? 'text-green-400' : 'text-yellow-400'}>{strongPassword ? 'Forte' : strength >= 3 ? 'Média' : 'Fraca'}</span></p><ul className="grid grid-cols-1 gap-1 text-xs">{rules.map(rule => <li key={rule.label} className={rule.valid ? 'text-green-400' : 'text-slate-500'}>{rule.valid ? '✓' : '○'} {rule.label}</li>)}</ul></div>} {mode === 'signup' && <label className="block text-xs font-medium text-slate-300">Repetir senha<div className="relative mt-2"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input required type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Digite a senha novamente" className={`input-base pl-10 pr-10 ${confirmPassword && password !== confirmPassword ? 'border-red-500' : ''}`} /><button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost">{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{confirmPassword && <span className={`mt-1 block text-xs ${password === confirmPassword ? 'text-green-400' : 'text-red-400'}`}>{password === confirmPassword ? '✓ Senhas iguais' : 'As senhas não coincidem'}</span>}</label>}{error && <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}{message && <p className="rounded-lg bg-green-500/10 p-3 text-xs text-green-300">{message}</p>}<button disabled={submitting} className="btn-primary w-full">{submitting ? 'Aguarde...' : mode === 'login' ? 'Entrar na conta' : 'Criar minha conta'}</button></form></section></main>
}
