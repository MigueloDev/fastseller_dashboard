'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, Wallet } from 'lucide-react'
import type { PaymentCurrency, PaymentsReport } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/ui/page-header'
import { SelectCombobox, type ComboboxItem } from '@/components/ui/select-combobox'
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

const METHOD_ITEMS: ComboboxItem[] = PAYMENT_METHODS.map((m) => ({
  value: m,
  label: PAYMENT_METHOD_META[m].label,
}))

function formatAmount(amount: number, currency: PaymentCurrency) {
  return currency === 'BS' ? formatBs(amount) : formatUsd(amount)
}

export default function ReportePagosPage() {
  const api = useApi()
  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const [methods, setMethods] = useState<string[]>([])
  const [report, setReport] = useState<PaymentsReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getPaymentsReport({
        ...rangeQuery(range),
        method: methods.length > 0 ? methods.join(',') : undefined,
      })
      setReport(data)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando reporte')
    } finally {
      setLoading(false)
    }
  }, [api, range, methods])

  useEffect(() => {
    void load()
  }, [load])

  function exportCsv() {
    if (!report || report.payments.length === 0) return
    let csv = toCsv(
      ['Método', 'Moneda', 'Pagos', 'Monto', 'Equivalente USD'],
      report.byMethod.map((row) => [
        PAYMENT_METHOD_META[row.method].label,
        row.currency,
        row.count,
        row.amount.toFixed(2),
        row.amountUsd.toFixed(2),
      ]),
    )
    csv += `\r\n\r\nDetalle\r\n${toCsv(
      ['Fecha', 'Venta', 'Cliente', 'Cédula', 'Método', 'Moneda', 'Monto', 'USD', 'Tasa', 'Cuenta', 'Agente'],
      report.payments.map((p) => [
        csvDateTime(p.paidAt),
        p.saleId,
        p.customerName,
        p.customerCedula ?? '',
        PAYMENT_METHOD_META[p.method].label,
        p.currency,
        p.amount.toFixed(2),
        p.amountUsd.toFixed(2),
        p.rateUsed ?? '',
        p.accountAlias ?? '',
        p.agentName ?? '',
      ]),
    )}`
    downloadCsv(`pagos_${rangeLabel(range)}`, csv)
  }

  return (
    <PageContainer wide>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportRange value={range} onChange={setRange} />
        <div className="flex flex-wrap items-center gap-2">
          <SelectCombobox
            multiple
            className="w-48"
            items={METHOD_ITEMS}
            value={methods}
            onChange={setMethods}
            placeholder="Todo método"
            aria-label="Filtrar por método de pago"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!report || report.payments.length === 0}
          >
            <Download className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : !report || report.payments.length === 0 ? (
        <EmptyState icon={Wallet} title="No hay pagos en este período." />
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-lg font-medium text-gray-900">
              Por tipo de pago
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Método</th>
                    <th className="px-3 py-2 text-right font-medium">Pagos</th>
                    <th className="px-3 py-2 text-right font-medium">Monto</th>
                    <th className="px-3 py-2 text-right font-medium">Equivalente USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.byMethod.map((row) => (
                    <tr key={row.method}>
                      <td className="px-3 py-2 text-gray-900">
                        {PAYMENT_METHOD_META[row.method].label}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {row.count}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900">
                        {formatAmount(row.amount, row.currency)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">
                        {formatUsd(row.amountUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50 font-medium">
                  <tr>
                    <td className="px-3 py-2 text-gray-600">Total</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {report.totals.count}
                    </td>
                    <td />
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">
                      {formatUsd(report.totals.amountUsd)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-gray-900">Detalle</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Cliente</th>
                    <th className="px-3 py-2 font-medium">Método</th>
                    <th className="px-3 py-2 text-right font-medium">Monto</th>
                    <th className="px-3 py-2 text-right font-medium">USD</th>
                    <th className="px-3 py-2 font-medium">Cuenta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                        <Link
                          href={`/ventas/${p.saleId}`}
                          className="hover:text-violet-700 hover:underline"
                        >
                          {formatDateTime(p.paidAt)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-900">{p.customerName}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                        {PAYMENT_METHOD_META[p.method].label}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900">
                        {formatAmount(p.amount, p.currency)}
                        {p.rateUsed != null && (
                          <span className="block text-xs text-gray-500">
                            tasa {p.rateUsed.toLocaleString('es-VE')}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">
                        {formatUsd(p.amountUsd)}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{p.accountAlias ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PageContainer>
  )
}
