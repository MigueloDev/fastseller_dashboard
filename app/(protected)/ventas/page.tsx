'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, ShoppingCart, UserPen } from 'lucide-react'
import type {
  Customer,
  DeliveryType,
  PaymentState,
  ReceivablesResponse,
  Sale,
} from '@/types'
import { useApi } from '@/hooks/useApi'
import { useMe } from '@/hooks/useMe'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge, STATUS_MAP } from '@/components/ui/status-badge'
import { SelectCombobox, type ComboboxItem } from '@/components/ui/select-combobox'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ReceivablesCard } from '@/components/ventas/ReceivablesCard'
import { DeliveryBadge } from '@/components/ventas/DeliveryBadge'
import { CustomerFormDialog } from '@/components/clientes/CustomerFormDialog'
import { formatUsd } from '@/lib/ventas/money'
import { DELIVERY_TYPE_LABEL } from '@/lib/ventas/delivery'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const PAYMENT_STATE_VALUES: PaymentState[] = ['CREDITO', 'ABONADA', 'PAGADA']
const PAYMENT_STATE_ITEMS: ComboboxItem[] = [
  ...PAYMENT_STATE_VALUES.map((v) => ({ value: v, label: STATUS_MAP[v].label })),
  { value: 'ANULADA', label: STATUS_MAP.ANULADA.label },
]

const DELIVERY_ITEMS: ComboboxItem[] = [
  { value: 'POR_ENTREGAR', label: STATUS_MAP.POR_ENTREGAR.label },
  { value: 'ENTREGADA', label: STATUS_MAP.ENTREGADA.label },
]

const DELIVERY_TYPE_ITEMS: ComboboxItem[] = (
  Object.keys(DELIVERY_TYPE_LABEL) as DeliveryType[]
).map((v) => ({ value: v, label: DELIVERY_TYPE_LABEL[v] }))

const PAYMENT_STATE_PARAM_VALUES = new Set<string>([
  ...PAYMENT_STATE_VALUES,
  'ANULADA',
  'PENDIENTE', // legacy (link del home /ventas?status=PENDIENTE), el backend lo traduce
])

function parsePaymentStateParam(raw: string | null): string[] {
  if (!raw) return []
  return raw.split(',').filter((v) => PAYMENT_STATE_PARAM_VALUES.has(v))
}

function statusBadge(sale: Sale) {
  if (sale.status === 'PENDIENTE' && sale.payments.length > 0) {
    return <StatusBadge status="ABONADA" />
  }
  return <StatusBadge status={sale.status} />
}

