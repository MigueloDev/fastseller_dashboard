'use client'

import { useEffect, useState } from 'react'
import type { Product } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { DeliveryNoteForm } from '@/components/entregas/DeliveryNoteForm'
import { Skeleton } from '@/components/ui/skeleton'

export default function NuevaEntregaPage() {
  const api = useApi()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const prods = await api.getProducts(false)
        setProducts(prods)
      } catch (err) {
        notify.error(err instanceof Error ? err.message : 'Error cargando datos')
      } finally {
        setLoading(false)
      }
    })()
  }, [api])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <DeliveryNoteForm products={products} />
    </div>
  )
}
