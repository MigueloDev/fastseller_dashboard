'use client'

import { Trash2 } from 'lucide-react'
import type { Product } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatUsd, priceOf } from '@/lib/ventas/money'

export type DeliveryLineDraft = {
  key: string
  productId: string
  variantId: string
  quantity: string
  unitPriceUsd: string
  priceLocked: boolean
}

type Props = {
  line: DeliveryLineDraft
  products: Product[]
  showValue: boolean
  tierQty: number
  onChange: (patch: Partial<DeliveryLineDraft>) => void
  onRemove: () => void
  canRemove: boolean
}

export function DeliveryNoteLineItem({
  line,
  products,
  showValue,
  tierQty,
  onChange,
  onRemove,
  canRemove,
}: Props) {
  const product = products.find((p) => p.id === line.productId)
  const variants = (product?.variants ?? []).filter((v) => v.active)
  const suggested =
    product != null ? priceOf(product.prices, 'REF_USD', tierQty || 1) : null
  const qty = Number(line.quantity) || 0
  const unit =
    line.unitPriceUsd.trim() !== ''
      ? Number(line.unitPriceUsd)
      : suggested
  const unitOk = unit != null && Number.isFinite(unit) && unit > 0
  const subtotal = unitOk && qty > 0 ? unit * qty : null

  return (
    <div
      className={
        showValue
          ? 'grid gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_1fr_72px_96px_auto_auto] sm:items-end'
          : 'grid gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_1fr_72px_auto] sm:items-end'
      }
    >
      <div>
        <label className="mb-1 block text-xs text-gray-500">Producto</label>
        <select
          className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
          value={line.productId}
          onChange={(e) =>
            onChange({
              productId: e.target.value,
              variantId: '',
              unitPriceUsd: '',
              priceLocked: false,
            })
          }
        >
          <option value="">Seleccionar…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku ? `${p.name} (${p.sku})` : p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Variante</label>
        <select
          className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm disabled:bg-gray-50"
          value={line.variantId}
          disabled={variants.length === 0}
          onChange={(e) => onChange({ variantId: e.target.value })}
        >
          <option value="">
            {variants.length === 0 ? 'Sin variantes' : 'Seleccionar…'}
          </option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Cant.</label>
        <Input
          type="number"
          min={1}
          step={1}
          value={line.quantity}
          onChange={(e) => onChange({ quantity: e.target.value })}
        />
      </div>
      {showValue && (
        <>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Precio u.</label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              inputMode="decimal"
              value={
                line.priceLocked
                  ? line.unitPriceUsd
                  : suggested != null
                    ? String(suggested)
                    : line.unitPriceUsd
              }
              placeholder={suggested != null ? String(suggested) : '0.00'}
              onChange={(e) =>
                onChange({ unitPriceUsd: e.target.value, priceLocked: true })
              }
            />
          </div>
          <div className="min-w-[72px] pb-1 text-right text-sm font-medium text-gray-900">
            {subtotal != null ? formatUsd(subtotal) : '—'}
          </div>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canRemove}
        onClick={onRemove}
        className="text-gray-400 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
