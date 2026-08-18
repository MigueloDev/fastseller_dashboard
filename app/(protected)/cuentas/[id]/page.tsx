'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, Pencil, Plus, Wallet } from 'lucide-react'
import type { CashAccountDetail } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { AccountFormDialog } from '@/components/cuentas/AccountFormDialog'
import { CashMovementDialog } from '@/components/cuentas/CashMovementDialog'
import {
  DEFAULT_RANGE,
  rangeLabel,
  rangeQuery,
  ReportRange,
  type RangeState,
} from '@/components/reportes/ReportRange'
import { formatBs, formatUsd } from '@/lib/ventas/money'
import { formatDateTime } from '@/lib/format'
import { csvDateTime, downloadCsv, toCsv } from '@/lib/reports/csv'

function money(currency: 'BS' | 'USD', n: number) {
  return currency === 'BS' ? formatBs(n) : formatUsd(n)
}

function originLabel(m: CashAccountDetail['movements'][number]) {
  if (m.paymentId) return 'Pago'
  if (m.currencyPurchaseId) return 'Conversión'
  if (m.reason === 'GASTO') return 'Gasto'
  if (m.reason === 'PRESTAMO') {
    return m.type === 'SALIDA' ? 'Préstamo otorgado' : 'Cobro préstamo'
  }
  return 'Manual'
}

export default function CuentaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const api = useApi()
  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const [detail, setDetail] = useState<CashAccountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const row = await api.getCashAccount(id, rangeQuery(range))
      setDetail(row)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando cuenta')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [api, id, range])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  function exportCsv() {
    if (!detail) return
    const headers = [
      'Fecha',
      'Tipo',
      'Motivo',
      'Monto',
      'Delta',
      'Saldo',
      'Origen',
      'Nota',
      'Agente',
    ]
    const rows = [
      ['', 'Saldo inicial', '', '', '', detail.opening, '', '', ''],
      ...detail.movements.map((m) => [
        csvDateTime(m.createdAt),
        m.type,
        m.reason,
        m.amount,
        m.delta,
        m.balance ?? '',
        originLabel(m),
        m.note,
        m.agentName,
      ]),
    ]
    downloadCsv(
      `cuenta_${detail.alias}_${rangeLabel(range)}`,
      toCsv(headers, rows),
    )
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <PageContainer wide>
        <PageHeader
          title={detail?.alias ?? 'Cuenta'}
          description={
            detail
              ? `${detail.holder} · ${detail.institution}`
              : undefined
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/cuentas"
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-[0.8rem] font-medium hover:bg-gray-50"
              >
                <ArrowLeft className="size-3.5" />
                Cuentas
              </Link>
              {detail && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormOpen(true)}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportCsv}
                    disabled={!detail.movements.length && detail.opening === 0}
                  >
                    <Download className="size-4" />
                    CSV
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setMoveOpen(true)}
                  >
                    <Plus className="size-4" />
                    Movimiento
                  </Button>
                </>
              )}
            </div>
          }
        />

        {loading ? (
          <TableSkeleton rows={8} />
        ) : !detail ? (
          <EmptyState icon={Wallet} title="Cuenta no encontrada.">
            <Link
              href="/cuentas"
              className="inline-flex h-8 items-center rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Volver
            </Link>
          </EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-xs text-gray-500">Saldo actual</p>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">
                    {money(detail.currency, detail.balance)}
                  </p>
                  {!detail.active && (
                    <p className="text-xs text-amber-800">Cuenta inactiva</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gastos</p>
                  <p className="text-lg font-medium tabular-nums text-red-600">
                    {money(detail.currency, detail.totals?.gastos ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Prestados</p>
                  <p className="text-lg font-medium tabular-nums text-red-600">
                    {money(detail.currency, detail.totals?.prestamosOtorgados ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cobrados</p>
                  <p className="text-lg font-medium tabular-nums text-green-700">
                    {money(detail.currency, detail.totals?.prestamosCobrados ?? 0)}
                  </p>
                </div>
              </div>
              <ReportRange value={range} onChange={setRange} />
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 text-right font-medium">Monto</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                    <th className="px-3 py-2 font-medium">Origen</th>
                    <th className="px-3 py-2 font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="bg-gray-50/60 text-gray-600">
                    <td className="px-3 py-2" colSpan={3}>
                      Saldo inicial
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {money(detail.currency, detail.opening)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                  {detail.movements.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-4 text-center text-gray-500"
                        colSpan={6}
                      >
                        Sin movimientos en el período.
                      </td>
                    </tr>
                  ) : (
                    detail.movements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                          {formatDateTime(m.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={m.type} />
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            m.delta < 0 ? 'text-red-600' : 'text-green-700'
                          }`}
                        >
                          {money(detail.currency, m.amount)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">
                          {money(detail.currency, m.balance ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {m.currencyPurchaseId ? (
                            <Link
                              href="/conversiones"
                              className="text-violet-700 hover:underline"
                            >
                              Conversión
                            </Link>
                          ) : (
                            originLabel(m)
                          )}
                        </td>
                        <td className="max-w-[14rem] truncate px-3 py-2 text-xs text-gray-500">
                          {m.note ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </PageContainer>

      {detail && (
        <>
          <AccountFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            account={detail}
            onSaved={() => void load()}
          />
          <CashMovementDialog
            open={moveOpen}
            accountId={detail.id}
            currency={detail.currency}
            onOpenChange={setMoveOpen}
            onSaved={() => void load()}
          />
        </>
      )}
    </div>
  )
}
