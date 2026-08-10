export function formatPhone(jid: string): string {
  const clean = jid
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@lid', '')

  if (clean.length >= 10) {
    const digits = clean.replace(/\D/g, '')
    if (digits.length === 11) {
      return `+${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5, 8)}-${digits.slice(8)}`
    }
    return `+${digits}`
  }
  return clean
}

export function formatTime(date: string | null): string {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  if (isYesterday) return 'Ayer'
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function formatMessageTime(date: string): string {
  return new Date(date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

const VE_TZ = 'America/Caracas'

const veDate = new Intl.DateTimeFormat('es-VE', {
  timeZone: VE_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const veDateTime = new Intl.DateTimeFormat('es-VE', {
  timeZone: VE_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** dd/MM/yyyy en America/Caracas (convención CLAUDE.md) */
export function formatDate(date: string | Date): string {
  return veDate.format(new Date(date))
}

/** dd/MM/yyyy, HH:mm (24h) en America/Caracas */
export function formatDateTime(date: string | Date): string {
  return veDateTime.format(new Date(date))
}
