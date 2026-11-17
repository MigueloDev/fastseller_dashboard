import type { LayawaySchedule, Payment, SaleLayaway } from '@/types'
import { round2 } from '@/lib/ventas/money'

// Copia de backend/src/sales/layaway.js (layawaySchedule) para la vista previa del
// diálogo de pago. El backend es la fuente de verdad: mantener ambas en sync.

const TZ = 'America/Caracas'
const DAY_MS = 86_400_000
const TOLERANCE = 0.1

const dayKey = (d: string | number | Date) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ })
const addDays = (d: string | Date, n: number) => new Date(new Date(d).getTime() + n * DAY_MS)

type PaymentLike = Pick<Payment, 'amountUsd' | 'paidAt'> & Partial<Payment>

export function layawaySchedule({
  totalUsd,
  layaway,
  payments = [],
  now = new Date(),
}: {
  totalUsd: number
  layaway: Pick<SaleLayaway, 'startAt' | 'downPaymentUsd' | 'installments' | 'everyDays' | 'deadlineDays' | 'penaltyPct'>
  payments?: PaymentLike[]
  now?: Date
}): LayawaySchedule {
  const total = round2(totalUsd)
  const down = round2(layaway.downPaymentUsd)
  const n = Math.max(1, Math.trunc(layaway.installments))

  const rows = Array.from({ length: n + 1 }, (_, i) => {
    const dueAt = addDays(layaway.startAt, i * layaway.everyDays)
    return {
      label: i === 0 ? 'Inicial' : `Cuota ${i}`,
      dueAt: dueAt.toISOString(),
      dueDay: dayKey(dueAt),
      expectedUsd: 0,
      paidUsd: 0,
      status: 'PENDIENTE' as LayawaySchedule['rows'][number]['status'],
      payments: [] as PaymentLike[],
    }
  })

  const sorted = [...payments].sort((a, b) => +new Date(a.paidAt) - +new Date(b.paidAt))
  for (const p of sorted) {
    const day = dayKey(p.paidAt)
    const row = rows.find((r) => day <= r.dueDay) ?? rows[n]
    row.paidUsd = round2(row.paidUsd + p.amountUsd)
    row.payments.push(p)
  }

  const today = dayKey(now)
  const idx = rows.findIndex((r) => r.dueDay >= today)
  const firstOpen = Math.min(idx === -1 ? n : idx, n)

  let pool = total
  for (let i = 0; i < firstOpen; i++) {
    rows[i].expectedUsd = rows[i].paidUsd
    pool = round2(pool - rows[i].paidUsd)
  }
  for (let i = firstOpen; i <= n; i++) {
    const row = rows[i]
    if (i === n) {
      row.expectedUsd = round2(Math.max(pool, row.paidUsd))
      break
    }
    const share = i === 0 ? down : Math.floor(Math.round(pool * 100) / (n - i + 1)) / 100
    row.expectedUsd = round2(Math.max(share, row.paidUsd, 0))
    pool = round2(pool - row.expectedUsd)
  }

  const paidUsd = round2(rows.reduce((s, r) => s + r.paidUsd, 0))
  const remainingUsd = round2(Math.max(0, total - paidUsd))
  const deadlineAt = addDays(layaway.startAt, layaway.deadlineDays)
  const settled = remainingUsd <= TOLERANCE

  rows.forEach((r, i) => {
    const owed = round2(r.expectedUsd - r.paidUsd)
    r.status =
      owed <= TOLERANCE ? (r.expectedUsd > 0 || settled ? 'PAGADA' : 'SIN_PAGO')
      : r.paidUsd > 0 ? 'PARCIAL'
      : i < firstOpen ? 'SIN_PAGO'
      : 'PENDIENTE'
  })
  const nextIdx = settled ? -1 : rows.findIndex((r, i) => i >= firstOpen && r.expectedUsd - r.paidUsd > TOLERANCE)

  return {
    rows: rows.map((r) => ({
      label: r.label,
      dueAt: r.dueAt,
      expectedUsd: r.expectedUsd,
      paidUsd: r.paidUsd,
      status: r.status,
      payments: r.payments as Payment[],
    })),
    totalUsd: total,
    paidUsd,
    remainingUsd,
    deadlineAt: deadlineAt.toISOString(),
    overdue: !settled && today > dayKey(deadlineAt),
    penaltyUsd: round2((down * layaway.penaltyPct) / 100),
    next: nextIdx === -1 ? null : {
      index: nextIdx,
      label: rows[nextIdx].label,
      dueAt: rows[nextIdx].dueAt,
      amountUsd: round2(rows[nextIdx].expectedUsd - rows[nextIdx].paidUsd),
    },
  }
}
