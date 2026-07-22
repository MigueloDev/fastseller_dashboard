'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import type { DeliveryStatus, SaleStatus, SalesReport } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import {
  DEFAULT_RANGE,
  ReportRange,
  rangeLabel,
  rangeQuery,
  type RangeState,
} from '@/components/reportes/ReportRange'
import { formatBs, formatUsd } from '@/lib/ventas/money'
import { csvDateTime, downloadCsv, toCsv } from '@/lib/reports/csv'

const STATUS_LABEL: Record<SaleStatus, string> = {
  PENDIENTE: 'Pendiente',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
}

const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  POR_ENTREGAR: 'Por entregar',
  ENTREGADA: 'Entregada',
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
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSalesReport({
        ...rangeQuery(range),
        status: status || undefined,
        delivery: delivery || undefined,
      })
      setReport(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando reporte')
    } finally {
      setLoading(false)
    }
  }, [api, range, status, delivery])

  useEffect(() => {
    void load()
  }, [load])

  function exportCsv() {
    if (!report || report.sales.length === 0) return
    const csv = toCsv(
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
        STATUS_LABEL[sale.status],
        DELIVERY_LABEL[sale.deliveryStatus],
        sale.totalUsd.toFixed(2),
        sale.collectedUsd.toFixed(2),
        sale.balanceUsd.toFixed(2),
        sale.agentName ?? '',
      ]),
    )
    downloadCsv(`ventas_${rangeLabel(range)}`, csv)
  }

  const totals = report?.totals

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4">
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
            <Download className="mr-1 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Vendido"
            usd={totals.totalUsd}
            bs={totals.totalBs}
            hint={`${totals.count} venta${totals.count === 1 ? '' : 's'}`}
          />
          <SummaryCard
            label="Cobrado"
            usd={totals.collectedUsd}
            bs={totals.collectedBs}
            hint={`${totals.collectedCount} pago${totals.collectedCount === 1 ? '' : 's'}`}
          />
          <SummaryCard
            label="Por cobrar"
            usd={totals.balanceUsd}
            bs={totals.balanceBs}
            hint="saldo de estas ventas"
          />
          <SummaryCard
            label="Por entregar"
            usd={report!.byDelivery.POR_ENTREGAR.totalUsd}
            bs={null}
            hint={`${report!.byDelivery.POR_ENTREGAR.count} venta${
              report!.byDelivery.POR_ENTREGAR.count === 1 ? '' : 's'
            } sin entregar`}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : !report || report.sales.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No hay ventas en este período.
        </div>
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
                        {new Date(sale.createdAt).toLocaleString('es', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
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
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {STATUS_LABEL[sale.status]}
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

          {report.byProduct.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-gray-700">
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
    </div>
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
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-gray-900">
        {formatUsd(usd)}
      </p>
      {bs != null && (
        <p className="text-xs tabular-nums text-gray-500">{formatBs(bs)}</p>
      )}
      <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
    </div>
  )
}
