'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { ExchangeRateRow, ExchangeRates, Product, Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { SaleForm } from '@/components/ventas/SaleForm'

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
          toast.error('Solo se pueden editar ventas pendientes sin pagos')
          router.replace(`/ventas/${s.id}`)
          return
        }
        setSale(s)
        setProducts(prods)
        setRates(nextRates)
        setRateHistory(history.items)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error cargando datos')
      } finally {
        setLoading(false)
      }
    })()
  }, [api, params.id, router])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Cargando…
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
