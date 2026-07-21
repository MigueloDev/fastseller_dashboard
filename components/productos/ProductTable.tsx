'use client'

import { Fragment, useEffect, useState } from 'react'
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
  const price =
    product.prices.find((p) => p.ref === ref && p.active) ??
    product.prices.find((p) => p.ref === ref)
  if (!price) return null
  const n = Number(price.amount)
  return Number.isFinite(n) ? n : null
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
  const low = items.some((i) => i.lowStock)

  if (items.length === 0 || total === 0) {
    return (
      <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600">
        sin stock
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="tabular-nums text-sm font-medium">{total}</span>
      {low && (
        <Badge
          variant="secondary"
          className="text-[10px] bg-red-50 text-red-700 border-red-200"
        >
          bajo
        </Badge>
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
                : l.quantity === 0
                  ? 'bg-gray-100 text-gray-600'
                  : ''
            }`}
          >
            {l.variantName ?? 'Total'}: {l.quantity}
          </Badge>
        ))}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">Últimos movimientos</p>
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
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80">
            <TableHead className="w-8" />
            <TableHead>Nombre</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Variantes</TableHead>
            <TableHead>USD</TableHead>
            <TableHead>Bs (USD)</TableHead>
            <TableHead>Activo</TableHead>
            <TableHead className="w-24" />
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
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
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
                  <TableCell>
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.brand && (
                      <div className="text-xs text-muted-foreground">{p.brand}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-600">
                    {p.sku || '—'}
                  </TableCell>
                  <TableCell>
                    <StockCell items={items} />
                  </TableCell>
                  <TableCell>
                    {activeVariants.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {activeVariants.map((v) => (
                          <Badge key={v.id} variant="secondary" className="text-[10px]">
                            {v.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatUsd(amountFor(p, 'REF_USD'))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 tabular-nums">
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
                  <TableCell>
                    <Switch
                      checked={p.active}
                      onCheckedChange={() => onToggleActive(p)}
                      aria-label={p.active ? 'Desactivar' : 'Activar'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onAdjust(p)}
                        aria-label="Ajustar stock"
                        title="Ajustar stock"
                      >
                        <SlidersHorizontal className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
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
