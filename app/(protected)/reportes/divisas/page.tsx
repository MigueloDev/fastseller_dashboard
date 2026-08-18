'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, ArrowLeftRight } from 'lucide-react'
import type { FxReport } from '@/types'
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
import { cn } from '@/lib/utils'

function formatUsdt(n: number) {
  return `${n.toLocaleString('es-VE', { maximumFractionDigits: 6 })} USDT`
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function ReporteDivisasPage() {
  const api = useApi()
  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const [report, setReport] = useState<FxReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getFxReport(rangeQuery(range))
      setReport(data)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando reporte')
    } finally {
      setLoading(false)
    }
  }, [api, range])

  useEffect(() => {
    void load()
  }, [load])

  async function exportCsv(mode: 'detail' | 'summary') {
    try {
      const blob = await api.getFxReportCsv({ ...rangeQuery(range), mode })
      const name =
        mode === 'summary'
          ? `divisas_resumen_${rangeLabel(range)}`
          : `divisas_${rangeLabel(range)}`
      downloadBlob(name, blob)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error exportando CSV')
    }
  }

  const totals = report?.totals
  const empty =
    !report || (report.sales.length === 0 && report.purchases.length === 0)
  const convertedPct =
    totals && totals.bsCollected > 0
      ? Math.round((totals.bsConverted / totals.bsCollected) * 100)
      : null

  return (
    <PageContainer wide>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportRange value={range} onChange={setRange} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportCsv('detail')}
            disabled={empty}
          >
            <Download className="size-4" />
            CSV detallado
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportCsv('summary')}
            disabled={empty}
          >
            <Download className="size-4" />
            CSV resumen
          </Button>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Bs cobrados"
            value={formatBs(totals.bsCollected)}
            hint={`${totals.count} venta${totals.count === 1 ? '' : 's'}`}
          />
          <SummaryCard
            label="Bs convertidos"
            value={formatBs(totals.bsConverted)}
            hint={
              convertedPct != null
                ? `${convertedPct} % del cobrado`
                : 'sin cobros'
            }
          />
          <SummaryCard
            label="Bs pendientes"
            value={formatBs(totals.bsPending)}
            hint="aún no convertidos"
            tone="text-amber-800"
          />
          <SummaryCard
            label="USDT adquiridos"
            value={formatUsdt(totals.purchasesUsdt)}
            hint={`${totals.purchasesCount} compra${totals.purchasesCount === 1 ? '' : 's'} del período`}
          />
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} />
      ) : empty ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No hay cobros en Bs ni compras de divisas en este período."
        />
      ) : (
        <>
          {report.sales.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-medium text-gray-900">
                Por venta
              </h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full min-w-[56rem] text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 font-medium">Cliente</th>
                      <th className="px-3 py-2 font-medium">Cobro</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-right font-medium">Bs cobrados</th>
                      <th className="px-3 py-2 text-right font-medium">Convertidos</th>
                      <th className="px-3 py-2 text-right font-medium">Pendientes</th>
                      <th className="px-3 py-2 text-right font-medium">USDT</th>
                      <th className="px-3 py-2 text-right font-medium">Ganancia</th>
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
                        <td className="px-3 py-2 text-gray-900">
                          {sale.customer?.name ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <StatusBadge status={sale.paymentState ?? sale.status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900">
                          {formatUsd(sale.totalUsd)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900">
                          {formatBs(sale.bsCollected)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">
                          {formatBs(sale.bsConverted)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-amber-800">
                          {formatBs(sale.bsPending)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900">
                          {formatUsdt(sale.usdtReceived)}
                        </td>
                        <td
                          className={cn(
                            'whitespace-nowrap px-3 py-2 text-right tabular-nums',
                            sale.profitUsd == null
                              ? 'text-gray-400'
                              : sale.profitUsd >= 0
                                ? 'text-green-700'
                                : 'text-red-600',
                          )}
                        >
                          {sale.profitUsd != null ? formatUsd(sale.profitUsd) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {totals && (
                    <tfoot className="border-t border-gray-200 bg-gray-50 font-medium">
                      <tr>
                        <td className="px-3 py-2 text-gray-600" colSpan={4}>
                          {totals.count} venta{totals.count === 1 ? '' : 's'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatBs(totals.bsCollected)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-green-700">
                          {formatBs(totals.bsConverted)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-800">
                          {formatBs(totals.bsPending)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatUsdt(totals.usdtReceived)}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2 text-right tabular-nums',
                            totals.profitUsd == null
                              ? 'text-gray-400'
                              : totals.profitUsd >= 0
                                ? 'text-green-700'
                                : 'text-red-600',
                          )}
                        >
                          {totals.profitUsd != null
                            ? formatUsd(totals.profitUsd)
                            : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          )}

          {report.purchases.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-medium text-gray-900">
                Compras de divisas
              </h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full min-w-[48rem] text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 text-right font-medium">Tasa</th>
                      <th className="px-3 py-2 text-right font-medium">Bs gastados</th>
                      <th className="px-3 py-2 text-right font-medium">USDT esperado</th>
                      <th className="px-3 py-2 text-right font-medium">USDT recibido</th>
                      <th className="px-3 py-2 text-right font-medium">Dif</th>
                      <th className="px-3 py-2 text-right font-medium">Ventas</th>
                      <th className="px-3 py-2 font-medium">Agente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                          {formatDateTime(p.purchasedAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900">
                          {p.binanceRate.toLocaleString('es-VE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900">
                          {formatBs(p.bsSpent)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-600">
                          {p.expectedUsdt != null ? formatUsdt(p.expectedUsdt) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900">
                          {formatUsdt(p.usdtReceived)}
                        </td>
                        <td
                          className={cn(
                            'whitespace-nowrap px-3 py-2 text-right tabular-nums',
                            p.diffUsdt == null
                              ? 'text-gray-400'
                              : p.diffUsdt >= 0
                                ? 'text-green-700'
                                : 'text-red-600',
                          )}
                        >
                          {p.diffUsdt != null ? formatUsdt(p.diffUsdt) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-700">
                          {p.salesCount}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {p.agentName ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {totals && (
                    <tfoot className="border-t border-gray-200 bg-gray-50 font-medium">
                      <tr>
                        <td className="px-3 py-2 text-gray-600" colSpan={2}>
                          {totals.purchasesCount} compra
                          {totals.purchasesCount === 1 ? '' : 's'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatBs(totals.purchasesBsSpent)}
                        </td>
                        <td />
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatUsdt(totals.purchasesUsdt)}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  )}
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
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={cn(
          'mt-0.5 tabular-nums text-xl font-semibold',
          tone ?? 'text-gray-900',
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
    </div>
  )
}
