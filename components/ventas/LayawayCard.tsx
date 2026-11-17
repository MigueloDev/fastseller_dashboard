'use client'

import { useState } from 'react'
import { CalendarClock, Download, Link2 } from 'lucide-react'
import type { Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { downloadBlob } from '@/lib/download'
import { formatDate } from '@/lib/format'
import { formatUsd } from '@/lib/ventas/money'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'

const contractNo = (n: number) => String(n).padStart(5, '0')

/** Cronograma del apartado (recalculado por el backend) + contrato PDF y enlace público. */
export function LayawayCard({ sale }: { sale: Sale }) {
  const api = useApi()
  const [busy, setBusy] = useState<'pdf' | 'link' | null>(null)
  const { layaway, schedule } = sale
  if (!layaway || !schedule) return null

  async function download() {
    setBusy('pdf')
    try {
      const blob = await api.getSaleContractPdf(sale.id)
      downloadBlob(`contrato-apartado-${contractNo(layaway!.number)}.pdf`, blob)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error descargando el contrato')
    } finally {
      setBusy(null)
    }
  }

  async function copyLink() {
    setBusy('link')
    try {
      const { url, expiresAt } = await api.createContractLink(sale.id)
      await navigator.clipboard.writeText(url)
      notify.success(`Enlace copiado · vence ${formatDate(expiresAt)}`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error generando el enlace')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900">
          <CalendarClock className="size-5" /> Apartado N° {contractNo(layaway.number)}
          {schedule.overdue && <StatusBadge status="VENCIDO" />}
        </h2>
        {sale.status !== 'ANULADA' && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void download()}>
              <Download className="mr-1 size-4" />
              {busy === 'pdf' ? 'Generando…' : 'Contrato PDF'}
            </Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void copyLink()}>
              <Link2 className="mr-1 size-4" />
              {busy === 'link' ? 'Generando…' : 'Copiar enlace'}
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="py-1.5 pr-2 font-medium">Pago</th>
              <th className="py-1.5 pr-2 font-medium">Fecha límite</th>
              <th className="py-1.5 pr-2 text-right font-medium">Monto</th>
              <th className="py-1.5 pr-2 text-right font-medium">Pagado</th>
              <th className="py-1.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {schedule.rows.map((r, i) => (
              <tr key={r.label} className={i === schedule.next?.index ? 'bg-violet-50/60' : undefined}>
                <td className="py-1.5 pr-2 text-gray-900">{r.label}</td>
                <td className="py-1.5 pr-2 tabular-nums text-gray-700">{formatDate(r.dueAt)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-gray-900">{formatUsd(r.expectedUsd)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-gray-700">
                  {r.paidUsd > 0 ? formatUsd(r.paidUsd) : '—'}
                </td>
                <td className="py-1.5">
                  {r.status !== 'PENDIENTE' && <StatusBadge status={r.status} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 tabular-nums">
        Abonado {formatUsd(schedule.paidUsd)} · Resta {formatUsd(schedule.remainingUsd)} · Plazo máx.{' '}
        {formatDate(schedule.deadlineAt)} ({layaway.deadlineDays} días)
        {schedule.overdue && ` · Penalidad si desiste/vence: ${formatUsd(schedule.penaltyUsd)}`}
      </p>
    </section>
  )
}
