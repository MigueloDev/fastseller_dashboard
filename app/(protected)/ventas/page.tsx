'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, ShoppingCart } from 'lucide-react'
import type { ReceivablesResponse, Sale, SaleStatus } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Badge } from '@/components/ui/badge'
import { ReceivablesCard } from '@/components/ventas/ReceivablesCard'
import { balanceLabel, formatUsd } from '@/lib/ventas/money'
import { cn } from '@/lib/utils'

function statusBadge(sale: Sale) {
  if (sale.status === 'PAGADA') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pagada</Badge>
  }
  if (sale.status === 'ANULADA') {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Anulada</Badge>
  }
  const hasPayments = sale.payments.length > 0
  return (
    <Badge
      className={cn(
        hasPayments
          ? 'bg-amber-100 text-amber-900 hover:bg-amber-100'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-100',
      )}
    >
      {hasPayments ? 'Abonada' : 'Pendiente'}
    </Badge>
  )
}

export default function VentasPage() {
  const api = useApi()
  const [sales, setSales] = useState<Sale[]>([])
  const [receivables, setReceivables] = useState<ReceivablesResponse | null>(null)
  const [status, setStatus] = useState<SaleStatus | ''>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [page, recv] = await Promise.all([
        api.getSales({ status: status || undefined, limit: 50 }),
        api.getReceivables().catch(() => null),
      ])
      setSales(page.items)
      setReceivables(recv)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando ventas')
    } finally {
      setLoading(false)
    }
  }, [api, status])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-violet-600" />
          <h1 className="text-lg font-semibold text-gray-900">Ventas</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as SaleStatus | '')}
          >
            <option value="">Todas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="PAGADA">Pagadas</option>
            <option value="ANULADA">Anuladas</option>
          </select>
          <Link
            href="/ventas/nueva"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
        <ReceivablesCard data={receivables} loading={loading && !receivables} />

        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : sales.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No hay ventas todavía.</p>
            <Link
              href="/ventas/nueva"
              className="mt-3 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              Crear primera venta
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {sales.map((sale) => (
              <li key={sale.id}>
                <Link
                  href={`/ventas/${sale.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {sale.customer?.name ?? 'Cliente'}
                      </span>
                      {statusBadge(sale)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(sale.createdAt).toLocaleString('es', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      {sale.agentName ? ` · ${sale.agentName}` : ''}
                      {' · '}
                      {sale.priceRef === 'REF_USD' ? 'Divisas' : 'Bolívares'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-gray-900">
                      {formatUsd(sale.totalUsd)}
                    </p>
                    {sale.status === 'PENDIENTE' && (
                      <p className="text-xs text-amber-800">
                        Falta{' '}
                        {balanceLabel(
                          sale.balanceUsd,
                          sale.balanceBs,
                          sale.bsRate,
                        )}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
