'use client'
import { useState, useMemo } from 'react'
import {
  Bell, Plus, Search,
  LayoutDashboard, CheckSquare, Clock,
  AlertCircle, Smartphone,
} from 'lucide-react'
import { useReminders } from './hooks/useReminders'
import ReminderForm from './components/ReminderForm'
import ReminderCard from './components/ReminderCard'
import PermissionBanner from './components/PermissionBanner'
import { notificationService } from './services/notificationService'
import type { FilterType, Category, FilterConfig, Reminder } from './types'

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
  } = useReminders(null)

  const [showForm, setShowForm]           = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [filter, setFilter]               = useState<FilterType>('all')
  const [category, setCategory]           = useState<Category | 'all'>('all')
  const [search, setSearch]               = useState('')
  const [testSent, setTestSent]           = useState(false)

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

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingReminder(null)
  }

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
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ══ ERRO DE CONEXÃO ══ */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-300 text-sm text-center px-4 py-2">
          ⚠️ {error}
        </div>
      )}

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-none">
                  Smart Reminders
                </h1>
                <p className="text-xs text-slate-500">
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
            <div className="flex items-center gap-2">
              {/* Status notificação */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800">
                <div
                  className={`w-2 h-2 rounded-full ${
                    permissionStatus === 'granted' ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span className="text-xs text-slate-400 hidden sm:block">
                  {permissionStatus === 'granted' ? 'Ativas' : 'Desativadas'}
                </span>
              </div>

              {/* Teste */}
              {permissionStatus === 'granted' && (
                <button
                  onClick={handleTestNotification}
                  className={`p-2 rounded-lg transition-all ${
                    testSent
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                  title="Enviar notificação de teste"
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/30"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Lembrete</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ══ MAIN ══ */}
      <main className="max-w-3xl mx-auto px-4 py-6">

        {/* Banner permissão */}
        <PermissionBanner
          status={permissionStatus}
          onRequest={requestPermission}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',     value: stats.total,     color: 'text-slate-300',                         bg: 'bg-slate-800' },
            { label: 'Pendentes', value: stats.pending,   color: 'text-blue-400',                          bg: 'bg-blue-500/10' },
            { label: 'Hoje',      value: stats.today,     color: 'text-indigo-400',                        bg: 'bg-indigo-500/10' },
            { label: 'Vencidos',  value: stats.overdue,   color: stats.overdue > 0 ? 'text-red-400' : 'text-slate-500', bg: stats.overdue > 0 ? 'bg-red-500/10' : 'bg-slate-800' },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border border-slate-700/50 p-3 ${s.bg}`}
            >
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
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

        {/* PWA Hint */}
        <div className="mt-8 p-4 rounded-2xl bg-slate-900 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">
                📱 Instale no celular como app!
              </p>
              <p className="text-xs text-slate-500">
                Chrome → Menu → "Adicionar à tela inicial"
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showForm && (
        <ReminderForm
          onAdd={handleFormAdd}
          onClose={handleCloseForm}
          initialData={editingReminder}
        />
      )}
    </div>
  )
}
