'use client'

import { useState, useMemo } from 'react'
import {
  Bell, Plus, Search,
  LayoutDashboard, CheckSquare, Clock,
  AlertCircle, Smartphone, UserCircle,
} from 'lucide-react'
import { useReminders } from '../src/hooks/useReminders'
import { useAuth } from '../src/hooks/useAuth'
import ReminderForm from '../src/components/ReminderForm'
import ReminderCard from '../src/components/ReminderCard'
import PermissionBanner from '../src/components/PermissionBanner'
import AuthForm from '../src/components/AuthForm'
import ProfilePanel from '../src/components/ProfilePanel'
import InstallGuide from '../src/components/InstallGuide'
import MeshDriftBackground from '../src/components/MeshDriftBackground'
import { notificationService } from '../src/services/notificationService'
import type { FilterType, Category, FilterConfig, Reminder } from '../src/types'

// ═══════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════
const FILTERS: FilterConfig[] = [
  { key: 'all',       label: 'Todos',     icon: LayoutDashboard },
  { key: 'pending',   label: 'Pendentes', icon: Clock },
  { key: 'today',     label: 'Hoje',      icon: Bell },
  { key: 'overdue',   label: 'Vencidos',  icon: AlertCircle },
  { key: 'completed', label: 'Concluídos',icon: CheckSquare },
]

// ═══════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const auth = useAuth()
  const {
    reminders,
    loading,
    error,
    permissionStatus,
    stats,
    requestPermission,
    addReminder,
    editReminder,
    toggleComplete,
    deleteReminder,
    getFiltered,
  } = useReminders(auth.user?.id ?? null)

  const [showForm, setShowForm]           = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [filter, setFilter]               = useState<FilterType>('all')
  const [category, setCategory]           = useState<Category | 'all'>('all')
  const [search, setSearch]               = useState('')
  const [testSent, setTestSent]           = useState(false)
  const [showProfile, setShowProfile]     = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)

  // ─────────────────────────────────────
  // LEMBRETES FILTRADOS
  // ─────────────────────────────────────
  const filtered = useMemo(
    () => getFiltered(filter, category, search),
    [getFiltered, filter, category, search]
  )

  // ─────────────────────────────────────
  // AÇÕES
  // ─────────────────────────────────────
  const handleTestNotification = async () => {
    await notificationService.sendTestNotification()
    setTestSent(true)
    setTimeout(() => setTestSent(false), 3000)
  }

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setShowForm(true)
  }

  const handleFormAdd = async (data: Parameters<typeof addReminder>[0]) => {
    if (editingReminder) {
      await editReminder(editingReminder.id, data)
      setEditingReminder(null)
    } else {
      await addReminder(data)
    }
  }

  const handleCloseForm = () => { setShowForm(false); setEditingReminder(null) }

  if (auth.loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Bell className="w-8 h-8 text-indigo-400 animate-pulse" /></div>
  if (!auth.user) return <AuthForm auth={auth} />

  // ─────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Bell className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────
  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-slate-950/35 text-white">
      <MeshDriftBackground />

      {/* ══ ERRO DE CONEXÃO ══ */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-300 text-sm text-center px-4 py-2">
          ⚠️ {error}
        </div>
      )}

      {/* ══ HEADER ══ */}
      <header className="relative z-10 sticky top-0 border-b border-white/10 bg-slate-950/55 shadow-[0_8px_30px_rgba(2,6,23,0.28)] backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-3xl justify-center px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex min-w-0 items-center justify-between gap-2">

            {/* Logo */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 sm:h-10 sm:w-10">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-none text-white sm:text-lg">
                  Smart Reminders
                </h1>
                <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                  {stats.pending} pendentes
                  {stats.overdue > 0 && (
                    <span className="text-red-400 ml-1">
                      • {stats.overdue} vencidos
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowProfile(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] text-slate-300 transition-colors hover:bg-white/[0.15] hover:text-white sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
                title="Meu perfil"
                aria-label="Meu perfil"
              >
                <UserCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Perfil</span>
              </button>

              {/* Status notificação */}
              <div className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.08] px-2 sm:h-auto sm:px-2.5 sm:py-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    permissionStatus === 'granted' ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span className="hidden text-xs text-slate-400 sm:block">
                  {permissionStatus === 'granted' ? 'Ativas' : 'Desativadas'}
                </span>
              </div>

              {/* Teste */}
              {permissionStatus === 'granted' && (
                <button
                  onClick={handleTestNotification}
                  className={`h-9 w-9 rounded-lg p-2 transition-all ${
                    testSent
                      ? 'bg-green-500/20 text-green-400'
                      : 'border border-white/10 bg-white/[0.08] text-slate-400 hover:bg-white/[0.15] hover:text-white'
                  }`}
                  title="Enviar notificação de teste"
                  aria-label="Enviar notificação de teste"
                >
                  <Bell className="w-4 h-4" />
                </button>
              )}

              {/* Novo */}
              <button
                onClick={() => {
                  setEditingReminder(null)
                  setShowForm(true)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-500 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
                aria-label="Novo lembrete"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo Lembrete</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ══ MAIN ══ */}
      <main className="relative z-10 mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6">

        {/* Banner permissão */}
        <PermissionBanner
          status={permissionStatus}
          onRequest={requestPermission}
        />

        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-4 sm:gap-3">
          {[
            { label: 'Total',     value: stats.total,     color: 'text-slate-300',                         bg: 'bg-slate-800' },
            { label: 'Pendentes', value: stats.pending,   color: 'text-blue-400',                          bg: 'bg-blue-500/10' },
            { label: 'Hoje',      value: stats.today,     color: 'text-indigo-400',                        bg: 'bg-indigo-500/10' },
            { label: 'Vencidos',  value: stats.overdue,   color: stats.overdue > 0 ? 'text-red-400' : 'text-slate-500', bg: stats.overdue > 0 ? 'bg-red-500/10' : 'bg-slate-800' },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border border-slate-700/50 p-2.5 sm:p-3 ${s.bg}`}
            >
              <p className={`text-xl font-bold sm:text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lembretes..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map((f) => {
            const Icon = f.icon
            const count =
              f.key === 'all'       ? stats.total     :
              f.key === 'pending'   ? stats.pending   :
              f.key === 'today'     ? stats.today     :
              f.key === 'overdue'   ? stats.overdue   :
              stats.completed

            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  filter === f.key
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      filter === f.key ? 'bg-white/20' : 'bg-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-slate-400 font-medium mb-2">
              {search ? 'Nenhum resultado' : 'Nenhum lembrete aqui'}
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              {search
                ? 'Tente outros termos'
                : 'Clique em "Novo Lembrete" para começar'}
            </p>
            {!search && (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar primeiro lembrete
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onToggle={toggleComplete}
                onDelete={deleteReminder}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowInstallGuide(true)}
          className="mx-auto mt-6 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-900 hover:text-slate-300"
        >
          <Smartphone className="h-3.5 w-3.5 text-indigo-400" />
          Instalar como app
        </button>
      </main>

      {/* Modal */}
      {showForm && (
        <ReminderForm
          onAdd={handleFormAdd}
          onClose={handleCloseForm}
          initialData={editingReminder}
        />
      )}

      {showProfile && (
        <ProfilePanel
          userId={auth.user.id}
          email={auth.user.email}
          onClose={() => setShowProfile(false)}
          onSignOut={auth.signOut}
        />
      )}

      {showInstallGuide && <InstallGuide onClose={() => setShowInstallGuide(false)} />}
    </div>
  )
}
