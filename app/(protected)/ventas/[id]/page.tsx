'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import type { ExchangeRateRow, ExchangeRates, Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button, buttonVariants } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PaymentDialog } from '@/components/ventas/PaymentDialog'
import { PaymentTimeline } from '@/components/ventas/PaymentTimeline'
import { DeliveryBadge } from '@/components/ventas/DeliveryBadge'
import {
  formatBs,
  formatUsd,
  rateAgeLabel,
} from '@/lib/ventas/money'
import { formatDateTime } from '@/lib/format'

type ConfirmAction = 'void' | 'deliver' | 'undeliver'

const CONFIRM_COPY: Record<
  ConfirmAction,
  { title: string; confirmLabel: string; loadingLabel: string; destructive: boolean }
> = {
  void: {
    title: 'Anular venta',
    confirmLabel: 'Anular venta',
    loadingLabel: 'Anulando…',
    destructive: true,
  },
  deliver: {
    title: 'Marcar como entregada',
    confirmLabel: 'Marcar entregada',
    loadingLabel: 'Entregando…',
    destructive: false,
  },
  undeliver: {
    title: 'Revertir entrega',
    confirmLabel: 'Revertir entrega',
    loadingLabel: 'Revirtiendo…',
    destructive: false,
  },
}

export default function VentaDetailPage() {
  const params = useParams<{ id: string }>()
  const api = useApi()
  const [sale, setSale] = useState<Sale | null>(null)
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [rateHistory, setRateHistory] = useState<ExchangeRateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, r, history] = await Promise.all([
        api.getSale(params.id),
        api.getRates().catch(() => null),
        api.getRatesHistory().catch(() => ({ items: [] as ExchangeRateRow[] })),
      ])
      setSale(s)
      setRates(r)
      setRateHistory(history.items)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando venta')
    } finally {
      setLoading(false)
    }
  }, [api, params.id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleVoid() {
    if (!sale) return
    setVoiding(true)
    try {
      const updated = await api.voidSale(sale.id)
      setSale(updated)
      notify.success('Venta anulada')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo anular')
    } finally {
      setVoiding(false)
    }
  }

  async function handleDeliver() {
    if (!sale) return
    setDelivering(true)
    try {
      const updated = await api.deliverSale(sale.id)
      setSale(updated)
      notify.success('Venta entregada · stock descontado')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo entregar')
    } finally {
      setDelivering(false)
    }
  }

  async function handleUndeliver() {
    if (!sale) return
    setDelivering(true)
    try {
      const updated = await api.undeliverSale(sale.id)
      setSale(updated)
      notify.success('Entrega revertida · stock devuelto')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo revertir')
    } finally {
      setDelivering(false)
    }
  }

  async function handleConfirmAction() {
    const action = confirm
    if (!action) return
    if (action === 'void') await handleVoid()
    else if (action === 'deliver') await handleDeliver()
    else await handleUndeliver()
    setConfirm(null)
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto">
        <PageContainer>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </PageContainer>
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

  const undelivered = sale.deliveryStatus === 'POR_ENTREGAR'
  const canPay = sale.status === 'PENDIENTE'
  const canVoid = sale.status === 'PENDIENTE' && sale.payments.length === 0
  const canEdit = canVoid && undelivered
  const canDeliver = sale.status !== 'ANULADA' && undelivered
  const canUndeliver = sale.status !== 'ANULADA' && !undelivered

  return (
    <div className="h-full overflow-auto">
      <PageContainer>
        <div>
          <Link
            href="/ventas"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="size-4" />
            Ventas
          </Link>
          <PageHeader
            title={sale.customer?.name ?? 'Venta'}
            description={
              <>
                {formatDateTime(sale.createdAt)}
                {sale.agentName ? ` · ${sale.agentName}` : ''}
                {' · '}
                {sale.priceRef === 'REF_USD' ? 'Precio divisas' : 'Precio bolívares'}
              </>
            }
            actions={
              <>
                <StatusBadge status={sale.status} />
                {sale.status !== 'ANULADA' && (
                  <DeliveryBadge status={sale.deliveryStatus} />
                )}
              </>
            }
          />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-center">
          <p className="text-sm text-gray-500">
            {sale.status === 'PAGADA'
              ? 'Pagada'
              : sale.status === 'ANULADA'
                ? 'Anulada'
                : 'Saldo pendiente'}
          </p>
          <p className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 tabular-nums text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {sale.status === 'PAGADA' ? (
              <span>{formatUsd(0)}</span>
            ) : (
              <>
                <span>{formatUsd(sale.balanceUsd)}</span>
                {sale.balanceBs != null && (
                  <>
                    <span className="font-normal text-gray-400">·</span>
                    <span>{formatBs(sale.balanceBs)}</span>
                  </>
                )}
              </>
            )}
          </p>
          {sale.status === 'PENDIENTE' && (
            <p className="mt-1 text-xs text-gray-500">
              {sale.bsRate
                ? `equiv. Bs a tasa actual ${sale.bsRate.rate.toFixed(2)} · ${rateAgeLabel(sale.bsRate.fetchedAt)} (solo referencia; cada pago usa su propia tasa)`
                : 'Sin tasa BCV para equivalente en Bs'}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Total venta {formatUsd(sale.totalUsd)}
            {sale.payments.length > 0 && (
              <>
                {' · '}
                Abonado{' '}
                {formatUsd(
                  Math.round(
                    sale.payments.reduce((s, p) => s + p.amountUsd, 0) * 100,
                  ) / 100,
                )}
              </>
            )}
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
          <h2 className="mb-2 text-lg font-medium text-gray-900">Ítems</h2>
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
                <span className="tabular-nums text-sm text-gray-900">
                  {formatUsd(it.subtotalUsd)}
                </span>
              </li>
            ))}
          </ul>
          {sale.status !== 'ANULADA' && (
            <p className="mt-2 text-xs text-gray-500">
              {undelivered
                ? 'Reservado: el stock sigue en inventario hasta que marques la entrega.'
                : `Entregada ${formatDateTime(sale.deliveredAt!)}${
                    sale.deliveredBy ? ` · ${sale.deliveredBy}` : ''
                  }`}
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-gray-900">Pagos</h2>
          <PaymentTimeline payments={sale.payments} onSaleUpdated={setSale} />
        </section>

        <div className="flex flex-wrap gap-2">
          {canPay && (
            <Button variant="primary" onClick={() => setPayOpen(true)}>
              Registrar pago
            </Button>
          )}
          {canDeliver && (
            <Button
              variant="outline"
              disabled={delivering}
              onClick={() => setConfirm('deliver')}
            >
              Marcar entregada
            </Button>
          )}
          {canEdit && (
            <Link
              href={`/ventas/${sale.id}/editar`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Editar
            </Link>
          )}
          {canVoid && (
            <Button
              variant="outline"
              disabled={voiding}
              onClick={() => setConfirm('void')}
              className="text-red-700"
            >
              Anular venta
            </Button>
          )}
          {canUndeliver && (
            <Button
              variant="ghost"
              size="sm"
              disabled={delivering}
              onClick={() => setConfirm('undeliver')}
              className="text-gray-500"
            >
              Revertir entrega
            </Button>
          )}
        </div>
      </PageContainer>

      <PaymentDialog
        open={payOpen}
        sale={sale}
        rates={rates}
        rateHistory={rateHistory}
        onOpenChange={setPayOpen}
        onSaved={setSale}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? CONFIRM_COPY[confirm].title : ''}
        description={
          confirm === 'void'
            ? sale.deliveryStatus === 'ENTREGADA'
              ? '¿Anular esta venta? Se devolverá el stock entregado.'
              : '¿Anular esta venta? Se liberará el stock reservado.'
            : confirm === 'deliver'
              ? '¿Marcar como entregada? Se descontará el stock físico.'
              : '¿Revertir la entrega? El stock vuelve al inventario.'
        }
        confirmLabel={confirm ? CONFIRM_COPY[confirm].confirmLabel : undefined}
        loadingLabel={confirm ? CONFIRM_COPY[confirm].loadingLabel : undefined}
        destructive={confirm ? CONFIRM_COPY[confirm].destructive : true}
        loading={voiding || delivering}
        onOpenChange={(open) => {
          if (!open && !voiding && !delivering) setConfirm(null)
        }}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  )
}
