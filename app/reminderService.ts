import { supabase } from '../lib/supabase'
import { resolveCategoryId } from './categoryService'
import type { Reminder, ReminderFormData } from '../types'

// ─── Helpers ────────────────────────────────────────────────────────────────

const REMINDER_SELECT = `
  *,
  category:categories(id, name, slug, emoji, color),
  tags:reminder_tags(tag:tags(id, name, color))
` as const

function mapToReminder(row: Record<string, unknown>): Reminder {
  return {
    id:            row.id as string,
    title:         row.title as string,
    description:   row.description as string | undefined,
    dateTime:      row.date_time as string,
    formattedDate: new Date(row.date_time as string).toLocaleString('pt-BR'),
    priority:      (row.priority as string).toLowerCase() as Reminder['priority'],
    repeat:        (row.repeat as string).toLowerCase() as Reminder['repeat'],
    category:      ((row.category as { slug: string } | null)?.slug ?? 'geral') as Reminder['category'],
    completed:     row.completed as boolean,
    createdAt:     row.created_at as string,
  }
}

function requireUserId(userId: string | undefined | null): asserts userId is string {
  if (!userId) throw new Error('userId é obrigatório')
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function fetchReminders(userId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select(REMINDER_SELECT)
    .eq('user_id', userId)
    .order('date_time', { ascending: true })

  if (error) throw new Error(error.message)
  return data.map(mapToReminder)
}

export async function fetchReminderById(id: string, userId: string): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .select(REMINDER_SELECT)
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) throw new Error(error.message)
  return mapToReminder(data)
}

export async function createReminder(userId: string, data: ReminderFormData): Promise<Reminder> {
  requireUserId(userId)
  const categoryId = await resolveCategoryId(data.category)

  const { data: created, error } = await supabase
    .from('reminders')
    .insert({
      user_id:     userId,
      title:       data.title,
      description: data.description,
      date_time:   data.dateTime,
      priority:    data.priority.toUpperCase(),
      repeat:      data.repeat.toUpperCase(),
      category_id: categoryId,
    })
    .select(REMINDER_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return mapToReminder(created)
}

export async function updateReminder(
  id: string,
  userId: string,
  data: Partial<ReminderFormData>
): Promise<Reminder> {
  requireUserId(userId)
  const categoryId = data.category !== undefined
    ? await resolveCategoryId(data.category)
    : undefined

  const patch = {
    ...(data.title                       && { title:       data.title }),
    ...(data.description !== undefined   && { description: data.description }),
    ...(data.dateTime                    && { date_time:   data.dateTime }),
    ...(data.priority                    && { priority:    data.priority.toUpperCase() }),
    ...(data.repeat                      && { repeat:      data.repeat.toUpperCase() }),
    ...(categoryId !== undefined         && { category_id: categoryId }),
  }

  const { data: updated, error } = await supabase
    .from('reminders')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select(REMINDER_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return mapToReminder(updated)
}

export async function toggleReminderComplete(
  id: string,
  userId: string,
  completed: boolean
): Promise<void> {
  requireUserId(userId)

  const { error } = await supabase
    .from('reminders')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function deleteReminder(id: string, userId: string): Promise<void> {
  requireUserId(userId)

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function fetchFilteredReminders(
  userId: string,
  filters: {
    completed?: boolean
    priority?:  string
    category?:  string
    search?:    string
    dateFrom?:  string
    dateTo?:    string
  }
): Promise<Reminder[]> {
  let query = supabase
    .from('reminders')
    .select(REMINDER_SELECT)
    .eq('user_id', userId)

  if (filters.completed !== undefined) query = query.eq('completed',   filters.completed)
  if (filters.priority)                query = query.eq('priority',    filters.priority.toUpperCase())
  if (filters.category)                query = query.eq('category_id', filters.category)
  if (filters.search)                  query = query.ilike('title',    `%${filters.search}%`)
  if (filters.dateFrom)                query = query.gte('date_time',  filters.dateFrom)
  if (filters.dateTo)                  query = query.lte('date_time',  filters.dateTo)

  const { data, error } = await query.order('date_time', { ascending: true })
  if (error) throw new Error(error.message)
  return data.map(mapToReminder)
}

// ─── Realtime ───────────────────────────────────────────────────────────────

export function subscribeToReminders(
  userId: string,
  onUpdate: (reminder: Reminder) => void,
  onDelete: (id: string) => void
): () => void {
  const channel = supabase
    .channel('reminders-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reminders', filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          onDelete(payload.old.id as string)
        } else {
          onUpdate(mapToReminder(payload.new))
        }
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
