'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import type { Customer, ExchangeRates, PriceRef, Product, Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PriceModeSelector } from '@/components/ventas/PriceModeSelector'
import { SaleLineItem, type LineDraft } from '@/components/ventas/SaleLineItem'
import { CustomerPicker } from '@/components/ventas/CustomerPicker'
import {
  formatBs,
  formatUsd,
  priceOf,
  qtyByProduct,
  rateAgeLabel,
} from '@/lib/ventas/money'

function newKey() {
  return Math.random().toString(36).slice(2, 10)
}

function emptyLine(productId = ''): LineDraft {
  return {
    key: newKey(),
    productId,
    variantId: '',
    quantity: '1',
    unitPriceUsd: '',
    priceLocked: false,
  }
}

function linesFromSale(sale: Sale): LineDraft[] {
  if (sale.items.length === 0) return [emptyLine()]
  // Al editar, congelamos el snapshot: no re-aplicar tiers silenciosamente.
  return sale.items.map((it) => ({
    key: newKey(),
    productId: it.productId,
    variantId: it.variantId ?? '',
    quantity: String(it.quantity),
    unitPriceUsd: String(it.unitPriceUsd),
    priceLocked: true,
  }))
}

function effectiveUnit(
  line: LineDraft,
  product: Product | undefined,
  priceRef: PriceRef,
  tierQty: number,
): number | null {
  if (line.priceLocked && line.unitPriceUsd.trim() !== '') {
    const n = Number(line.unitPriceUsd)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  if (!product) return null
  return priceOf(product.prices, priceRef, tierQty || 1)
}

type Props = {
  products: Product[]
  rates: ExchangeRates | null
  initialSale?: Sale
}

export function SaleForm({ products, rates, initialSale }: Props) {
  const api = useApi()
  const router = useRouter()
  const isEdit = Boolean(initialSale)
  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products],
  )

  const [customer, setCustomer] = useState<Customer | null>(
    initialSale?.customer ?? null,
  )
  const [priceRef, setPriceRef] = useState<PriceRef>(
    initialSale?.priceRef ?? 'REF_BS',
  )
  const [lines, setLines] = useState<LineDraft[]>(() =>
    initialSale ? linesFromSale(initialSale) : [emptyLine()],
  )
  const [note, setNote] = useState(initialSale?.note ?? '')
  const [saving, setSaving] = useState(false)

  const productQtys = useMemo(
    () =>
      qtyByProduct(
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      ),
    [lines],
  )

  const totals = useMemo(() => {
    let totalUsd = 0
    let totalBs = 0
    let selected = 0
    for (const line of lines) {
      const product = activeProducts.find((p) => p.id === line.productId)
      if (!product) continue
      const qty = Number(line.quantity) || 0
      if (qty < 1) continue
      const tierQty = productQtys.get(line.productId) ?? qty
      const unitSelected = effectiveUnit(line, product, priceRef, tierQty)
      // Override solo aplica al priceRef actual; el otro modo usa el catálogo.
      const unitUsd =
        priceRef === 'REF_USD' && unitSelected != null
          ? unitSelected
          : priceOf(product.prices, 'REF_USD', tierQty)
      const unitBs =
        priceRef === 'REF_BS' && unitSelected != null
          ? unitSelected
          : priceOf(product.prices, 'REF_BS', tierQty)
      if (unitUsd != null) totalUsd += unitUsd * qty
      if (unitBs != null) totalBs += unitBs * qty
      if (unitSelected != null) selected += unitSelected * qty
    }
    const rate = rates?.bcv?.rate
    const equivBs =
      rate && rate > 0 ? Math.round(selected * rate * 100) / 100 : null
    return { totalUsd, totalBs, selected, equivBs }
  }, [lines, activeProducts, priceRef, rates, productQtys])

  async function submit() {
    setSaving(true)
    try {
      if (!customer?.id) throw new Error('Selecciona o registra un cliente')
      const items = []
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
        const unit = effectiveUnit(line, product, priceRef, tierQty)
        if (unit == null) {
          throw new Error(`Sin precio ${priceRef} para ${product.name}`)
        }
        items.push({
          productId: line.productId,
          variantId: variants.length > 0 ? line.variantId : null,
          quantity: qty,
          unitPriceUsd: Math.round(unit * 100) / 100,
        })
      }
      if (items.length === 0) throw new Error('Agrega al menos un producto')

      const payload = {
        customerId: customer.id,
        priceRef,
        items,
        note: note.trim() || null,
      }

      const sale = initialSale
        ? await api.updateSale(initialSale.id, payload)
        : await api.createSale(payload)
      toast.success(isEdit ? 'Venta actualizada' : 'Venta creada')
      router.push(`/ventas/${sale.id}`)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isEdit
            ? 'Error actualizando venta'
            : 'Error creando venta',
      )
    } finally {
      setSaving(false)
    }
  }

  const rateLabel = rates?.bcv
    ? `tasa ${rates.bcv.rate.toFixed(2)} · ${rateAgeLabel(rates.bcv.fetchedAt)}`
    : null

  const bcvRate = rates?.bcv?.rate
  const toBs = (usd: number) =>
    bcvRate && bcvRate > 0 ? Math.round(usd * bcvRate * 100) / 100 : null

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {isEdit ? 'Editar venta' : 'Nueva venta'}
        </h1>
      </div>

      <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <Label>Cliente</Label>
        <CustomerPicker value={customer} onChange={setCustomer} />
      </section>

      <PriceModeSelector
        priceRef={priceRef}
        totalUsd={totals.totalUsd}
        totalBs={totals.totalBs}
        equivBsUsd={toBs(totals.totalUsd)}
        equivBsRef={toBs(totals.totalBs)}
        rateLabel={rateLabel}
        onChange={(ref) => {
          setPriceRef(ref)
          setLines((prev) =>
            prev.map((l) => ({
              ...l,
              unitPriceUsd: '',
              priceLocked: false,
            })),
          )
        }}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Líneas</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                emptyLine(activeProducts[0]?.id ?? ''),
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Línea
          </Button>
        </div>
        {lines.map((line) => (
          <SaleLineItem
            key={line.key}
            line={line}
            products={activeProducts}
            priceRef={priceRef}
            tierQty={
              productQtys.get(line.productId) ?? (Number(line.quantity) || 1)
            }
            canRemove={lines.length > 1}
            onChange={(patch) =>
              setLines((prev) =>
                prev.map((l) => (l.key === line.key ? { ...l, ...patch } : l)),
              )
            }
            onRemove={() =>
              setLines((prev) => prev.filter((l) => l.key !== line.key))
            }
          />
        ))}
      </section>

      <div>
        <Label>Nota (opcional)</Label>
        <Input
          className="mt-1"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-2xl font-semibold tabular-nums text-gray-900 sm:text-3xl">
              <span>{formatUsd(totals.selected)}</span>
              {totals.equivBs != null && (
                <>
                  <span className="font-normal text-gray-400">·</span>
                  <span>{formatBs(totals.equivBs)}</span>
                </>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {rateLabel ?? 'Sin tasa BCV para equivalente en Bs'}
            </p>
          </div>
          <Button
            size="lg"
            disabled={saving || !customer}
            onClick={() => void submit()}
            className="min-w-[140px]"
          >
            {saving
              ? isEdit
                ? 'Guardando…'
                : 'Creando…'
              : isEdit
                ? 'Guardar cambios'
                : 'Confirmar venta'}
          </Button>
        </div>
      </div>
    </div>
  )
}
