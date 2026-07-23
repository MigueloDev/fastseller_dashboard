'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { Payment } from '@/types'
import { useApi } from '@/hooks/useApi'
import {
  formatBs,
  formatUsd,
  PAYMENT_METHOD_META,
} from '@/lib/ventas/money'

type Props = {
  payments: Payment[]
}

export function PaymentTimeline({ payments }: Props) {
  const api = useApi()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  if (payments.length === 0) {
    return (
      <p className="text-sm text-gray-500">Sin abonos registrados.</p>
    )
  }

  async function openReceipt(paymentId: string) {
    setLoadingId(paymentId)
    try {
      const { url } = await api.getPaymentReceiptUrl(paymentId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo abrir el comprobante',
      )
    } finally {
      setLoadingId(null)
    }
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
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
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
              {p.hasReceipt && (
                <button
                  type="button"
                  className="font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
                  disabled={loadingId === p.id}
                  onClick={() => void openReceipt(p.id)}
                >
                  {loadingId === p.id ? 'Abriendo…' : 'Ver comprobante'}
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
