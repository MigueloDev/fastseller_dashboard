'use client'

import type { PriceRef } from '@/types'
import { formatBs, formatUsd } from '@/lib/ventas/money'
import { cn } from '@/lib/utils'

type Props = {
  priceRef: PriceRef
  totalUsd: number
  totalBs: number
  equivBsUsd: number | null
  equivBsRef: number | null
  rateLabel: string | null
  onChange: (ref: PriceRef) => void
}

function DualAmount({
  usd,
  bs,
}: {
  usd: number
  bs: number | null
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-lg font-semibold tabular-nums text-gray-900">
      <span>{formatUsd(usd)}</span>
      {bs != null && (
        <>
          <span className="font-normal text-gray-400">·</span>
          <span>{formatBs(bs)}</span>
        </>
      )}
    </div>
  )
}

export function PriceModeSelector({
  priceRef,
  totalUsd,
  totalBs,
  equivBsUsd,
  equivBsRef,
  rateLabel,
  onChange,
}: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Precio de la venta</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange('REF_USD')}
          className={cn(
            'rounded-lg border px-4 py-3 text-left transition-colors',
            priceRef === 'REF_USD'
              ? 'border-violet-600 bg-violet-50 ring-1 ring-violet-600'
              : 'border-gray-200 bg-white hover:border-gray-300',
          )}
        >
          <DualAmount usd={totalUsd} bs={equivBsUsd} />
          <div className="text-sm text-gray-600">
            Divisas (efectivo USD / Zelle / USDT)
          </div>
          {priceRef === 'REF_USD' && rateLabel && (
            <div className="text-xs text-gray-500">{rateLabel}</div>
          )}
        </button>
        <button
          type="button"
          onClick={() => onChange('REF_BS')}
          className={cn(
            'rounded-lg border px-4 py-3 text-left transition-colors',
            priceRef === 'REF_BS'
              ? 'border-violet-600 bg-violet-50 ring-1 ring-violet-600'
              : 'border-gray-200 bg-white hover:border-gray-300',
          )}
        >
          <DualAmount usd={totalBs} bs={equivBsRef} />
          <div className="text-sm text-gray-600">Bolívares (a tasa BCV)</div>
          {priceRef === 'REF_BS' && rateLabel && (
            <div className="text-xs text-gray-500">{rateLabel}</div>
          )}
        </button>
      </div>
    </div>
  )
}
