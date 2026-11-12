'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Download, FileText, SlidersHorizontal } from 'lucide-react'
import type { CashAccount, DeliveryStatus, PaymentState, SalesReport } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { SelectCombobox, type ComboboxItem } from '@/components/ui/select-combobox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Field, FieldLabel } from '@/components/ui/field'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  DEFAULT_RANGE,
  ReportRange,
  rangeLabel,
  rangeQuery,
  type RangeState,
} from '@/components/reportes/ReportRange'
import {
  PAYMENT_METHOD_META,
  PAYMENT_METHODS,
  formatBs,
  formatUsd,
} from '@/lib/ventas/money'
import { formatDateTime } from '@/lib/format'
import { csvDateTime, downloadCsv, toCsv } from '@/lib/reports/csv'

const PAYMENT_STATE_LABEL: Record<PaymentState, string> = {
  PAGADA: 'Pagada',
  ABONADA: 'Abonada',
  CREDITO: 'A crédito',
}

const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  POR_ENTREGAR: 'Por entregar',
  ENTREGADA: 'Entregada',
}

const STATUS_ITEMS: ComboboxItem[] = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'PAGADA', label: 'Pagadas' },
  { value: 'ANULADA', label: 'Anuladas' },
]

const PAYMENT_STATE_ITEMS: ComboboxItem[] = (
  ['PAGADA', 'ABONADA', 'CREDITO'] as const
).map((v) => ({ value: v, label: PAYMENT_STATE_LABEL[v] }))

const METHOD_ITEMS: ComboboxItem[] = PAYMENT_METHODS.map((m) => ({
  value: m,
  label: PAYMENT_METHOD_META[m].label,
}))

const DELIVERY_ITEMS: ComboboxItem[] = (
  ['POR_ENTREGAR', 'ENTREGADA'] as const
).map((v) => ({ value: v, label: DELIVERY_LABEL[v] }))

function CobroBadge({ sale }: { sale: SalesReport['sales'][number] }) {
  if (sale.status === 'ANULADA') return <StatusBadge status="ANULADA" />
  if (sale.paymentState) return <StatusBadge status={sale.paymentState} />
  return <StatusBadge status={sale.status} />
}

// Versión texto para la columna Estado del CSV
function cobroLabel(sale: SalesReport['sales'][number]): string {
  if (sale.status === 'ANULADA') return 'Anulada'
  if (sale.paymentState) return PAYMENT_STATE_LABEL[sale.paymentState]
  return sale.status === 'PAGADA' ? 'Pagada' : 'Pendiente'
}

function itemsSummary(sale: SalesReport['sales'][number]): string {
  return sale.items
    .map(
      (it) =>
        `${it.productName}${it.variantName ? ` (${it.variantName})` : ''} ×${it.quantity}`,
    )
    .join(', ')
}

