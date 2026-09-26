// ═══════════════════════════════════════════════════════
// TIPOS GLOBAIS DO PROJETO
// ═══════════════════════════════════════════════════════

export type Priority = 'low' | 'medium' | 'high'

export type Category =
  | 'geral'
  | 'trabalho'
  | 'saude'
  | 'financeiro'
  | 'pessoal'
  | 'estudo'
  | 'familia'
  | 'lazer'

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type FilterType = 'all' | 'pending' | 'today' | 'overdue' | 'completed'

export type PermissionStatus = 'granted' | 'denied' | 'default' | 'not-supported'

export type NotificationChannel = 'push' | 'email' | 'whatsapp' | 'telegram'

// ─────────────────────────────────────
// LEMBRETE
// ─────────────────────────────────────
export interface Reminder {
  id: string
  title: string
  description?: string
  dateTime: string
  formattedDate: string
  category: Category
  priority: Priority
  repeat: RepeatType
  channels: NotificationChannel[]
  completed: boolean
  createdAt: string
}

// ─────────────────────────────────────
// FORM DATA (sem campos gerados)
// ─────────────────────────────────────
export interface ReminderFormData {
  title: string
  description?: string
  dateTime: string
  category: Category
  priority: Priority
  repeat: RepeatType
  channels: NotificationChannel[]
}

// ─────────────────────────────────────
// STATS
// ─────────────────────────────────────
export interface ReminderStats {
  total: number
  pending: number
  completed: number
  overdue: number
  today: number
}

// ─────────────────────────────────────
// CONFIGURAÇÕES
// ─────────────────────────────────────
export interface PriorityConfig {
  label: string
  color: string
  bg: string
  border: string
  dot: string
}

export interface CategoryConfig {
  value: Category
  label: string
  color: string
}

export interface FilterConfig {
  key: FilterType
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// ─────────────────────────────────────
// PERMISSÃO
// ─────────────────────────────────────
export interface PermissionResult {
  granted: boolean
  reason?: string
}

// ─────────────────────────────────────
// SERVICE WORKER MESSAGE
// ─────────────────────────────────────
export interface SWMessage {
  type: 'SCHEDULE_NOTIFICATION'
  reminder: Reminder
  delay: number
}
