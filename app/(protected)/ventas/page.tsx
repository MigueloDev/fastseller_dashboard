'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, ShoppingCart, UserPen } from 'lucide-react'
import type {
  Customer,
  DeliveryStatus,
  ReceivablesResponse,
  Sale,
  SaleStatus,
} from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { ReceivablesCard } from '@/components/ventas/ReceivablesCard'
import { DeliveryBadge } from '@/components/ventas/DeliveryBadge'
import { CustomerFormDialog } from '@/components/clientes/CustomerFormDialog'
import { balanceLabel, formatUsd } from '@/lib/ventas/money'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const STATUS_VALUES: SaleStatus[] = ['PENDIENTE', 'PAGADA', 'ANULADA']

function parseStatusParam(raw: string | null): SaleStatus | '' {
  if (raw && STATUS_VALUES.includes(raw as SaleStatus)) return raw as SaleStatus
  return ''
}

function statusBadge(sale: Sale) {
  if (sale.status === 'PENDIENTE' && sale.payments.length > 0) {
    return <StatusBadge status="ABONADA" />
  }
  return <StatusBadge status={sale.status} />
}

function VentasPageInner() {
  const api = useApi()
  const searchParams = useSearchParams()
  const [sales, setSales] = useState<Sale[]>([])
  const [receivables, setReceivables] = useState<ReceivablesResponse | null>(null)
  const [status, setStatus] = useState<SaleStatus | ''>(() =>
    parseStatusParam(searchParams.get('status'))
  )
  const [delivery, setDelivery] = useState<DeliveryStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerFormOpen, setCustomerFormOpen] = useState(false)

  useEffect(() => {
    setStatus(parseStatusParam(searchParams.get('status')))
  }, [searchParams])

  const load = useCallback(async () => {
    try {
      const [page, recv] = await Promise.all([
        api.getSales({
          status: status || undefined,
          delivery: delivery || undefined,
          limit: 50,
        }),
        api.getReceivables().catch(() => null),
      ])
      setSales(page.items)
      setReceivables(recv)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando ventas')
    } finally {
      setLoading(false)
    }
  }, [api, status, delivery])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  function openEditCustomer(customer: Customer) {
    setEditingCustomer(customer)
    setCustomerFormOpen(true)
  }

  function onCustomerSaved(saved: Customer) {
    setSales((prev) =>
      prev.map((sale) =>
        sale.customerId === saved.id ? { ...sale, customer: saved } : sale,
      ),
    )
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <PageContainer>
        <PageHeader
          title="Ventas"
          actions={
            <>
              <select
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as SaleStatus | '')}
              >
                <option value="">Todas</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="PAGADA">Pagadas</option>
                <option value="ANULADA">Anuladas</option>
              </select>
              <select
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value as DeliveryStatus | '')}
              >
                <option value="">Toda entrega</option>
                <option value="POR_ENTREGAR">Por entregar</option>
                <option value="ENTREGADA">Entregadas</option>
              </select>
              <Button
                variant="primary"
                render={<Link href="/ventas/nueva" />}
              >
                <Plus className="size-4" />
                Nueva
              </Button>
            </>
          }
        />

        <ReceivablesCard data={receivables} loading={loading && !receivables} />

        {loading ? (
          <TableSkeleton rows={6} />
        ) : sales.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Aún no hay ventas registradas">
            <Button variant="primary" render={<Link href="/ventas/nueva" />}>
              <Plus className="size-4" />
              Crear primera venta
            </Button>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {sales.map((sale) => (
              <li
                key={sale.id}
                className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-gray-50"
              >
                <Link
                  href={`/ventas/${sale.id}`}
                  className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {sale.customer?.name ?? 'Cliente'}
                      </span>
                      {statusBadge(sale)}
                      {sale.status !== 'ANULADA' && (
                        <DeliveryBadge status={sale.deliveryStatus} />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(sale.createdAt)}
                      {sale.agentName ? ` · ${sale.agentName}` : ''}
                      {' · '}
                      {sale.priceRef === 'REF_USD' ? 'Divisas' : 'Bolívares'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums font-semibold text-gray-900">
                      {formatUsd(sale.totalUsd)}
                    </p>
                    {sale.status !== 'ANULADA' &&
                      (sale.profitUsd != null ? (
                        <p
                          className={cn(
                            'tabular-nums text-xs',
                            sale.profitUsd >= 0
                              ? 'text-green-700'
                              : 'text-red-600',
                          )}
                        >
                          Ganancia {formatUsd(sale.profitUsd)}
                          {sale.marginPct != null
                            ? ` (${sale.marginPct.toFixed(0)}%)`
                            : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">Sin costo histórico</p>
                      ))}
                    {sale.status === 'PENDIENTE' && (
                      <p className="tabular-nums text-xs text-amber-800">
                        Falta{' '}
                        {balanceLabel(
                          sale.balanceUsd,
                          sale.balanceBs,
                          sale.bsRate,
                        )}
                      </p>
                    )}
                  </div>
                </Link>
                {sale.customer && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Editar cliente"
                    title="Editar cliente"
                    onClick={() => openEditCustomer(sale.customer!)}
                  >
                    <UserPen className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </PageContainer>

      <CustomerFormDialog
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
        customer={editingCustomer}
        onSaved={onCustomerSaved}
      />
    </div>
  )
}

export default function VentasPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-gray-500">Cargando ventas…</div>
      }
    >
      <VentasPageInner />
    </Suspense>
  )
}
