'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import type { MovementType, Product, ProductMovementsReport } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DEFAULT_RANGE,
  ReportRange,
  rangeLabel,
  rangeQuery,
  type RangeState,
} from '@/components/reportes/ReportRange'
import { csvDateTime, downloadCsv, toCsv } from '@/lib/reports/csv'

const TYPE_STYLE: Record<MovementType, string> = {
  ENTRADA: 'bg-green-50 text-green-800 border-green-200',
  SALIDA: 'bg-red-50 text-red-700 border-red-200',
  AJUSTE: 'bg-amber-50 text-amber-800 border-amber-200',
}

function ReporteMovimientosInner() {
  const api = useApi()
  const searchParams = useSearchParams()
  const initialProductId = searchParams.get('productId') ?? ''

  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState(initialProductId)
  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const [report, setReport] = useState<ProductMovementsReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api
      .getProducts()
      .then((list) => {
        setProducts(list)
        setProductId((prev) => prev || list[0]?.id || '')
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Error cargando productos')
      })
  }, [api])

  const load = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    try {
      const data = await api.getProductMovementsReport({
        productId,
        ...rangeQuery(range),
      })
      setReport(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando movimientos')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [api, productId, range])

  useEffect(() => {
    void load()
  }, [load])

  function exportCsv() {
    if (!report) return
    const csv = toCsv(
      ['Fecha', 'Tipo', 'Cantidad', 'Variante', 'Agente', 'Nota', 'Venta'],
      report.movements.map((m) => [
        csvDateTime(m.createdAt),
        m.type,
        m.delta > 0 ? `+${m.delta}` : String(m.delta),
        m.variantName ?? '',
        m.agentName ?? '',
        m.note ?? '',
        m.saleId ?? '',
      ]),
    )
    downloadCsv(
      `movimientos_${report.product.name.replace(/\s+/g, '-')}_${rangeLabel(range)}`,
      csv,
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportRange value={range} onChange={setRange} />
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 max-w-[14rem] rounded-md border border-gray-200 bg-white px-2 text-sm"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.length === 0 && <option value="">Sin productos</option>}
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!report || report.movements.length === 0}
          >
            <Download className="mr-1 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : !report ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Elige un producto para ver sus movimientos.
        </div>
      ) : (
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-gray-700">
              {report.product.name}
              {report.product.sku ? (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {report.product.sku}
                </span>
              ) : null}
            </h2>
            <p className="text-xs text-gray-500">
              Entradas{' '}
              <span className="font-medium text-green-700">
                {report.totals.totalIn}
              </span>
              {' · '}
              Salidas{' '}
              <span className="font-medium text-red-700">
                {report.totals.totalOut}
              </span>
              {' · '}
              {report.totals.count} movimientos
            </p>
          </div>

          {report.truncated && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
              Demasiados movimientos: se muestran los más recientes del
              período. Acota el rango de fechas para ver el resto.
            </p>
          )}

          {report.movements.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              Sin movimientos en el período.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 text-right font-medium">Cant.</th>
                    <th className="px-3 py-2 font-medium">Variante</th>
                    <th className="px-3 py-2 font-medium">Quién</th>
                    <th className="px-3 py-2 font-medium">Cuándo</th>
                    <th className="px-3 py-2 font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.movements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${TYPE_STYLE[m.type]}`}
                        >
                          {m.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {m.delta > 0 ? '+' : ''}
                        {m.delta}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {m.variantName ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {m.agentName ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">
                        {new Date(m.createdAt).toLocaleString('es-VE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-2 text-xs text-gray-500">
                        {m.saleId ? (
                          <Link
                            href={`/ventas/${m.saleId}`}
                            className="text-violet-700 hover:underline"
                          >
                            {m.note ?? 'Ver venta'}
                          </Link>
                        ) : (
                          (m.note ?? '—')
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default function ReporteMovimientosPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-gray-500">Cargando movimientos…</div>
      }
    >
      <ReporteMovimientosInner />
    </Suspense>
  )
}
