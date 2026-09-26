import { useState } from 'react'
import { format, addHours } from 'date-fns'
import { Plus, X, Bell, Calendar, Tag, AlignLeft, AlertTriangle, Sparkles } from 'lucide-react'
import type { ReminderFormData, Category, Priority, Reminder, NotificationChannel } from '../types'

// ─── Constantes ──────────────────────────────────────────────────────────────

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'geral',      label: '📌 Geral' },
  { value: 'trabalho',   label: '💼 Trabalho' },
  { value: 'saude',      label: '❤️ Saúde' },
  { value: 'financeiro', label: '💰 Financeiro' },
  { value: 'pessoal',    label: '👤 Pessoal' },
  { value: 'estudo',     label: '📚 Estudo' },
  { value: 'familia',    label: '👨‍👩‍👧 Família' },
  { value: 'lazer',      label: '🎮 Lazer' },
]

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low',    label: '🟢 Baixa' },
  { value: 'medium', label: '🟡 Média' },
  { value: 'high',   label: '🔴 Alta' },
]

const REPEATS: { value: ReminderFormData['repeat']; label: string }[] = [
  { value: 'none', label: 'Não repetir' },
  { value: 'daily', label: 'Todos os dias' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'monthly', label: 'Todo mês' },
  { value: 'yearly', label: 'Todo ano' },
]

const CHANNELS: { value: NotificationChannel; label: string; description: string }[] = [
  { value: 'push', label: 'Notificação web', description: 'No navegador ou dispositivo' },
  { value: 'email', label: 'E-mail', description: 'Enviado pelo backend' },
  { value: 'telegram', label: 'Telegram', description: 'Bot oficial do Telegram' },
  { value: 'whatsapp', label: 'WhatsApp', description: 'Somente abertura manual segura' },
]

const AI_SUGGESTIONS = [
  'Reunião com equipe', 'Consulta médica', 'Pagar conta de luz',
  'Ligar para cliente', 'Estudar para prova', 'Academia',
  'Aniversário da família', 'Prazo do projeto',
]

const DATE_FORMAT = "yyyy-MM-dd'T'HH:mm"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultDateTime() {
  return format(addHours(new Date(), 1), DATE_FORMAT)
}

function initForm(initial?: Reminder | null): ReminderFormData {
  return {
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    dateTime:    initial?.dateTime ? format(new Date(initial.dateTime), DATE_FORMAT) : defaultDateTime(),
    category:    initial?.category ?? 'geral',
    priority:    initial?.priority ?? 'medium',
    repeat:      initial?.repeat   ?? 'none',
    channels:    initial?.channels ?? ['push', 'telegram'],
  }
}

// ─── Sub-componente: mensagem de erro ────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5">
      <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {message}
    </p>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

interface Props {
  onAdd:        (data: ReminderFormData) => Promise<void>
  onClose:      () => void
  initialData?: Reminder | null
}