function VentasPageInner() {
  const api = useApi()
  const router = useRouter()
  const { me } = useMe()
  const seller = me?.role === 'VENDEDOR'
  const searchParams = useSearchParams()
  const [sales, setSales] = useState<Sale[]>([])
  const [total, setTotal] = useState(0)
  const [receivables, setReceivables] = useState<ReceivablesResponse | null>(null)
  const [paymentStates, setPaymentStates] = useState<string[]>(() =>
    parsePaymentStateParam(searchParams.get('status'))
  )
  const [deliveries, setDeliveries] = useState<string[]>([])
  const [deliveryTypes, setDeliveryTypes] = useState<string[]>([])
  const [fromYmd, setFromYmd] = useState('')
  const [toYmd, setToYmd] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerFormOpen, setCustomerFormOpen] = useState(false)

  useEffect(() => {
    setPaymentStates(parsePaymentStateParam(searchParams.get('status')))
  }, [searchParams])

  const hasFilters =
    paymentStates.length > 0 ||
    deliveries.length > 0 ||
    deliveryTypes.length > 0 ||
    Boolean(fromYmd) ||
    Boolean(toYmd)

  function clearFilters() {
    setPaymentStates([])
    setDeliveries([])
    setDeliveryTypes([])
    setFromYmd('')
    setToYmd('')
    setPage(0)
  }

  const load = useCallback(async () => {
    try {
      const [page_, recv] = await Promise.all([
        api.getSales({
          status: paymentStates.length > 0 ? paymentStates.join(',') : undefined,
          delivery: deliveries.length > 0 ? deliveries.join(',') : undefined,
          deliveryType: deliveryTypes.length > 0 ? deliveryTypes.join(',') : undefined,
          from: fromYmd ? new Date(`${fromYmd}T00:00:00`).toISOString() : undefined,
          to: toYmd ? new Date(`${toYmd}T23:59:59.999`).toISOString() : undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
        seller
          ? Promise.resolve(null)
          : api.getReceivables().catch(() => null),
      ])
      setSales(page_.items)
      setTotal(page_.total)
      setReceivables(recv)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando ventas')
    } finally {
      setLoading(false)
    }
  }, [api, paymentStates, deliveries, deliveryTypes, fromYmd, toYmd, page, seller])

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

  const pageStart = page * PAGE_SIZE
  const pageEnd = Math.min(pageStart + sales.length, total)

  return (
    <div className="flex h-full flex-col overflow-auto">
      <PageContainer wide>
        <PageHeader
          title="Ventas"
          actions={
            <Button variant="primary" render={<Link href="/ventas/nueva" />}>
              <Plus className="size-4" />
              Nueva
            </Button>
          }
        />

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <label htmlFor="ventas-filter-status" className="mb-1 block text-xs text-gray-500">
              Cobro
            </label>
            <SelectCombobox
              id="ventas-filter-status"
              multiple
              items={PAYMENT_STATE_ITEMS}
              value={paymentStates}
              onChange={(v) => {
                setPaymentStates(v)
                setPage(0)
              }}
              placeholder="Todas"
            />
          </div>
          <div className="min-w-40 flex-1">
            <label htmlFor="ventas-filter-delivery" className="mb-1 block text-xs text-gray-500">
              Entrega
            </label>
            <SelectCombobox
              id="ventas-filter-delivery"
              multiple
              items={DELIVERY_ITEMS}
              value={deliveries}
              onChange={(v) => {
                setDeliveries(v)
                setPage(0)
              }}
              placeholder="Toda entrega"
            />
          </div>
          <div className="min-w-40 flex-1">
            <label htmlFor="ventas-filter-delivery-type" className="mb-1 block text-xs text-gray-500">
              Tipo
            </label>
            <SelectCombobox
              id="ventas-filter-delivery-type"
              multiple
              items={DELIVERY_TYPE_ITEMS}
              value={deliveryTypes}
              onChange={(v) => {
                setDeliveryTypes(v)
                setPage(0)
              }}
              placeholder="Todo tipo"
            />
          </div>
          <div className="w-36">
            <DatePicker
              label="Desde"
              value={fromYmd}
              onChange={(v) => {
                setFromYmd(v)
                setPage(0)
              }}
            />
          </div>
          <div className="w-36">
            <DatePicker
              label="Hasta"
              value={toYmd}
              onChange={(v) => {
                setToYmd(v)
                setPage(0)
              }}
            />
          </div>
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Filtros previos (un solo valor por filtro, sin fechas) — reemplazados arriba.
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
        */}

        {!seller && (
          <ReceivablesCard data={receivables} loading={loading && !receivables} />
        )}

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
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Quién</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    {!seller && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/ventas/${sale.id}`)}
                    >
                      <TableCell className="font-medium text-gray-900">
                        {sale.customer?.name ?? 'Cliente'}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDateTime(sale.createdAt)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {sale.agentName ?? '—'}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {sale.priceRef === 'REF_USD' ? 'Divisas' : 'Bolívares'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {statusBadge(sale)}
                          {sale.status !== 'ANULADA' && (
                            <DeliveryBadge status={sale.deliveryStatus} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="tabular-nums font-semibold text-gray-900">
                          {formatUsd(sale.totalUsd)}
                        </p>
                        {!seller && sale.status !== 'ANULADA' &&
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
                      </TableCell>
                      <TableCell className="text-right">
                        {sale.status === 'PENDIENTE' && (
                          <span className="tabular-nums text-xs font-medium text-amber-800">
                            {formatUsd(sale.balanceUsd)}
                          </span>
                        )}
                      </TableCell>
                      {!seller && (
                        <TableCell>
                          {sale.customer && (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Editar cliente"
                              title="Editar cliente"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditCustomer(sale.customer!)
                              }}
                            >
                              <UserPen className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {total > 0 ? `${pageStart + 1}–${pageEnd} de ${total}` : '0 de 0'}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Página anterior"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Página siguiente"
                  disabled={pageEnd >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
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
