'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, FileText } from 'lucide-react'
import type {
  DeliveryStatus,
  PaymentState,
  SaleStatus,
  SalesReport,
} from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  DEFAULT_RANGE,
  ReportRange,
  rangeLabel,
  rangeQuery,
  type RangeState,
} from '@/components/reportes/ReportRange'
import { formatBs, formatUsd } from '@/lib/ventas/money'
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
  const [status, setStatus] = useState<SaleStatus | ''>('')
  const [delivery, setDelivery] = useState<DeliveryStatus | ''>('')
  const [paymentState, setPaymentState] = useState<PaymentState | ''>('')
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSalesReport({
        ...rangeQuery(range),
        status: status || undefined,
        delivery: delivery || undefined,
        paymentState: paymentState || undefined,
      })
      setReport(data)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando reporte')
    } finally {
      setLoading(false)
    }
  }, [api, range, status, delivery, paymentState])

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
    report && paymentState !== 'CREDITO'
      ? report.sales.filter((s) => s.paymentState === 'CREDITO')
      : []

  return (
    <PageContainer wide>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportRange value={range} onChange={setRange} />
        <div className="flex flex-wrap items-center gap-2">
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
