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
import { PriceInputs } from './PriceInputs'
import { VariantInputs, type VariantDraft } from './VariantInputs'

type Props = {
  open: boolean
  product: Product | null
  rates?: ExchangeRates | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function priceOf(product: Product | null, ref: 'REF_USD' | 'REF_BS'): string {
  if (!product) return ''
  const p =
    product.prices.find((x) => x.ref === ref && x.active) ??
    product.prices.find((x) => x.ref === ref)
  return p ? String(p.amount) : ''
}

function priceId(product: Product | null, ref: 'REF_USD' | 'REF_BS'): string | undefined {
  if (!product) return undefined
  return (
    product.prices.find((x) => x.ref === ref && x.active)?.id ??
    product.prices.find((x) => x.ref === ref)?.id
  )
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
  const [refUsd, setRefUsd] = useState('')
  const [refBs, setRefBs] = useState('')
  const [minStock, setMinStock] = useState('')
  const [variants, setVariants] = useState<VariantDraft[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(product?.name ?? '')
    setSku(product?.sku ?? '')
    setBrand(product?.brand ?? '')
    setDescription(product?.description ?? '')
    setMinStock(
      product?.minStock != null && product.minStock !== undefined
        ? String(product.minStock)
        : '',
    )
    setRefUsd(priceOf(product, 'REF_USD'))
    setRefBs(priceOf(product, 'REF_BS'))
    setVariants(
      (product?.variants ?? [])
        .filter((v) => product?.active !== false ? v.active : true)
        .map((v) => ({ id: v.id, name: v.name, sku: v.sku ?? '' }))
    )
  }, [open, product])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('El nombre es requerido')
      return
    }

    const usd = Number(refUsd)
    const bs = Number(refBs)
    if (!(usd > 0) || !(bs > 0)) {
      toast.error('REF_USD y REF_BS deben ser mayores a 0')
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

    const payload: ProductWritePayload = {
      name: trimmed,
      sku: sku.trim() || null,
      brand: brand.trim() || null,
      description: description.trim() || null,
      minStock: minStockValue,
      variants: variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        name: v.name.trim(),
        sku: v.sku.trim() || null,
      })),
      prices: [
        {
          ...(priceId(product, 'REF_USD') ? { id: priceId(product, 'REF_USD') } : {}),
          ref: 'REF_USD',
          amount: Math.round(usd * 100) / 100,
        },
        {
          ...(priceId(product, 'REF_BS') ? { id: priceId(product, 'REF_BS') } : {}),
          ref: 'REF_BS',
          amount: Math.round(bs * 100) / 100,
        },
      ],
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
            Precios en USD. REF_BS es el precio USD cuando el cliente paga en bolívares.
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

          <VariantInputs variants={variants} onChange={setVariants} />
          <PriceInputs
            refUsd={refUsd}
            refBs={refBs}
            onChangeUsd={setRefUsd}
            onChangeBs={setRefBs}
            rates={rates}
          />

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
