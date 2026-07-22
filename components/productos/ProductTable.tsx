'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import type {
  ExchangeRates,
  Product,
  ProductStockDetail,
  StockSummaryItem,
} from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { MovementHistory } from './MovementHistory'

/** Alert when stored implicit gap drifts > 5pp from live market gap. */
export const GAP_ALERT_THRESHOLD = 0.05

type Props = {
  products: Product[]
  stock: StockSummaryItem[]
  rates?: ExchangeRates | null
  onEdit: (product: Product) => void
  onToggleActive: (product: Product) => void
  onAdjust: (product: Product) => void
}

function amountFor(product: Product, ref: 'REF_USD' | 'REF_BS'): number | null {
  const active = product.prices.filter((p) => p.ref === ref && p.active !== false)
  const price =
    active.find((p) => (p.minQty ?? 1) === 1) ??
    active.sort((a, b) => (a.minQty ?? 1) - (b.minQty ?? 1))[0] ??
    product.prices.find((p) => p.ref === ref)
  if (!price) return null
  const n = Number(price.amount)
  return Number.isFinite(n) ? n : null
}

function tierCount(product: Product): number {
  const mins = new Set(
    product.prices
      .filter((p) => p.active !== false)
      .map((p) => p.minQty ?? 1),
  )
  return mins.size
}

function formatUsd(amount: number | null): string {
  if (amount == null) return '—'
  return `$${amount.toFixed(2)}`
}

function gapDrift(product: Product, liveGap: number | null): number | null {
  if (liveGap == null) return null
  const usd = amountFor(product, 'REF_USD')
  const bs = amountFor(product, 'REF_BS')
  if (usd == null || bs == null || usd <= 0) return null
  const implicit = bs / usd - 1
  return Math.abs(implicit - liveGap)
}

function stockForProduct(stock: StockSummaryItem[], productId: string) {
  return stock.filter((s) => s.productId === productId)
}

function StockCell({ items }: { items: StockSummaryItem[] }) {
  const total = items.reduce((sum, i) => sum + i.quantity, 0)
  const committed = items.reduce((sum, i) => sum + i.committed, 0)
  const available = items.reduce((sum, i) => sum + i.available, 0)
  const low = items.some((i) => i.lowStock)

  if (items.length === 0 || total === 0) {
    return (
      <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600">
        sin stock
      </Badge>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="tabular-nums text-sm font-medium">{available}</span>
        <span className="text-[10px] text-muted-foreground">disp.</span>
        {low && (
          <Badge
            variant="secondary"
            className="text-[10px] bg-red-50 text-red-700 border-red-200"
          >
            bajo
          </Badge>
        )}
      </div>
      {committed > 0 && (
        <p className="text-[10px] text-amber-700">
          {total} en físico · {committed} comprometidas
        </p>
      )}
    </div>
  )
}

function ExpandedStock({ productId }: { productId: string }) {
  const api = useApi()
  const [detail, setDetail] = useState<ProductStockDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .getProductStock(productId, 10)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [api, productId])

  if (loading) {
    return <p className="text-xs text-muted-foreground py-2">Cargando stock…</p>
  }
  if (error) {
    return <p className="text-xs text-red-600 py-2">{error}</p>
  }
  if (!detail) return null

  const variantNames = Object.fromEntries(
    detail.levels
      .filter((l) => l.variantId && l.variantName)
      .map((l) => [l.variantId!, l.variantName!]),
  )

  return (
    <div className="space-y-3 py-2">
      <div className="flex flex-wrap gap-2">
        {detail.levels.map((l) => (
          <Badge
            key={l.variantId ?? 'product'}
            variant="secondary"
            className={`text-[10px] ${
              l.lowStock
                ? 'bg-red-50 text-red-700 border-red-200'
                : l.available === 0
                  ? 'bg-gray-100 text-gray-600'
                  : ''
            }`}
          >
            {l.variantName ?? 'Total'}: {l.available} disp.
            {l.committed > 0 ? ` (${l.quantity} físico)` : ''}
          </Badge>
        ))}
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-gray-700">Últimos movimientos</p>
          <Link
            href={`/reportes/movimientos?productId=${productId}`}
            className="text-xs text-violet-700 hover:underline"
          >
            Ver reporte
          </Link>
        </div>
        <MovementHistory
          movements={detail.movements}
          variantNames={variantNames}
        />
      </div>
    </div>
  )
}

export function ProductTable({
  products,
  stock,
  rates = null,
  onEdit,
  onToggleActive,
  onAdjust,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <Table className="min-w-215 table-fixed">
        <TableHeader>
          <TableRow className="bg-gray-50/80">
            <TableHead className="h-8 w-8 px-1" />
            <TableHead className="h-8 w-[25%]">Nombre</TableHead>
            <TableHead className="h-8 w-[11%]">SKU</TableHead>
            <TableHead className="h-8 w-[12%]">Stock</TableHead>
            <TableHead className="h-8 w-[17%]">Variantes</TableHead>
            <TableHead className="h-8 w-[7%]">USD</TableHead>
            <TableHead className="h-8 w-[10%]">Bs (USD)</TableHead>
            <TableHead className="h-8 w-[6%]">Activo</TableHead>
            <TableHead className="h-8 w-16 px-1" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const activeVariants = p.variants.filter((v) => v.active)
            const drift = gapDrift(p, rates?.gap ?? null)
            const alert = drift != null && drift > GAP_ALERT_THRESHOLD
            const items = stockForProduct(stock, p.id)
            const isOpen = expanded === p.id
            return (
              <Fragment key={p.id}>
                <TableRow className={!p.active ? 'opacity-60' : undefined}>
                  <TableCell className="px-1 py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setExpanded(isOpen ? null : p.id)}
                      aria-label={isOpen ? 'Colapsar' : 'Expandir stock'}
                    >
                      {isOpen ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-normal py-1.5 leading-tight">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.brand && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{p.brand}</div>
                    )}
                  </TableCell>
                  <TableCell className="overflow-hidden text-ellipsis py-1.5 font-mono text-xs text-gray-600">
                    {p.sku || '—'}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <StockCell items={items} />
                  </TableCell>
                  <TableCell className="whitespace-normal py-1.5">
                    {activeVariants.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <span className="text-xs leading-4 text-gray-700">
                        {activeVariants.map((v) => v.name).join(' · ')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-1.5 tabular-nums">
                    <div className="flex flex-col">
                      <span>{formatUsd(amountFor(p, 'REF_USD'))}</span>
                      {tierCount(p) > 1 && (
                        <span className="text-[10px] text-muted-foreground">
                          {tierCount(p)} niveles
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal py-1.5">
                    <div className="flex flex-wrap items-center gap-1 tabular-nums">
                      {formatUsd(amountFor(p, 'REF_BS'))}
                      {alert && (
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[10px] bg-amber-50 text-amber-800 border-amber-200"
                          title={`Brecha implícita se desvía ${(drift! * 100).toFixed(1)} pp de la de mercado`}
                        >
                          <AlertTriangle className="size-3" />
                          Brecha
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Switch
                      checked={p.active}
                      onCheckedChange={() => onToggleActive(p)}
                      aria-label={p.active ? 'Desactivar' : 'Activar'}
                    />
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onAdjust(p)}
                        aria-label="Ajustar stock"
                        title="Ajustar stock"
                      >
                        <SlidersHorizontal className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onEdit(p)}
                        aria-label="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-gray-50/50">
                    <TableCell colSpan={9} className="px-6">
                      <ExpandedStock productId={p.id} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