export default function ReporteVentasPage() {
  const api = useApi()
  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const [status, setStatus] = useState<string[]>([])
  const [delivery, setDelivery] = useState<string[]>([])
  const [paymentState, setPaymentState] = useState<string[]>([])
  const [method, setMethod] = useState<string[]>([])
  const [accountId, setAccountId] = useState<string[]>([])
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getCashAccounts()
      .then(setAccounts)
      .catch((err) =>
        notify.error(err instanceof Error ? err.message : 'Error cargando cuentas'),
      )
  }, [api])

  const accountItems: ComboboxItem[] = accounts.map((a) => ({
    value: a.id,
    label: `${a.alias} · ${a.currency}${a.active ? '' : ' (inactiva)'}`,
  }))
  const advancedCount = method.length + accountId.length

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSalesReport({
        ...rangeQuery(range),
        status: status.length > 0 ? status.join(',') : undefined,
        delivery: delivery.length > 0 ? delivery.join(',') : undefined,
        paymentState: paymentState.length > 0 ? paymentState.join(',') : undefined,
        method: method.length > 0 ? method.join(',') : undefined,
        accountId: accountId.length > 0 ? accountId.join(',') : undefined,
      })
      setReport(data)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando reporte')
    } finally {
      setLoading(false)
    }
  }, [api, range, status, delivery, paymentState, method, accountId])

  useEffect(() => {
    void load()
  }, [load])

  function exportCsv() {
    if (!report || report.sales.length === 0) return
    let csv = toCsv(
      [
        'Fecha',
        'Venta',
        'Cliente',
        'Cédula',
        'Ítems',
        'Precio',
        'Estado',
        'Entrega',
        'Total USD',
        'Cobrado USD',
        'Saldo USD',
        'Agente',
      ],
      report.sales.map((sale) => [
        csvDateTime(sale.createdAt),
        sale.id,
        sale.customerName,
        sale.customerCedula ?? '',
        itemsSummary(sale),
        sale.priceRef === 'REF_USD' ? 'Divisas' : 'Bolívares',
        cobroLabel(sale),
        DELIVERY_LABEL[sale.deliveryStatus],
        sale.totalUsd.toFixed(2),
        sale.collectedUsd.toFixed(2),
        sale.balanceUsd.toFixed(2),
        sale.agentName ?? '',
      ]),
    )
    // ponytail: second tables in same file; Excel ignores mismatched column counts
    const buckets = report.byPaymentState
    csv += `\r\n\r\nCobro\r\n${toCsv(
      ['Estado', 'Ventas', 'Unidades', 'Total USD', 'Cobrado USD', 'Saldo USD'],
      (['PAGADA', 'ABONADA', 'CREDITO'] as const).map((key) => {
        const b = buckets[key]
        return [
          PAYMENT_STATE_LABEL[key],
          b.count,
          b.unitsSold,
          b.totalUsd.toFixed(2),
          b.collectedUsd.toFixed(2),
          b.balanceUsd.toFixed(2),
        ]
      }),
    )}`
    if (report.byProduct.length > 0) {
      const products = toCsv(
        ['Producto', 'Variante', 'Unidades', 'Total USD'],
        report.byProduct.map((row) => [
          row.productName,
          row.variantName ?? '',
          row.unitsSold,
          row.revenueUsd.toFixed(2),
        ]),
      )
      csv += `\r\n\r\nProductos vendidos\r\n${products}`
    }
    downloadCsv(`ventas_${rangeLabel(range)}`, csv)
  }

  const totals = report?.totals
  const byPay = report?.byPaymentState
  const creditSales =
    report && !(paymentState.length === 1 && paymentState[0] === 'CREDITO')
      ? report.sales.filter((s) => s.paymentState === 'CREDITO')
      : []

  return (
    <PageContainer wide>
      <Collapsible className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReportRange value={range} onChange={setRange} />
          <div className="flex flex-wrap items-center gap-2">
            {/* Reemplazados por Combobox.
            <select
              className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as SaleStatus | '')}
            >
              <option value="">Todo estado</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="PAGADA">Pagadas</option>
              <option value="ANULADA">Anuladas</option>
            </select>
            <select
              className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
              value={paymentState}
              onChange={(e) => setPaymentState(e.target.value as PaymentState | '')}
            >
              <option value="">Todo cobro</option>
              <option value="PAGADA">Pagadas</option>
              <option value="ABONADA">Abonadas</option>
              <option value="CREDITO">A crédito</option>
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
            */}
            <SelectCombobox
              multiple
              className="w-40"
              items={STATUS_ITEMS}
              value={status}
              onChange={setStatus}
              placeholder="Todo estado"
              aria-label="Filtrar por estado"
            />
            <SelectCombobox
              multiple
              className="w-40"
              items={PAYMENT_STATE_ITEMS}
              value={paymentState}
              onChange={setPaymentState}
              placeholder="Todo cobro"
              aria-label="Filtrar por estado de cobro"
            />
            <SelectCombobox
              multiple
              className="w-40"
              items={DELIVERY_ITEMS}
              value={delivery}
              onChange={setDelivery}
              placeholder="Toda entrega"
              aria-label="Filtrar por estado de entrega"
            />
            <CollapsibleTrigger
              render={
                <Button variant="outline" size="sm" className="group">
                  <SlidersHorizontal className="size-4" />
                  Pagos
                  {advancedCount > 0 && (
                    <span className="rounded-full bg-violet-100 px-1.5 text-xs tabular-nums text-violet-700">
                      {advancedCount}
                    </span>
                  )}
                  <ChevronDown className="size-4 transition-transform group-data-[panel-open]:rotate-180" />
                </Button>
              }
            />
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={!report || report.sales.length === 0}
            >
              <Download className="size-4" />
              CSV
            </Button>
          </div>
        </div>
        <CollapsibleContent className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field>
              <FieldLabel htmlFor="filtro-metodo">Método de pago</FieldLabel>
              <SelectCombobox
                multiple
                id="filtro-metodo"
                items={METHOD_ITEMS}
                value={method}
                onChange={setMethod}
                placeholder="Todo método"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="filtro-cuenta">Cuenta</FieldLabel>
              <SelectCombobox
                multiple
                id="filtro-cuenta"
                items={accountItems}
                value={accountId}
                onChange={setAccountId}
                placeholder="Toda cuenta"
              />
            </Field>
            <Button
              variant="ghost"
              size="sm"
              disabled={advancedCount === 0}
              onClick={() => {
                setMethod([])
                setAccountId([])
              }}
            >
              Limpiar
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Muestra ventas con al menos un pago que cumpla ambos filtros.
            {advancedCount > 0 && totals && (
              <>
                {' '}Cobrado en el período con esos pagos:{' '}
                <span className="font-medium tabular-nums text-green-700">
                  {formatUsd(totals.collectedUsd)}
                </span>
                {` (${totals.collectedCount} pago${totals.collectedCount === 1 ? '' : 's'})`}
              </>
            )}
          </p>
        </CollapsibleContent>
      </Collapsible>

      {totals && byPay && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Vendidas"
            usd={totals.totalUsd}
            bs={totals.totalBs}
            hint={`${totals.unitsSold} ud. · ${totals.count} venta${totals.count === 1 ? '' : 's'}`}
          />
          <SummaryCard
            label="Pagadas"
            usd={byPay.PAGADA.totalUsd}
            bs={null}
            hint={`${byPay.PAGADA.count} venta${byPay.PAGADA.count === 1 ? '' : 's'} · ${byPay.PAGADA.unitsSold} ud.`}
          />
          <SummaryCard
            label="Abonadas"
            usd={byPay.ABONADA.balanceUsd}
            bs={null}
            hint={`${byPay.ABONADA.count} · cobrado ${formatUsd(byPay.ABONADA.collectedUsd)} · saldo`}
          />
          <SummaryCard
            label="A crédito"
            usd={byPay.CREDITO.totalUsd}
            bs={null}
            hint={`${byPay.CREDITO.count} venta${byPay.CREDITO.count === 1 ? '' : 's'} sin pago`}
          />
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} />
      ) : !report || report.sales.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay ventas en este período."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Ítems</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-right font-medium">Cobrado</th>
                  <th className="px-3 py-2 text-right font-medium">Saldo</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      <Link
                        href={`/ventas/${sale.id}`}
                        className="hover:text-violet-700 hover:underline"
                      >
                        {formatDateTime(sale.createdAt)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-gray-900">{sale.customerName}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-gray-600" title={itemsSummary(sale)}>
                      {itemsSummary(sale)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900">
                      {formatUsd(sale.totalUsd)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">
                      {formatUsd(sale.collectedUsd)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-amber-800">
                      {sale.status === 'ANULADA' ? '—' : formatUsd(sale.balanceUsd)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <CobroBadge sale={sale} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {sale.status === 'ANULADA'
                        ? '—'
                        : DELIVERY_LABEL[sale.deliveryStatus]}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot className="border-t border-gray-200 bg-gray-50 font-medium">
                  <tr>
                    <td className="px-3 py-2 text-gray-600" colSpan={3}>
                      {totals.count} venta{totals.count === 1 ? '' : 's'}
                      {` · ${totals.unitsSold} ud.`}
                      {totals.voidedCount > 0
                        ? ` · ${totals.voidedCount} anulada${totals.voidedCount === 1 ? '' : 's'} (no suman)`
                        : ''}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatUsd(totals.totalUsd)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-700">
                      {formatUsd(totals.collectedUsd)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-800">
                      {formatUsd(totals.balanceUsd)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {creditSales.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-medium text-gray-900">
                A crédito
              </h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 font-medium">Cliente</th>
                      <th className="px-3 py-2 font-medium">Cédula</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {creditSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                          <Link
                            href={`/ventas/${sale.id}`}
                            className="hover:text-violet-700 hover:underline"
                          >
                            {formatDateTime(sale.createdAt)}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-gray-900">{sale.customerName}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {sale.customerCedula ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-800">
                          {formatUsd(sale.totalUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {report.byProduct.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-medium text-gray-900">
                Por producto
              </h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Producto</th>
                      <th className="px-3 py-2 text-right font-medium">Unidades</th>
                      <th className="px-3 py-2 text-right font-medium">Facturado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.byProduct.map((row) => (
                      <tr key={`${row.productId}-${row.variantId ?? ''}`}>
                        <td className="px-3 py-2 text-gray-900">
                          {row.productName}
                          {row.variantName && (
                            <span className="text-gray-500"> · {row.variantName}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                          {row.unitsSold}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                          {formatUsd(row.revenueUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </PageContainer>
  )
}

function SummaryCard({
  label,
  usd,
  bs,
  hint,
}: {
  label: string
  usd: number
  bs: number | null
  hint: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-0.5 tabular-nums text-xl font-semibold text-gray-900">
        {formatUsd(usd)}
      </p>
      {bs != null && (
        <p className="tabular-nums text-xs text-gray-500">{formatBs(bs)}</p>
      )}
      <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
    </div>
  )
}
