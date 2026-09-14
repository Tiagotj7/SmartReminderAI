import { useState } from 'react'
import { format, addHours } from 'date-fns'
import { Plus, X, Bell, Calendar, Tag, AlignLeft, AlertTriangle, Sparkles } from 'lucide-react'
import type { ReminderFormData, Category, Priority, Reminder } from '../types'

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

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ReminderFormData, string>> = {}
    if (!form.title.trim())   errs.title    = 'Título é obrigatório'
    if (!form.dateTime)       errs.dateTime = 'Data e hora são obrigatórias'
    else if (new Date(form.dateTime) <= new Date()) errs.dateTime = 'A data deve ser no futuro'
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
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialData ? 'Editar Lembrete' : 'Novo Lembrete'}
              </h2>
              <p className="text-xs text-slate-500">Preencha os detalhes abaixo</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70dvh] sm:max-h-none">

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

          {/* Categoria + Prioridade */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-1">
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
