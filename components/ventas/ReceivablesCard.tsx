'use client'

import Link from 'next/link'
import type { ReceivablesResponse } from '@/types'
import { balanceLabel, formatBs, formatUsd } from '@/lib/ventas/money'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  data: ReceivablesResponse | null
  loading?: boolean
}

export function ReceivablesCard({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-6 w-56" />
      </div>
    )
  }
  if (!data || data.customers.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-lg font-medium text-gray-900">Cuentas por cobrar</p>
        <p className="mt-1 text-sm text-gray-500">Sin saldos pendientes.</p>
      </div>
    )
  }

  const top = data.customers.slice(0, 5)

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-medium text-gray-900">Cuentas por cobrar</p>
        <p className="tabular-nums text-lg font-semibold text-amber-800">
          {formatUsd(data.totalOwedUsd)}
          {data.totalOwedBs != null && data.bsRate && (
            <span className="ml-2 text-sm font-normal">
              ≈ {formatBs(data.totalOwedBs)}
            </span>
          )}
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {top.map((g) => (
          <li
            key={g.customer.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <div className="min-w-0">
              <span className="font-medium text-gray-900">{g.customer.name}</span>
              <span className="ml-2 text-xs text-gray-500">
                {g.sales.length} venta{g.sales.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="shrink-0 text-right tabular-nums text-sm text-amber-800">
              {balanceLabel(g.totalOwedUsd, g.totalOwedBs, data.bsRate)}
            </div>
          </li>
        ))}
      </ul>
      {top[0]?.sales[0] && (
        <Link
          href={`/ventas/${top[0].sales[0].id}`}
          className="mt-3 inline-block text-xs font-medium text-violet-700 hover:underline"
        >
          Ver deuda más antigua →
        </Link>
      )}
    </div>
  )
}