export default function ReminderForm({ onAdd, onClose, initialData }: Props) {
  const [form, setForm]           = useState<ReminderFormData>(() => initForm(initialData))
  const [errors, setErrors]       = useState<Partial<Record<keyof ReminderFormData, string>>>({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const setField = <K extends keyof ReminderFormData>(field: K, value: ReminderFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const toggleChannel = (channel: NotificationChannel) => {
    const channels = form.channels.includes(channel)
      ? form.channels.filter((item) => item !== channel)
      : [...form.channels, channel]
    setField('channels', channels)
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ReminderFormData, string>> = {}
    if (!form.title.trim())   errs.title    = 'Título é obrigatório'
    if (!form.dateTime)       errs.dateTime = 'Data e hora são obrigatórias'
    else if (new Date(form.dateTime) <= new Date()) errs.dateTime = 'A data deve ser no futuro'
    if (form.channels.length === 0) errs.channels = 'Selecione pelo menos um canal'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try { await onAdd(form); onClose() }
    finally { setSubmitting(false) }
  }

  const suggestions = form.title
    ? AI_SUGGESTIONS.filter((s) => s.toLowerCase().includes(form.title.toLowerCase()))
    : []

  return (
    <div className="modal-overlay sm:p-4">
      <div className="modal-content max-h-[92dvh] sm:max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/15 sm:h-10 sm:w-10">
              <Bell className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="truncate text-base font-bold text-white">
                {initialData ? 'Editar Lembrete' : 'Novo Lembrete'}
              </h2>
              <p className="text-xs text-slate-500">Preencha os detalhes abaixo</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost shrink-0" aria-label="Fechar formulário">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="max-h-[calc(92dvh-4.5rem)] space-y-5 overflow-y-auto p-4 sm:max-h-[calc(100dvh-7rem)] sm:p-6">

          {/* Título com sugestões */}
          <div className="relative">
            <label className="label">
              <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-indigo-400" /> Título *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => { setField('title', e.target.value); setShowSuggestions(true) }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Ex: Reunião com equipe, Consulta médica..."
              className={`input-base ${errors.title ? 'input-error' : ''}`}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1.5 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl animate-fade-in">
                {suggestions.map((s) => (
                  <button
                    key={s} type="button"
                    onMouseDown={() => setField('title', s)}
                    className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors flex items-center gap-2.5 border-b border-slate-700/50 last:border-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> {s}
                  </button>
                ))}
              </div>
            )}
            <FieldError message={errors.title} />
          </div>

          {/* Descrição */}
          <div>
            <label className="label">
              <AlignLeft className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
              Descrição <span className="text-slate-600 font-normal ml-1">(opcional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Adicione detalhes, observações..."
              rows={3}
              className="input-base resize-none"
            />
          </div>

          {/* Data e hora */}
          <div>
            <label className="label">
              <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" /> Data e Hora *
            </label>
            <input
              type="datetime-local"
              value={form.dateTime}
              onChange={(e) => setField('dateTime', e.target.value)}
              className={`input-base ${errors.dateTime ? 'input-error' : ''}`}
            />
            <FieldError message={errors.dateTime} />
          </div>

          {/* Categoria + Prioridade + Repetição */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">
                <Tag className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" /> Categoria
              </label>
              <select value={form.category} onChange={(e) => setField('category', e.target.value as Category)} className="input-base">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">⚡ Prioridade</label>
              <select value={form.priority} onChange={(e) => setField('priority', e.target.value as Priority)} className="input-base">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">↻ Repetição</label>
              <select value={form.repeat} onChange={(e) => setField('repeat', e.target.value as ReminderFormData['repeat'])} className="input-base">
                {REPEATS.map((repeat) => <option key={repeat.value} value={repeat.value}>{repeat.label}</option>)}
              </select>
            </div>
          </div>

          {form.repeat !== 'none' && (
            <p className="rounded-xl bg-indigo-500/10 px-3 py-2 text-xs leading-relaxed text-indigo-300">
              Este lembrete será avisado {REPEATS.find((repeat) => repeat.value === form.repeat)?.label.toLowerCase()} até você marcá-lo como concluído.
            </p>
          )}

          <div>
            <label className="label">Canais do lembrete</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {CHANNELS.map((channel) => {
                const selected = form.channels.includes(channel.value)
                return (
                  <button
                    key={channel.value}
                    type="button"
                    onClick={() => toggleChannel(channel.value)}
                    className={`rounded-xl border p-3 text-left transition-colors ${selected ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-white">
                      <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${selected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600 text-transparent'}`}>✓</span>
                      {channel.label}
                    </span>
                    <span className="mt-1 block pl-6 text-[11px] leading-relaxed text-slate-500">{channel.description}</span>
                  </button>
                )
              })}
            </div>
            <FieldError message={errors.channels} />
            {form.channels.includes('whatsapp') && (
              <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-300">
                O WhatsApp automático está desativado por segurança. O sistema não usa Meta, WhatsApp Web ou APIs não oficiais. Para envio automático, use Telegram ou e-mail.
              </p>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting
                ? <div className="spinner" />
                : <><Plus className="w-4 h-4" /> {initialData ? 'Salvar' : 'Criar Lembrete'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
