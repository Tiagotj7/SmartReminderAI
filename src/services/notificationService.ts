import type { Reminder, PermissionResult, PermissionStatus, RepeatType } from '../types'

// ═══════════════════════════════════════════════════════
// SERVIÇO DE NOTIFICAÇÕES
// ═══════════════════════════════════════════════════════
// setTimeout armazena o delay num inteiro de 32 bits assinado.
// Qualquer valor acima disso estoura e dispara quase na hora.
const MAX_TIMEOUT_DELAY = 2_147_483_647 // ~24.8 dias

function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

function buildWhatsAppUrl(phone: string | null, reminder: Reminder): string | null {
  if (!phone) return null
  const normalizedPhone = normalizeWhatsAppPhone(phone)
  if (normalizedPhone.length < 10) return null

  const message = [
    `🔔 Lembrete: ${reminder.title}`,
    `⏰ Horário: ${reminder.formattedDate}`,
    reminder.description ? `📝 ${reminder.description}` : '',
  ].filter(Boolean).join('\n')

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null
  private scheduledTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor() {}

  // ─────────────────────────────────────
  // INICIALIZAR SERVICE WORKER
  // ─────────────────────────────────────
  async init(): Promise<void> {
    if (!('serviceWorker' in navigator)) return

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js')
      console.log('✅ Service Worker registrado!')
    } catch (error) {
      console.error('❌ Erro ao registrar SW:', error)
    }
  }

  // ─────────────────────────────────────
  // SOLICITAR PERMISSÃO
  // ─────────────────────────────────────
  async requestPermission(): Promise<PermissionResult> {
    if (!('Notification' in window)) {
      return { granted: false, reason: 'browser-not-supported' }
    }

    if (Notification.permission === 'granted') {
      return { granted: true }
    }

    if (Notification.permission === 'denied') {
      return { granted: false, reason: 'denied' }
    }

    const permission = await Notification.requestPermission()
    return {
      granted: permission === 'granted',
      reason: permission,
    }
  }

  // ─────────────────────────────────────
  // STATUS DA PERMISSÃO
  // ─────────────────────────────────────
  getPermissionStatus(): PermissionStatus {
    if (!('Notification' in window)) return 'not-supported'
    return Notification.permission as PermissionStatus
  }

  // ─────────────────────────────────────
  // AGENDAR NOTIFICAÇÃO
  // ─────────────────────────────────────
  scheduleNotification(reminder: Reminder, whatsappPhone: string | null = null): boolean {
    const now = Date.now()
    const reminderTime = new Date(reminder.dateTime).getTime()
    const delay = reminderTime - now

    if (delay <= 0) {
      console.warn('⚠️ Data no passado, não agendado')
      return false
    }

    this.cancelNotification(reminder.id)

    // O Service Worker é usado apenas para exibir a notificação.
    // O agendamento fica neste serviço para evitar notificações duplicadas.
    this.scheduleChunked(reminder, delay, whatsappPhone)

    console.log(
      `📅 Agendado: "${reminder.title}" em ${Math.round(delay / 60000)} min`
    )
    return true
  }

  // ─────────────────────────────────────
  // AGENDAR EM PEDAÇOS (evita overflow do setTimeout)
  // ─────────────────────────────────────
  private scheduleChunked(reminder: Reminder, remainingDelay: number, whatsappPhone: string | null): void {
    if (remainingDelay > MAX_TIMEOUT_DELAY) {
      const timerId = setTimeout(() => {
        // Ainda falta tempo: apenas encadeia o próximo pedaço,
        // recalculando a partir do horário real do lembrete (evita drift).
        const newRemaining =
          new Date(reminder.dateTime).getTime() - Date.now()
        this.scheduleChunked(reminder, newRemaining, whatsappPhone)
      }, MAX_TIMEOUT_DELAY)
      this.scheduledTimers.set(reminder.id, timerId)
      return
    }

    if (remainingDelay <= 0) {
      void this.showNotification(reminder, whatsappPhone)
      this.scheduledTimers.delete(reminder.id)
      return
    }

    const timerId = setTimeout(() => {
      void this.showNotification(reminder, whatsappPhone)
      this.scheduledTimers.delete(reminder.id)
      this.scheduleNextOccurrence(reminder, whatsappPhone)
    }, remainingDelay)

    this.scheduledTimers.set(reminder.id, timerId)
  }

  private scheduleNextOccurrence(reminder: Reminder, whatsappPhone: string | null): void {
    if (reminder.repeat === 'none' || reminder.completed) return

    const nextDate = this.getNextOccurrence(new Date(reminder.dateTime), reminder.repeat)
    this.scheduleNotification({
      ...reminder,
      dateTime: nextDate.toISOString(),
      formattedDate: nextDate.toLocaleString('pt-BR'),
    }, whatsappPhone)
  }

  private getNextOccurrence(date: Date, repeat: RepeatType): Date {
    const next = new Date(date)
    if (repeat === 'daily') next.setDate(next.getDate() + 1)
    if (repeat === 'weekly') next.setDate(next.getDate() + 7)
    if (repeat === 'monthly') next.setMonth(next.getMonth() + 1)
    if (repeat === 'yearly') next.setFullYear(next.getFullYear() + 1)
    return next
  }

  // ─────────────────────────────────────
  // MOSTRAR NOTIFICAÇÃO
  // ─────────────────────────────────────
  async showNotification(reminder: Reminder, whatsappPhone: string | null = null): Promise<void> {
    if (Notification.permission !== 'granted') return

    // vibrate não está no tipo padrão do TS, usamos cast
    const options = {
      body: `${reminder.description ?? 'Sem descrição'}\n📅 ${reminder.formattedDate}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      tag: `reminder-${reminder.id}`,
      silent: false,
      data: {
        whatsappUrl: buildWhatsAppUrl(whatsappPhone, reminder),
        url: '/',
      },
    } as NotificationOptions

    try {
      if (this.swRegistration) {
        await this.swRegistration.showNotification(
          `🔔 ${reminder.title}`,
          options
        )
      } else {
        const notification = new Notification(`🔔 ${reminder.title}`, options)
        const whatsappUrl = buildWhatsAppUrl(whatsappPhone, reminder)
        if (whatsappUrl) {
          notification.onclick = () => {
            notification.close()
            window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
          }
        }
      }
    } catch {
      new Notification(`🔔 ${reminder.title}`, {
        body: reminder.description ?? '',
      })
    }
  }

  // ─────────────────────────────────────
  // CANCELAR NOTIFICAÇÃO
  // ─────────────────────────────────────
  cancelNotification(reminderId: string): boolean {
    const timerId = this.scheduledTimers.get(reminderId)
    if (timerId !== undefined) {
      clearTimeout(timerId)
      this.scheduledTimers.delete(reminderId)
      return true
    }
    return false
  }

  // ─────────────────────────────────────
  // REAGENDAR TODOS
  // ─────────────────────────────────────
  rescheduleAll(reminders: Reminder[], whatsappPhone: string | null = null): number {
    let count = 0
    reminders.forEach((r) => {
      if (!r.completed && new Date(r.dateTime) > new Date()) {
        if (this.scheduleNotification(r, whatsappPhone)) count++
      }
    })
    console.log(`🔄 ${count} lembretes reagendados`)
    return count
  }

  // ─────────────────────────────────────
  // NOTIFICAÇÃO DE TESTE
  // ─────────────────────────────────────
  async sendTestNotification(): Promise<void> {
    await this.showNotification({
      id: 'test',
      title: 'Teste de Notificação! 🎉',
      description: 'As notificações estão funcionando!',
      formattedDate: new Date().toLocaleString('pt-BR'),
      dateTime: new Date().toISOString(),
      category: 'geral',
      priority: 'medium',
      repeat: 'none',
      channels: ['push'],
      completed: false,
      createdAt: new Date().toISOString(),
    })
  }
}

export const notificationService = new NotificationService()
