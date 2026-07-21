'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import type { Customer, ExchangeRates, PriceRef, Product } from '@/types'
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
  rateAgeLabel,
} from '@/lib/ventas/money'

function newKey() {
  return Math.random().toString(36).slice(2, 10)
}

function emptyLine(productId = ''): LineDraft {
  return { key: newKey(), productId, variantId: '', quantity: '1' }
}

type Props = {
  products: Product[]
  rates: ExchangeRates | null
}

export function SaleForm({ products, rates }: Props) {
  const api = useApi()
  const router = useRouter()
  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products],
  )

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [priceRef, setPriceRef] = useState<PriceRef>('REF_USD')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const totals = useMemo(() => {
    let totalUsd = 0
    let totalBs = 0
    for (const line of lines) {
      const product = activeProducts.find((p) => p.id === line.productId)
      if (!product) continue
      const qty = Number(line.quantity) || 0
      if (qty < 1) continue
      const u = priceOf(product.prices, 'REF_USD')
      const b = priceOf(product.prices, 'REF_BS')
      if (u != null) totalUsd += u * qty
      if (b != null) totalBs += b * qty
    }
    const rate = rates?.bcv?.rate
    const selected = priceRef === 'REF_USD' ? totalUsd : totalBs
    const equivBs =
      rate && rate > 0 ? Math.round(selected * rate * 100) / 100 : null
    return { totalUsd, totalBs, selected, equivBs }
  }, [lines, activeProducts, priceRef, rates])

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
        if (priceOf(product.prices, priceRef) == null) {
          throw new Error(`Sin precio ${priceRef} para ${product.name}`)
        }
        items.push({
          productId: line.productId,
          variantId: variants.length > 0 ? line.variantId : null,
          quantity: qty,
        })
      }
      if (items.length === 0) throw new Error('Agrega al menos un producto')

      const sale = await api.createSale({
        customerId: customer.id,
        priceRef,
        items,
        note: note.trim() || null,
      })
      toast.success('Venta creada')
      router.push(`/ventas/${sale.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error creando venta')
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
        <h1 className="text-xl font-semibold text-gray-900">Nueva venta</h1>
        <p className="text-sm text-gray-500">
          Un solo modo de precio para toda la venta. Stock se descuenta al
          confirmar.
        </p>
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
        onChange={setPriceRef}
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
            {saving ? 'Creando…' : 'Confirmar venta'}
          </Button>
        </div>
      </div>
    </div>
  )
}
