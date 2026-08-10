'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Customer, Product } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { CustomerPicker } from '@/components/ventas/CustomerPicker'
import {
  DeliveryNoteLineItem,
  type DeliveryLineDraft,
} from '@/components/entregas/DeliveryNoteLineItem'
import { formatUsd, priceOf, qtyByProduct } from '@/lib/ventas/money'

function newKey() {
  return Math.random().toString(36).slice(2, 10)
}

function emptyLine(): DeliveryLineDraft {
  return {
    key: newKey(),
    productId: '',
    variantId: '',
    quantity: '1',
    unitPriceUsd: '',
    priceLocked: false,
  }
}

function effectiveUnit(
  line: DeliveryLineDraft,
  product: Product | undefined,
  tierQty: number,
): number | null {
  if (line.priceLocked && line.unitPriceUsd.trim() !== '') {
    const n = Number(line.unitPriceUsd)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  if (!product) return null
  return (
    priceOf(product.prices, 'REF_USD', tierQty || 1) ??
    priceOf(product.prices, 'REF_BS', tierQty || 1)
  )
}

type Props = {
  products: Product[]
}

export function DeliveryNoteForm({ products }: Props) {
  const api = useApi()
  const router = useRouter()
  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products],
  )

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [showValue, setShowValue] = useState(true)
  const [lines, setLines] = useState<DeliveryLineDraft[]>([emptyLine()])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ customer?: string; lines?: string }>({})

  const productQtys = useMemo(
    () =>
      qtyByProduct(
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      ),
    [lines],
  )

  const totalUsd = useMemo(() => {
    let sum = 0
    for (const line of lines) {
      const product = activeProducts.find((p) => p.id === line.productId)
      if (!product) continue
      const qty = Number(line.quantity) || 0
      if (qty < 1) continue
      const tierQty = productQtys.get(line.productId) ?? qty
      const unit = effectiveUnit(line, product, tierQty)
      if (unit != null) sum += unit * qty
    }
    return Math.round(sum * 100) / 100
  }, [lines, activeProducts, productQtys])

  async function submit() {
    setErrors({})
    if (!customer?.id) {
      setErrors({ customer: 'Selecciona o registra un cliente' })
      return
    }
    let items: Array<{
      productId: string
      variantId: string | null
      quantity: number
      unitPriceUsd: number
    }>
    try {
      items = []
      for (const line of lines) {
        const product = activeProducts.find((p) => p.id === line.productId)
        if (!product) throw new Error('Producto inválido en una línea')
        const qty = Number(line.quantity)
        if (!Number.isInteger(qty) || qty < 1) {
          throw new Error('Cantidad inválida')
        }
        const variants = product.variants.filter((v) => v.active)
        if (variants.length > 0 && !line.variantId) {
          throw new Error(`Elige variante para ${product.name}`)
        }
        const tierQty = productQtys.get(line.productId) ?? qty
        const unit = effectiveUnit(line, product, tierQty)
        if (unit == null) {
          throw new Error(`Sin precio de catálogo para ${product.name}`)
        }
        items.push({
          productId: line.productId,
          variantId: variants.length > 0 ? line.variantId : null,
          quantity: qty,
          unitPriceUsd: Math.round(unit * 100) / 100,
        })
      }
      if (items.length === 0) throw new Error('Agrega al menos un producto')
    } catch (err) {
      setErrors({
        lines: err instanceof Error ? err.message : 'Revisa las líneas',
      })
      return
    }

    setSaving(true)
    try {
      const created = await api.createDeliveryNote({
        customerId: customer.id,
        showValue,
        items,
        note: note.trim() || null,
      })
      notify.success('Nota de entrega creada · stock descontado')
      router.push(`/entregas/${created.id}`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error creando nota')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-4 pb-24 sm:px-6 sm:py-6">
      <PageHeader
        title="Nueva nota de entrega"
        description="Descuenta inventario al crear. Independiente de ventas."
      />

      <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <Label>
          Cliente <span className="text-red-600">*</span>
        </Label>
        <CustomerPicker
          value={customer}
          onChange={(c) => {
            setCustomer(c)
            setErrors((e) => ({ ...e, customer: undefined }))
          }}
        />
        {errors.customer && (
          <p className="mt-1 text-xs text-red-600">{errors.customer}</p>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600"
            checked={showValue}
            onChange={(e) => setShowValue(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">
              Mostrar valores
            </span>
            <span className="block text-xs text-gray-500">
              Si está activo, la nota e impresión muestran precios y total. Si
              no, solo productos y cantidades.
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            Ítems <span className="text-red-600">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Línea
          </Button>
        </div>
        {lines.map((line) => {
          const tierQty =
            productQtys.get(line.productId) ?? (Number(line.quantity) || 1)
          return (
            <DeliveryNoteLineItem
              key={line.key}
              line={line}
              products={activeProducts}
              showValue={showValue}
              tierQty={tierQty}
              canRemove={lines.length > 1}
              onChange={(patch) => {
                setLines((prev) =>
                  prev.map((l) => (l.key === line.key ? { ...l, ...patch } : l)),
                )
                setErrors((e) => ({ ...e, lines: undefined }))
              }}
              onRemove={() =>
                setLines((prev) => prev.filter((l) => l.key !== line.key))
              }
            />
          )
        })}
        {errors.lines && (
          <p className="mt-1 text-xs text-red-600">{errors.lines}</p>
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <Label htmlFor="note">Nota (opcional)</Label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observaciones para la entrega"
        />
      </section>

      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="text-sm text-gray-600">
          {showValue ? (
            <>
              Total:{' '}
              <span className="tabular-nums text-sm font-semibold text-gray-900">
                {formatUsd(totalUsd)}
              </span>
            </>
          ) : (
            <span>Sin montos en la nota</span>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? 'Guardando…' : 'Crear nota'}
        </Button>
      </div>
    </div>
  )
}
