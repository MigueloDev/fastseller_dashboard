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
