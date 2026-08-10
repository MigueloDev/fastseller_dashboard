'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ExchangeRateRow, ExchangeRates, Product, Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { SaleForm } from '@/components/ventas/SaleForm'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditarVentaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const api = useApi()
  const [products, setProducts] = useState<Product[]>([])
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [rateHistory, setRateHistory] = useState<ExchangeRateRow[]>([])
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [s, prods, nextRates, history] = await Promise.all([
          api.getSale(params.id),
          api.getProducts(false),
          api.getRates().catch(() => null),
          api.getRatesHistory().catch(() => ({ items: [] as ExchangeRateRow[] })),
        ])
        if (s.status !== 'PENDIENTE' || s.payments.length > 0) {
          notify.error('Solo se pueden editar ventas pendientes sin pagos')
          router.replace(`/ventas/${s.id}`)
          return
        }
        setSale(s)
        setProducts(prods)
        setRates(nextRates)
        setRateHistory(history.items)
      } catch (err) {
        notify.error(err instanceof Error ? err.message : 'Error cargando datos')
      } finally {
        setLoading(false)
      }
    })()
  }, [api, params.id, router])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="p-4 text-sm text-gray-500">Venta no encontrada.</div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <SaleForm
        products={products}
        rates={rates}
        rateHistory={rateHistory}
        initialSale={sale}
      />
    </div>
  )
}
