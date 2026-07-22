'use client'

import type { MetricsDayPoint } from '@/types'
import { formatUsd } from '@/lib/ventas/money'
import type { PeriodKey } from '@/lib/dashboard/period'

type Props = {
  points: MetricsDayPoint[]
  period: PeriodKey
  from?: string
  to?: string
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Rellena días vacíos con 0 entre from..to (o min..max de points). */
function fillDays(
  points: MetricsDayPoint[],
  fromIso?: string,
  toIso?: string
): MetricsDayPoint[] {
  const map = new Map(points.map((p) => [p.date, p.totalUsd]))
  let start: Date
  let end: Date

  if (fromIso && toIso) {
    start = parseYmd(fromIso.slice(0, 10))
    end = parseYmd(toIso.slice(0, 10))
  } else if (points.length === 0) {
    return []
  } else {
    const dates = points.map((p) => p.date).sort()
    start = parseYmd(dates[0])
    end = parseYmd(dates[dates.length - 1])
  }

  const out: MetricsDayPoint[] = []
  const cur = new Date(start)
  while (cur <= end) {
    const key = formatYmd(cur)
    out.push({ date: key, totalUsd: map.get(key) ?? 0 })
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/** Agrupa por semana (lunes) si hay demasiados puntos. */
function maybeBucketWeeks(days: MetricsDayPoint[]): MetricsDayPoint[] {
  if (days.length <= 45) return days
  const buckets = new Map<string, number>()
  for (const d of days) {
    const dt = parseYmd(d.date)
    const day = (dt.getDay() + 6) % 7
    dt.setDate(dt.getDate() - day)
    const key = formatYmd(dt)
    buckets.set(key, (buckets.get(key) ?? 0) + d.totalUsd)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totalUsd]) => ({ date, totalUsd }))
}

export function SalesChart({ points, period, from, to }: Props) {
  const filled =
    period === 'todo'
      ? fillDays(points)
      : fillDays(points, from, to)
  const series = period === 'todo' ? maybeBucketWeeks(filled) : filled
  const isWeekly = period === 'todo' && series.length < filled.length

  if (series.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-900">Ventas por día</p>
        <p className="mt-2 text-sm text-gray-500">Sin datos en este período</p>
      </div>
    )
  }

  const max = Math.max(...series.map((p) => p.totalUsd), 0.01)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">
        {isWeekly ? 'Ventas por semana' : 'Ventas por día'}
      </p>
      <div className="mt-4 flex h-36 items-end gap-0.5 sm:gap-1">
        {series.map((p) => {
          const h = Math.max(2, Math.round((p.totalUsd / max) * 100))
          return (
            <div
              key={p.date}
              title={`${p.date}: ${formatUsd(p.totalUsd)}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
            >
              <div
                className="w-full max-w-[28px] rounded-t bg-violet-400 hover:bg-violet-500"
                style={{ height: `${h}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        <span>{series[0].date}</span>
        <span>{series[series.length - 1].date}</span>
      </div>
    </div>
  )
}
