'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { ExchangeRateRow, ExchangeRates, Product } from '@/types'
import { useApi } from '@/hooks/useApi'
import { SaleForm } from '@/components/ventas/SaleForm'

export default function NuevaVentaPage() {
  const api = useApi()
  const [products, setProducts] = useState<Product[]>([])
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [rateHistory, setRateHistory] = useState<ExchangeRateRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [prods, nextRates, history] = await Promise.all([
          api.getProducts(false),
          api.getRates().catch(() => null),
          api.getRatesHistory().catch(() => ({ items: [] as ExchangeRateRow[] })),
        ])
        setProducts(prods)
        setRates(nextRates)
        setRateHistory(history.items)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error cargando datos')
      } finally {
        setLoading(false)
      }
    })()
  }, [api])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Cargando…
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <SaleForm products={products} rates={rates} rateHistory={rateHistory} />
    </div>
  )
}
