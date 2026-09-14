import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { isPast, isToday } from 'date-fns'
import { getOrCreateUserId } from '../lib/supabase'
import { notificationService } from '../services/notificationService'
import {
  fetchReminders,
  createReminder as createReminderApi,
  updateReminder as updateReminderApi,
  toggleReminderComplete as toggleReminderCompleteApi,
  deleteReminder as deleteReminderApi,
  subscribeToReminders,
} from '../services/reminderService'
import type {
  Reminder, ReminderFormData, FilterType,
  Category, PermissionStatus, PermissionResult, ReminderStats,
} from '../types'

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface UseRemindersReturn {
  reminders:         Reminder[]
  loading:           boolean
  error:             string | null
  permissionStatus:  PermissionStatus
  stats:             ReminderStats
  requestPermission: () => Promise<PermissionResult>
  addReminder:       (data: ReminderFormData) => Promise<Reminder>
  editReminder:      (id: string, updates: Partial<ReminderFormData>) => Promise<void>
  toggleComplete:    (id: string) => Promise<void>
  deleteReminder:    (id: string) => Promise<void>
  getFiltered:       (filter: FilterType, category: Category | 'all', search: string) => Reminder[]
  sendTestNotification: () => Promise<void>
}

// ─── Helpers puros (fora do hook para não recriar a cada render) ─────────────

function syncNotification(reminder: Reminder): void {
  if (reminder.completed) {
    notificationService.cancelNotification(reminder.id)
  } else if (Notification.permission === 'granted') {
    notificationService.scheduleNotification(reminder)
  }
}

function upsertReminder(list: Reminder[], reminder: Reminder): Reminder[] {
  const exists = list.some((r) => r.id === reminder.id)
  const next = exists
    ? list.map((r) => (r.id === reminder.id ? reminder : r))
    : [reminder, ...list]
  return next.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
}

function matchesFilter(r: Reminder, filter: FilterType): boolean {
  if (filter === 'all')       return true
  if (filter === 'pending')   return !r.completed
  if (filter === 'completed') return r.completed
  if (filter === 'today')     return isToday(new Date(r.dateTime))
  if (filter === 'overdue')   return !r.completed && isPast(new Date(r.dateTime))
  return true
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useReminders(): UseRemindersReturn {
  const [reminders, setReminders]             = useState<Reminder[]>([])
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('default')
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState<string | null>(null)
  const userIdRef                             = useRef<string | null>(null)

  // Guard reutilizável: garante que a sessão está pronta antes de mutações
  const requireUser = useCallback((): string => {
    const userId = userIdRef.current
    if (!userId) throw new Error('Sessão ainda não está pronta')
    return userId
  }, [])

  // ─── Init: sessão anônima + fetch + realtime ─────────────────────────────
  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    async function init() {
      try {
        const userId = await getOrCreateUserId()
        if (cancelled) return
        userIdRef.current = userId

        const data = await fetchReminders(userId)
        if (cancelled) return

        setReminders(data)
        setTimeout(() => notificationService.rescheduleAll(data), 1000)

        unsubscribe = subscribeToReminders(
          userId,
          (updated) => setReminders((prev) => upsertReminder(prev, updated)),
          (deletedId) => {
            notificationService.cancelNotification(deletedId)
            setReminders((prev) => prev.filter((r) => r.id !== deletedId))
          }
        )
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar lembretes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()
    setPermissionStatus(notificationService.getPermissionStatus())
    return () => { cancelled = true; unsubscribe?.() }
  }, [])

  // ─── Ações ──────────────────────────────────────────────────────────────

  const requestPermission = useCallback(async (): Promise<PermissionResult> => {
    const result = await notificationService.requestPermission()
    setPermissionStatus(notificationService.getPermissionStatus())
    return result
  }, [])

  const addReminder = useCallback(async (data: ReminderFormData): Promise<Reminder> => {
    const created = await createReminderApi(requireUser(), data)
    setReminders((prev) => upsertReminder(prev, created))
    syncNotification(created)
    return created
  }, [requireUser])

  const editReminder = useCallback(async (id: string, updates: Partial<ReminderFormData>): Promise<void> => {
    const updated = await updateReminderApi(id, requireUser(), updates)
    setReminders((prev) => upsertReminder(prev, updated))
    syncNotification(updated)
  }, [requireUser])

  const toggleComplete = useCallback(async (id: string): Promise<void> => {
    const userId = requireUser()
    const current = reminders.find((r) => r.id === id)
    if (!current) return
    const completed = !current.completed
    await toggleReminderCompleteApi(id, userId, completed)
    const updated = { ...current, completed }
    setReminders((prev) => upsertReminder(prev, updated))
    syncNotification(updated)
  }, [reminders, requireUser])

  const deleteReminder = useCallback(async (id: string): Promise<void> => {
    notificationService.cancelNotification(id)
    await deleteReminderApi(id, requireUser())
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }, [requireUser])

  // ─── Derivados ──────────────────────────────────────────────────────────

  const getFiltered = useCallback(
    (filter: FilterType, category: Category | 'all', search: string): Reminder[] => {
      const q = search.toLowerCase()
      return reminders.filter((r) =>
        matchesFilter(r, filter) &&
        (category === 'all' || r.category === category) &&
        (!q || r.title.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q))
      )
    },
    [reminders]
  )

  const stats = useMemo<ReminderStats>(() => {
    const now = new Date()
    return {
      total:     reminders.length,
      pending:   reminders.filter((r) => !r.completed).length,
      completed: reminders.filter((r) => r.completed).length,
      overdue:   reminders.filter((r) => !r.completed && new Date(r.dateTime) < now).length,
      today:     reminders.filter((r) => isToday(new Date(r.dateTime))).length,
    }
  }, [reminders])

  return {
    reminders, loading, error, permissionStatus, stats,
    requestPermission, addReminder, editReminder,
    toggleComplete, deleteReminder, getFiltered,
    sendTestNotification: notificationService.sendTestNotification.bind(notificationService),
  }
}
