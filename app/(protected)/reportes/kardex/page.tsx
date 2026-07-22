'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import type { KardexReport, KardexSection, MovementType, Product } from '@/types'
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

export default function ReporteKardexPage() {
  const api = useApi()
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const [report, setReport] = useState<KardexReport | null>(null)
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

  const selected = products.find((p) => p.id === productId)
  const variants = selected?.variants.filter((v) => v.active) ?? []

  const load = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    try {
      const data = await api.getKardex({
        productId,
        variantId: variantId || undefined,
        ...rangeQuery(range),
      })
      setReport(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando kardex')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [api, productId, variantId, range])

  useEffect(() => {
    void load()
  }, [load])

  function exportCsv() {
    if (!report) return
    const rows: (string | number)[][] = []
    for (const section of report.sections) {
      const scope = section.variantName ?? report.product.name
      rows.push([scope, '', 'SALDO INICIAL', '', '', '', section.opening, '', ''])
      for (const m of section.movements) {
        rows.push([
          scope,
          csvDateTime(m.createdAt),
          m.type,
          m.entrada || '',
          m.salida || '',
          m.balance,
          '',
          m.agentName ?? '',
          m.note ?? '',
        ])
      }
      rows.push([
        scope,
        '',
        'SALDO FINAL',
        section.totalIn,
        section.totalOut,
        section.closing,
        '',
        '',
        '',
      ])
    }
    const csv = toCsv(
      [
        'Ámbito',
        'Fecha',
        'Tipo',
        'Entrada',
        'Salida',
        'Saldo',
        'Saldo inicial',
        'Agente',
        'Nota',
      ],
      rows,
    )
    downloadCsv(
      `kardex_${report.product.name.replace(/\s+/g, '-')}_${rangeLabel(range)}`,
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
            onChange={(e) => {
              setProductId(e.target.value)
              setVariantId('')
            }}
          >
            {products.length === 0 && <option value="">Sin productos</option>}
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {variants.length > 0 && (
            <select
              className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            >
              <option value="">Todas las variantes</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!report}
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
          Elige un producto para ver su kardex.
        </div>
      ) : (
        report.sections.map((section) => (
          <KardexTable
            key={section.variantId ?? 'product'}
            section={section}
            productName={report.product.name}
          />
        ))
      )}
    </div>
  )
}

function KardexTable({
  section,
  productName,
}: {
  section: KardexSection
  productName: string
}) {
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-gray-700">
          {section.variantName ? `${productName} · ${section.variantName}` : productName}
        </h2>
        <p className="text-xs text-gray-500">
          Inicial {section.opening} · Entradas {section.totalIn} · Salidas{' '}
          {section.totalOut} · Final{' '}
          <span className="font-medium text-gray-900">{section.closing}</span>
          {section.closing !== section.onHand && (
            <span className="text-amber-700"> · físico hoy {section.onHand}</span>
          )}
        </p>
      </div>

      {section.truncated && (
        <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          Demasiados movimientos: se muestran los primeros del período. Acota el
          rango de fechas para ver el resto.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 text-right font-medium">Entrada</th>
              <th className="px-3 py-2 text-right font-medium">Salida</th>
              <th className="px-3 py-2 text-right font-medium">Saldo</th>
              <th className="px-3 py-2 font-medium">Quién</th>
              <th className="px-3 py-2 font-medium">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="bg-gray-50/60 text-gray-600">
              <td className="px-3 py-2" colSpan={4}>
                Saldo inicial
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums">
                {section.opening}
              </td>
              <td colSpan={2} />
            </tr>
            {section.movements.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-gray-500" colSpan={7}>
                  Sin movimientos en el período.
                </td>
              </tr>
            ) : (
              section.movements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                    {new Date(m.createdAt).toLocaleString('es-VE', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${TYPE_STYLE[m.type]}`}
                    >
                      {m.type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-700">
                    {m.entrada || ''}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-700">
                    {m.salida || ''}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums text-gray-900">
                    {m.balance}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {m.agentName ?? '—'}
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
              ))
            )}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50 font-medium">
            <tr>
              <td className="px-3 py-2 text-gray-600" colSpan={2}>
                Totales
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-green-700">
                {section.totalIn}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-red-700">
                {section.totalOut}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                {section.closing}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
