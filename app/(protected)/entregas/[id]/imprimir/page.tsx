'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { notify as toast } from '@/lib/toast'
import { ArrowLeft, Printer } from 'lucide-react'
import type { DeliveryNote } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button, buttonVariants } from '@/components/ui/button'
import { DeliveryNotePrint } from '@/components/entregas/DeliveryNotePrint'
import { cn } from '@/lib/utils'

export default function EntregaImprimirPage() {
  const params = useParams<{ id: string }>()
  const api = useApi()
  const [note, setNote] = useState<DeliveryNote | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const n = await api.getDeliveryNote(params.id)
      setNote(n)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando nota')
    } finally {
      setLoading(false)
    }
  }, [api, params.id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Cargando…
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
    <div className="h-full overflow-auto bg-white">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur">
        <Link
          href={`/entregas/${note.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <Button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>
      <DeliveryNotePrint note={note} />
      <p className={cn('print:hidden px-6 pb-8 text-center text-xs text-gray-400')}>
        Usa el diálogo del navegador para imprimir o guardar como PDF.
      </p>
    </div>
  )
}
