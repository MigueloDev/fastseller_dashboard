'use client'

import type { MetricsTopProduct } from '@/types'
import { formatUsd } from '@/lib/ventas/money'
import { PERIOD_LABELS, type PeriodKey } from '@/lib/dashboard/period'
import { cn } from '@/lib/utils'

type Props = {
  products: MetricsTopProduct[]
  period: PeriodKey
}

function displayName(p: MetricsTopProduct) {
  if (p.variantName) return `${p.productName} — ${p.variantName}`
  return p.productName
}

function ProfitFigure({
  value,
  size = 'sm',
}: {
  value: number | null
  size?: 'sm' | 'lg'
}) {
  if (value == null) {
    return <span className="text-sm text-gray-400">Sin costo</span>
  }
  return (
    <span
      className={cn(
        'tabular-nums font-semibold',
        size === 'lg' ? 'text-lg' : 'text-sm',
        value < 0 ? 'text-red-600' : 'text-gray-900'
      )}
    >
      {formatUsd(value)}
    </span>
  )
}

export function TopProducts({ products, period }: Props) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-lg font-medium text-gray-900">Más vendidos</p>
        <p className="mt-2 text-sm text-gray-500">Sin ventas en este período</p>
      </div>
    )
  }

  const [top, ...rest] = products
  const maxUnits = top.unitsSold || 1

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-lg font-medium text-gray-900">
        Más vendidos ({PERIOD_LABELS[period].toLowerCase()})
      </p>
      <p className="mt-0.5 text-xs text-gray-400">
        Ordenados por unidades. La ganancia es precio − costo de la línea.
      </p>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-gray-900">
            {displayName(top)}
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            {top.unitsSold} unidades ·{' '}
            <span className="tabular-nums">{formatUsd(top.revenueUsd)}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Ganancia
          </p>
          <ProfitFigure value={top.profitUsd ?? null} size="lg" />
        </div>
      </div>

      {rest.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-gray-100 pt-3">
          {rest.map((p) => {
            const pct = Math.max(4, Math.round((p.unitsSold / maxUnits) * 100))
            return (
              <li key={`${p.productId}-${p.variantId ?? 'none'}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-gray-800">
                    {displayName(p)}
                  </span>
                  <span className="shrink-0 text-right">
                    <ProfitFigure value={p.profitUsd ?? null} />
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-violet-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {p.unitsSold} u ·{' '}
                    <span className="tabular-nums">{formatUsd(p.revenueUsd)}</span>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
