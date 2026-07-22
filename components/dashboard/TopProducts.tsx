'use client'

import type { MetricsTopProduct } from '@/types'
import { formatUsd } from '@/lib/ventas/money'
import { PERIOD_LABELS, type PeriodKey } from '@/lib/dashboard/period'

type Props = {
  products: MetricsTopProduct[]
  period: PeriodKey
}

function displayName(p: MetricsTopProduct) {
  if (p.variantName) return `${p.productName} — ${p.variantName}`
  return p.productName
}

export function TopProducts({ products, period }: Props) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-900">Más vendido</p>
        <p className="mt-2 text-sm text-gray-500">
          Sin ventas en este período
        </p>
      </div>
    )
  }

  const [top, ...rest] = products
  const maxUnits = top.unitsSold || 1

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Más vendido ({PERIOD_LABELS[period].toLowerCase()})
      </p>
      <p className="mt-2 text-lg font-semibold text-gray-900">
        {displayName(top)}
      </p>
      <p className="mt-0.5 text-sm text-gray-500">
        {top.unitsSold} unidades · {formatUsd(top.revenueUsd)}
      </p>

      {rest.length > 0 && (
        <ul className="mt-4 space-y-2.5 border-t border-gray-100 pt-3">
          {rest.map((p) => {
            const pct = Math.max(4, Math.round((p.unitsSold / maxUnits) * 100))
            return (
              <li key={`${p.productId}-${p.variantId ?? 'none'}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-gray-800">
                    {displayName(p)}
                  </span>
                  <span className="shrink-0 text-gray-500">
                    {p.unitsSold} u · {formatUsd(p.revenueUsd)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-violet-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
