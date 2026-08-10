'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import type { DeliveryNote } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUsd } from '@/lib/ventas/money'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

function formatNoteNumber(n: number) {
  return `NE-${String(n).padStart(5, '0')}`
}

export default function EntregaDetailPage() {
  const params = useParams<{ id: string }>()
  const api = useApi()
  const [note, setNote] = useState<DeliveryNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [voiding, setVoiding] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const n = await api.getDeliveryNote(params.id)
      setNote(n)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando nota')
    } finally {
      setLoading(false)
    }
  }, [api, params.id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleVoid() {
    if (!note) return
    setVoiding(true)
    try {
      const updated = await api.voidDeliveryNote(note.id)
      setNote(updated)
      notify.success('Nota anulada · stock restaurado')
      setVoidOpen(false)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo anular')
    } finally {
      setVoiding(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto bg-gray-50">
        <PageContainer>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </PageContainer>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-500">
        <p>Nota no encontrada</p>
        <Link href="/entregas" className={buttonVariants({ variant: 'outline' })}>
          Volver
        </Link>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <PageContainer className="pb-16">
        <div>
          <Link
            href="/entregas"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="size-4" />
            Entregas
          </Link>
          <PageHeader
            title={formatNoteNumber(note.number)}
            description={
              <>
                {formatDateTime(note.createdAt)}
                {note.agentName ? ` · ${note.agentName}` : ''}
              </>
            }
            actions={
              <>
                <StatusBadge status={note.status} />
                {!note.showValue && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                    Sin valores
                  </Badge>
                )}
              </>
            }
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/entregas/${note.id}/imprimir`}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'inline-flex items-center gap-1',
            )}
          >
            <Printer className="size-4" />
            Imprimir
          </Link>
          {note.status === 'ACTIVA' && (
            <Button
              type="button"
              variant="destructive"
              disabled={voiding}
              onClick={() => setVoidOpen(true)}
            >
              Anular
            </Button>
          )}
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <h2 className="mb-2 text-lg font-medium text-gray-900">Cliente</h2>
          <p className="font-medium">{note.customer.name}</p>
          {note.customer.cedula && (
            <p className="text-gray-600">Cédula: {note.customer.cedula}</p>
          )}
          {note.customer.phone && (
            <p className="text-gray-600">Tel: {note.customer.phone}</p>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium">Variante</th>
                <th className="px-3 py-2 text-right font-medium">Cant.</th>
                {note.showValue && (
                  <>
                    <th className="px-3 py-2 text-right font-medium">P. unit.</th>
                    <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {note.items.map((it) => (
                <tr key={it.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2">
                    {it.product?.name ?? it.productId}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {it.variant?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-sm">
                    {it.quantity}
                  </td>
                  {note.showValue && (
                    <>
                      <td className="px-3 py-2 text-right tabular-nums text-sm">
                        {formatUsd(it.unitPriceUsd)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-sm">
                        {formatUsd(it.subtotalUsd)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {note.showValue && (
            <div className="flex justify-end border-t border-gray-200 px-3 py-3 tabular-nums text-sm font-semibold">
              Total {formatUsd(note.totalUsd)}
            </div>
          )}
        </section>

        {note.note && (
          <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <h2 className="mb-1 text-lg font-medium text-gray-900">Observaciones</h2>
            <p className="text-gray-700">{note.note}</p>
          </section>
        )}

        {note.status === 'ANULADA' && note.voidedAt && (
          <p className="text-sm text-red-600">
            Anulada el {formatDateTime(note.voidedAt)}
            {note.voidedBy ? ` por ${note.voidedBy}` : ''}
          </p>
        )}
      </PageContainer>

      <ConfirmDialog
        open={voidOpen}
        title="Anular nota de entrega"
        description="¿Anular esta nota? Se devolverá el stock descontado al inventario."
        confirmLabel="Anular"
        loadingLabel="Anulando…"
        loading={voiding}
        onOpenChange={(open) => {
          if (!open && !voiding) setVoidOpen(false)
        }}
        onConfirm={() => void handleVoid()}
      />
    </div>
  )
}
