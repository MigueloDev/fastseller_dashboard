'use client'

import type { MetricsDayPoint } from '@/types'
import { formatUsd } from '@/lib/ventas/money'
import { PERIOD_LABELS, type PeriodKey } from '@/lib/dashboard/period'
import { cn } from '@/lib/utils'
import { PeriodDelta } from '@/components/dashboard/PeriodDelta'

type Props = {
  points: MetricsDayPoint[]
  period: PeriodKey
  from?: string
  to?: string
  totalUsd: number
  count: number
  collectedUsd: number
  previousUsd: number | null
  refUsd: number
  refBs: number
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

function shortDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function SalesChart({
  points,
  period,
  from,
  to,
  totalUsd,
  count,
  collectedUsd,
  previousUsd,
  refUsd,
  refBs,
}: Props) {
  const filled = period === 'todo' ? fillDays(points) : fillDays(points, from, to)
  const series = period === 'todo' ? maybeBucketWeeks(filled) : filled
  const max = Math.max(...series.map((p) => p.totalUsd), 0)

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Vendido
        </p>
        <p className="text-xs text-gray-400">{PERIOD_LABELS[period]}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="tabular-nums text-4xl font-semibold tracking-tight text-gray-900">
          {formatUsd(totalUsd)}
        </p>
        <PeriodDelta current={totalUsd} previous={previousUsd} />
      </div>

      {series.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">Sin ventas en este período</p>
      ) : (
        <>
          <div className="mt-5 flex h-24 items-end gap-1.5">
            {series.map((p, i) => {
              const last = i === series.length - 1
              const pct = max <= 0 || p.totalUsd <= 0 ? 0 : (p.totalUsd / max) * 100
              const h = p.totalUsd <= 0 ? 6 : Math.max(12, pct)
              return (
                <div
                  key={p.date}
                  title={`${p.date}: ${formatUsd(p.totalUsd)}`}
                  className="flex h-full min-w-0 flex-1 items-end justify-center"
                >
                  <div
                    className={cn(
                      'w-full max-w-8 rounded-[4px]',
                      p.totalUsd <= 0
                        ? 'bg-gray-200'
                        : last
                          ? 'bg-violet-500'
                          : 'bg-violet-800'
                    )}
                    style={{ height: `${h}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-gray-400">
            <span>{shortDate(series[0].date)}</span>
            <span>{shortDate(series[series.length - 1].date)}</span>
          </div>
        </>
      )}

      <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 border-t border-gray-100 pt-3 text-sm text-gray-500">
        <p>
          Ventas{' '}
          <span className="font-medium tabular-nums text-gray-900">{count}</span>
        </p>
        <p>
          Cobrado{' '}
          <span className="font-medium tabular-nums text-gray-900">
            {formatUsd(collectedUsd)}
          </span>
        </p>
        <p>
          Divisas{' '}
          <span className="font-medium tabular-nums text-gray-900">
            {formatUsd(refUsd)}
          </span>
          {' · '}Bs{' '}
          <span className="font-medium tabular-nums text-gray-900">
            {formatUsd(refBs)}
          </span>
        </p>
      </div>
    </div>
  )
}
