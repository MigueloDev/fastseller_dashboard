'use client'

import type { Payment } from '@/types'
import {
  formatBs,
  formatUsd,
  PAYMENT_METHOD_META,
} from '@/lib/ventas/money'

type Props = {
  payments: Payment[]
}

export function PaymentTimeline({ payments }: Props) {
  if (payments.length === 0) {
    return (
      <p className="text-sm text-gray-500">Sin abonos registrados.</p>
    )
  }

  return (
    <ol className="space-y-3">
      {payments.map((p) => {
        const meta = PAYMENT_METHOD_META[p.method]
        return (
          <li
            key={p.id}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-gray-900">
                {meta?.label ?? p.method}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {p.currency === 'BS'
                  ? `${formatBs(p.amount)} (${formatUsd(p.amountUsd)})`
                  : formatUsd(p.amountUsd)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
              <span>
                {new Date(p.paidAt).toLocaleString('es', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
              {p.agentName && <span>{p.agentName}</span>}
              {p.rateUsed != null && (
                <span>
                  tasa {Number(p.rateUsed).toFixed(2)}
                  {p.rateSource ? ` (${p.rateSource})` : ''}
                </span>
              )}
              {p.note && <span className="italic">{p.note}</span>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
