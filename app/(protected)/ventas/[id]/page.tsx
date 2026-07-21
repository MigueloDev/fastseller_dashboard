'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import type { ExchangeRates, Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PaymentDialog } from '@/components/ventas/PaymentDialog'
import { PaymentTimeline } from '@/components/ventas/PaymentTimeline'
import {
  formatBs,
  formatUsd,
  rateAgeLabel,
} from '@/lib/ventas/money'

export default function VentaDetailPage() {
  const params = useParams<{ id: string }>()
  const api = useApi()
  const [sale, setSale] = useState<Sale | null>(null)
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [voiding, setVoiding] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        api.getSale(params.id),
        api.getRates().catch(() => null),
      ])
      setSale(s)
      setRates(r)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando venta')
    } finally {
      setLoading(false)
    }
  }, [api, params.id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleVoid() {
    if (!sale) return
    if (!confirm('¿Anular esta venta? Se devolverá el stock.')) return
    setVoiding(true)
    try {
      const updated = await api.voidSale(sale.id)
      setSale(updated)
      toast.success('Venta anulada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo anular')
    } finally {
      setVoiding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Cargando…
      </div>
    )
  }
  if (!sale) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Venta no encontrada.{' '}
        <Link href="/ventas" className="text-violet-700 underline">
          Volver
        </Link>
      </div>
    )
  }

  const canPay = sale.status === 'PENDIENTE'
  const canVoid = sale.status === 'PENDIENTE' && sale.payments.length === 0

  return (
    <div className="h-full overflow-auto">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <Link
          href="/ventas"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Ventas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {sale.customer?.name}
            </h1>
            <p className="text-xs text-gray-500">
              {new Date(sale.createdAt).toLocaleString('es')}
              {sale.agentName ? ` · ${sale.agentName}` : ''}
              {' · '}
              {sale.priceRef === 'REF_USD' ? 'Precio divisas' : 'Precio bolívares'}
            </p>
          </div>
          <Badge
            className={
              sale.status === 'PAGADA'
                ? 'bg-green-100 text-green-800'
                : sale.status === 'ANULADA'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-900'
            }
          >
            {sale.status}
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-center">
          <p className="text-sm text-gray-500">Saldo pendiente</p>
          <p className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 text-3xl font-semibold tabular-nums text-gray-900 sm:text-4xl">
            <span>{formatUsd(sale.balanceUsd)}</span>
            {sale.balanceBs != null && (
              <>
                <span className="font-normal text-gray-400">·</span>
                <span>{formatBs(sale.balanceBs)}</span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {sale.bsRate
              ? `tasa ${sale.bsRate.rate.toFixed(2)} · ${rateAgeLabel(sale.bsRate.fetchedAt)}`
              : 'Sin tasa BCV para equivalente en Bs'}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Total venta {formatUsd(sale.totalUsd)}
          </p>
        </div>

        {sale.paymentMismatch && (
          <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Venta a precio{' '}
              {sale.priceRef === 'REF_USD' ? 'divisas' : 'bolívares'} con pagos
              en la otra moneda. El sistema no reprecia; decide si renegocias.
            </span>
          </div>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-gray-700">Ítems</h2>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {sale.items.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {it.product?.name ?? it.productId}
                  </span>
                  {it.variant && (
                    <span className="text-gray-500"> · {it.variant.name}</span>
                  )}
                  <span className="ml-2 text-gray-400">×{it.quantity}</span>
                </div>
                <span className="tabular-nums text-gray-900">
                  {formatUsd(it.subtotalUsd)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-gray-700">Pagos</h2>
          <PaymentTimeline payments={sale.payments} />
        </section>

        <div className="flex flex-wrap gap-2">
          {canPay && (
            <Button onClick={() => setPayOpen(true)}>Registrar pago</Button>
          )}
          {canVoid && (
            <Button
              variant="outline"
              disabled={voiding}
              onClick={() => void handleVoid()}
              className="text-red-700"
            >
              {voiding ? 'Anulando…' : 'Anular venta'}
            </Button>
          )}
        </div>
      </div>

      <PaymentDialog
        open={payOpen}
        sale={sale}
        rates={rates}
        onOpenChange={setPayOpen}
        onSaved={setSale}
      />
    </div>
  )
}
