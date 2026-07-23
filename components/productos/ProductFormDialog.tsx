'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { ExchangeRates, Product, ProductWritePayload } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  PriceInputs,
  emptyTier,
  type PriceTierDraft,
} from './PriceInputs'
import { VariantInputs, type VariantDraft } from './VariantInputs'

type Props = {
  open: boolean
  product: Product | null
  rates?: ExchangeRates | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function tiersFromProduct(product: Product | null): PriceTierDraft[] {
  if (!product) return [emptyTier('1')]
  const active = product.prices.filter((p) => p.active !== false)
  const byMin = new Map<number, PriceTierDraft>()
  for (const p of active) {
    const minQty = p.minQty ?? 1
    const existing = byMin.get(minQty) ?? {
      key: `tier-${minQty}`,
      minQty: String(minQty),
      refUsd: '',
      refBs: '',
    }
    if (p.ref === 'REF_USD') existing.refUsd = String(p.amount)
    if (p.ref === 'REF_BS') existing.refBs = String(p.amount)
    byMin.set(minQty, existing)
  }
  const tiers = [...byMin.values()].sort(
    (a, b) => Number(a.minQty) - Number(b.minQty),
  )
  if (tiers.length === 0) return [emptyTier('1')]
  if (!tiers.some((t) => Number(t.minQty) === 1)) {
    tiers.unshift(emptyTier('1'))
  }
  return tiers
}

export function ProductFormDialog({
  open,
  product,
  rates = null,
  onOpenChange,
  onSaved,
}: Props) {
  const api = useApi()
  const editing = Boolean(product)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [brand, setBrand] = useState('')
  const [description, setDescription] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [tiers, setTiers] = useState<PriceTierDraft[]>([emptyTier('1')])
  const [minStock, setMinStock] = useState('')
  const [variants, setVariants] = useState<VariantDraft[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(product?.name ?? '')
    setSku(product?.sku ?? '')
    setBrand(product?.brand ?? '')
    setDescription(product?.description ?? '')
    setPurchasePrice(
      product?.purchasePriceUsd != null ? String(product.purchasePriceUsd) : '',
    )
    setMinStock(
      product?.minStock != null && product.minStock !== undefined
        ? String(product.minStock)
        : '',
    )
    setTiers(tiersFromProduct(product))
    setVariants(
      (product?.variants ?? [])
        .filter((v) => (product?.active !== false ? v.active : true))
        .map((v) => ({ id: v.id, name: v.name, sku: v.sku ?? '' })),
    )
  }, [open, product])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('El nombre es requerido')
      return
    }

    const invalidVariant = variants.find((v) => !v.name.trim())
    if (invalidVariant) {
      toast.error('Cada variante necesita un nombre')
      return
    }

    let minStockValue: number | null = null
    if (minStock.trim()) {
      const n = Number(minStock)
      if (!Number.isInteger(n) || n < 0) {
        toast.error('Stock mínimo debe ser un entero ≥ 0')
        return
      }
      minStockValue = n
    }

    const cost = Number(purchasePrice)
    if (!(cost > 0)) {
      toast.error('Precio de compra (USD) debe ser > 0')
      return
    }

    const seen = new Set<number>()
    const prices: NonNullable<ProductWritePayload['prices']> = []
    let hasBase = false

    for (const tier of tiers) {
      const minQty = Number(tier.minQty)
      if (!Number.isInteger(minQty) || minQty < 1) {
        toast.error('Cada nivel necesita un mínimo entero ≥ 1')
        return
      }
      if (seen.has(minQty)) {
        toast.error(`Nivel duplicado: desde ${minQty}`)
        return
      }
      seen.add(minQty)
      if (minQty === 1) hasBase = true

      const usd = Number(tier.refUsd)
      const bs = Number(tier.refBs)
      if (!(usd > 0) || !(bs > 0)) {
        toast.error(`Nivel desde ${minQty}: REF_USD y REF_BS deben ser > 0`)
        return
      }

      prices.push(
        {
          ref: 'REF_USD',
          amount: Math.round(usd * 100) / 100,
          minQty,
        },
        {
          ref: 'REF_BS',
          amount: Math.round(bs * 100) / 100,
          minQty,
        },
      )
    }

    if (!hasBase) {
      toast.error('Debe existir un nivel con cantidad mínima 1')
      return
    }

    const payload: ProductWritePayload = {
      name: trimmed,
      sku: sku.trim() || null,
      brand: brand.trim() || null,
      description: description.trim() || null,
      minStock: minStockValue,
      purchasePriceUsd: Math.round(cost * 100) / 100,
      variants: variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        name: v.name.trim(),
        sku: v.sku.trim() || null,
      })),
      prices,
    }

    setSaving(true)
    try {
      if (editing && product) {
        await api.updateProduct(product.id, payload)
        toast.success('Producto actualizado')
      } else {
        await api.createProduct(payload)
        toast.success('Producto creado')
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>
            Precios en USD por cantidad. REF_BS es el precio USD cuando el cliente
            paga en bolívares.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="product-name">Nombre</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del producto"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="product-sku">SKU</Label>
              <Input
                id="product-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="opcional"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="product-brand">Marca</Label>
              <Input
                id="product-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="opcional"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-desc">Descripción</Label>
            <Textarea
              id="product-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="opcional"
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-min-stock">Stock mínimo (alerta)</Label>
            <Input
              id="product-min-stock"
              type="number"
              min={0}
              step={1}
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="vacío = sin alerta"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-cost">Precio de compra (USD)</Label>
            <Input
              id="product-cost"
              type="number"
              min={0.01}
              step={0.01}
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="Costo unitario"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Se congela en cada venta para calcular la ganancia.
            </p>
          </div>

          <VariantInputs variants={variants} onChange={setVariants} />
          <PriceInputs tiers={tiers} onChange={setTiers} rates={rates} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
