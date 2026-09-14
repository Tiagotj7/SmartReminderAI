import { useState } from 'react'
import { Check, Trash2, Edit2, Clock, Tag, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Reminder, Priority, PriorityConfig } from '../types'

// ─── Configurações estáticas ─────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  high:   { label: 'Alta',  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-500' },
  medium: { label: 'Média', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  low:    { label: 'Baixa', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  dot: 'bg-green-500' },
}

const CATEGORY_EMOJIS: Record<string, string> = {
  geral: '📌', trabalho: '💼', saude: '❤️',
  financeiro: '💰', pessoal: '👤', estudo: '📚',
  familia: '👨‍👩‍👧', lazer: '🎮',
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function TimeLabel({ reminder }: { reminder: Reminder }) {
  const isOverdue = !reminder.completed && isPast(new Date(reminder.dateTime))
  const timeAgo = formatDistanceToNow(new Date(reminder.dateTime), { addSuffix: true, locale: ptBR })

  if (isOverdue) return (
    <span className="flex items-center gap-1 text-xs text-red-400">
      <AlertTriangle className="w-3 h-3" /> Vencido {timeAgo}
    </span>
  )

  if (reminder.completed) return (
    <span className="flex items-center gap-1 text-xs text-green-400">
      <CheckCircle2 className="w-3 h-3" /> Concluído
    </span>
  )

  return (
    <span className="flex items-center gap-1 text-xs text-slate-400">
      <Clock className="w-3 h-3" />
      {reminder.formattedDate}
      <span className="text-slate-600">({timeAgo})</span>
    </span>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

interface Props {
  reminder: Reminder
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit:   (reminder: Reminder) => void
}

export default function ReminderCard({ reminder, onToggle, onDelete, onEdit }: Props) {
  const [expanded,      setExpanded]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const priority      = PRIORITY_CONFIG[reminder.priority]
  const isOverdue     = !reminder.completed && isPast(new Date(reminder.dateTime))
  const categoryEmoji = CATEGORY_EMOJIS[reminder.category] ?? '📌'

  const cardClass = reminder.completed
    ? 'bg-slate-900/40 border-slate-800/60 opacity-55'
    : isOverdue
      ? 'bg-red-950/20 border-red-800/40 shadow-lg shadow-red-950/20'
      : 'bg-slate-900 border-slate-700/60 hover:border-slate-600 shadow-md hover:shadow-xl hover:shadow-black/30'

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(reminder.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div className={`card-reminder group relative rounded-2xl border transition-all duration-300 ${cardClass}`}>
      {!reminder.completed && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${priority.dot}`} />
      )}

      <div className="p-4 pl-5">
        {/* Linha principal */}
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={() => onToggle(reminder.id)}
            className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all
              ${reminder.completed
                ? 'bg-green-500 border-green-500'
                : 'border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/10'
              }`}
          >
            {reminder.completed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
          </button>

          {/* Título + prioridade */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-semibold text-base leading-tight ${reminder.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                {categoryEmoji} {reminder.title}
              </h3>
              <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${priority.bg} ${priority.border} ${priority.color}`}>
                {priority.label}
              </span>
            </div>
            <div className="mt-1.5">
              <TimeLabel reminder={reminder} />
            </div>
          </div>
        </div>

        {/* Descrição expansível */}
        {reminder.description && (
          <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-40 mt-3' : 'max-h-0'}`}>
            <p className="text-sm text-slate-400 pl-9 leading-relaxed">{reminder.description}</p>
          </div>
        )}

        {/* Rodapé: categoria + ações */}
        <div className="flex items-center justify-between mt-3 pl-9">
          <span className="text-xs text-slate-600 flex items-center gap-1">
            <Tag className="w-3 h-3" /> {reminder.category}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {reminder.description && (
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            <button onClick={() => onEdit(reminder)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              title={confirmDelete ? 'Clique para confirmar' : 'Excluir'}
              className={`p-1.5 rounded-lg transition-all ${confirmDelete ? 'bg-red-500/20 text-red-400 scale-110' : 'hover:bg-slate-800 text-slate-500 hover:text-red-400'}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
