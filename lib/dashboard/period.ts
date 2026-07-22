export type PeriodKey = 'hoy' | 'semana' | 'mes' | 'todo'

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoy: 'Hoy',
  semana: 'Semana',
  mes: 'Mes',
  todo: 'Todo',
}

/** Inicio del día local. */
function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Lunes de la semana local. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = (x.getDay() + 6) % 7 // 0 = lunes
  x.setDate(x.getDate() - day)
  return x
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Bounds locales del tab; null = Todo. */
export function localRange(
  key: PeriodKey,
  now = new Date()
): { from: Date; to: Date } | null {
  if (key === 'todo') return null
  const to = now
  if (key === 'hoy') return { from: startOfDay(now), to }
  if (key === 'semana') return { from: startOfWeek(now), to }
  return { from: startOfMonth(now), to }
}

/**
 * Traduce el tab a from/to ISO para GET /metrics/summary.
 * "todo" omite fechas.
 */
export function rangeForPeriod(
  key: PeriodKey,
  now = new Date()
): { from?: string; to?: string } {
  const r = localRange(key, now)
  if (!r) return {}
  return { from: r.from.toISOString(), to: r.to.toISOString() }
}

/** YYYY-MM-DD locales para rellenar el chart (evita desfase UTC). */
export function ymdRange(
  key: PeriodKey,
  now = new Date()
): { from?: string; to?: string } {
  const r = localRange(key, now)
  if (!r) return {}
  return { from: formatYmd(r.from), to: formatYmd(r.to) }
}
