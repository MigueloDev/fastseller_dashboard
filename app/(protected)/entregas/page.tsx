'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Printer, Truck } from 'lucide-react'
import type { DeliveryNote, DeliveryNoteStatus } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button, buttonVariants } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatUsd } from '@/lib/ventas/money'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

function formatNoteNumber(n: number) {
  return `NE-${String(n).padStart(5, '0')}`
}

export default function EntregasPage() {
  const api = useApi()
  const [notes, setNotes] = useState<DeliveryNote[]>([])
  const [status, setStatus] = useState<DeliveryNoteStatus | ''>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const page = await api.getDeliveryNotes({
        status: status || undefined,
        limit: 50,
      })
      setNotes(page.items)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando entregas')
    } finally {
      setLoading(false)
    }
  }, [api, status])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <PageContainer>
        <PageHeader
          title="Notas de entrega"
          actions={
            <>
              <select
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm"
                value={status}
                onChange={(e) =>
                  setStatus((e.target.value || '') as DeliveryNoteStatus | '')
                }
              >
                <option value="">Todas</option>
                <option value="ACTIVA">Activas</option>
                <option value="ANULADA">Anuladas</option>
              </select>
              <Button
                variant="primary"
                render={<Link href="/entregas/nueva" />}
              >
                <Plus className="size-4" />
                Nueva nota
              </Button>
            </>
          }
        />

        {loading ? (
          <TableSkeleton columns={6} rows={5} />
        ) : notes.length === 0 ? (
          <EmptyState icon={Truck} title="No hay notas de entrega.">
            <Button
              variant="primary"
              render={<Link href="/entregas/nueva" />}
            >
              <Plus className="size-4" />
              Crear nota
            </Button>
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Número</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Ítems</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {notes.map((n) => {
                  const itemsSummary = n.items
                    .map(
                      (it) =>
                        `${it.quantity}× ${it.product?.name ?? 'producto'}`,
                    )
                    .join(', ')
                  return (
                    <tr
                      key={n.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-2">
                        <Link
                          href={`/entregas/${n.id}`}
                          className="tabular-nums text-sm font-medium text-violet-700 hover:underline"
                        >
                          {formatNoteNumber(n.number)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {formatDateTime(n.createdAt)}
                      </td>
                      <td className="px-3 py-2">{n.customer.name}</td>
                      <td
                        className="max-w-[220px] truncate px-3 py-2 text-gray-600"
                        title={itemsSummary}
                      >
                        {itemsSummary}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-sm">
                        {n.showValue ? formatUsd(n.totalUsd) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={n.status} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/entregas/${n.id}/imprimir`}
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'icon' }),
                            'text-gray-500',
                          )}
                          title="Imprimir"
                        >
                          <Printer className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageContainer>
    </div>
  )
}
