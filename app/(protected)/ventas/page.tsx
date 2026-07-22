'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, ShoppingCart, UserPen } from 'lucide-react'
import type {
  Customer,
  DeliveryStatus,
  ReceivablesResponse,
  Sale,
  SaleStatus,
} from '@/types'
import { useApi } from '@/hooks/useApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReceivablesCard } from '@/components/ventas/ReceivablesCard'
import { DeliveryBadge } from '@/components/ventas/DeliveryBadge'
import { CustomerFormDialog } from '@/components/clientes/CustomerFormDialog'
import { balanceLabel, formatUsd } from '@/lib/ventas/money'
import { cn } from '@/lib/utils'

const STATUS_VALUES: SaleStatus[] = ['PENDIENTE', 'PAGADA', 'ANULADA']

function parseStatusParam(raw: string | null): SaleStatus | '' {
  if (raw && STATUS_VALUES.includes(raw as SaleStatus)) return raw as SaleStatus
  return ''
}

function statusBadge(sale: Sale) {
  if (sale.status === 'PAGADA') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pagada</Badge>
  }
  if (sale.status === 'ANULADA') {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Anulada</Badge>
  }
  const hasPayments = sale.payments.length > 0
  return (
    <Badge
      className={cn(
        hasPayments
          ? 'bg-amber-100 text-amber-900 hover:bg-amber-100'
          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      )}
    >
      {hasPayments ? 'Abonada' : 'Pendiente'}
    </Badge>
  )
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
      toast.error(err instanceof Error ? err.message : 'Error cargando ventas')
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-violet-600" />
          <h1 className="text-lg font-semibold text-gray-900">Ventas</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as SaleStatus | '')}
          >
            <option value="">Todas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="PAGADA">Pagadas</option>
            <option value="ANULADA">Anuladas</option>
          </select>
          <select
            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
            value={delivery}
            onChange={(e) => setDelivery(e.target.value as DeliveryStatus | '')}
          >
            <option value="">Toda entrega</option>
            <option value="POR_ENTREGAR">Por entregar</option>
            <option value="ENTREGADA">Entregadas</option>
          </select>
          <Link
            href="/ventas/nueva"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
        <ReceivablesCard data={receivables} loading={loading && !receivables} />

        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : sales.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No hay ventas todavía.</p>
            <Link
              href="/ventas/nueva"
              className="mt-3 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              Crear primera venta
            </Link>
          </div>
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
                      {new Date(sale.createdAt).toLocaleString('es', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      {sale.agentName ? ` · ${sale.agentName}` : ''}
                      {' · '}
                      {sale.priceRef === 'REF_USD' ? 'Divisas' : 'Bolívares'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-gray-900">
                      {formatUsd(sale.totalUsd)}
                    </p>
                    {sale.status === 'PENDIENTE' && (
                      <p className="text-xs text-amber-800">
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
      </div>

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
