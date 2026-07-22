'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { ExchangeRates } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type PriceTierDraft = {
  key: string
  minQty: string
  refUsd: string
  refBs: string
}

type Props = {
  tiers: PriceTierDraft[]
  onChange: (tiers: PriceTierDraft[]) => void
  rates?: ExchangeRates | null
}

function parseAmount(raw: string): number | null {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function ageLabel(rates: ExchangeRates): string | null {
  const times = [rates.bcv?.fetchedAt, rates.binance?.fetchedAt]
    .filter(Boolean)
    .map((iso) => new Date(iso as string).getTime())
    .filter((t) => Number.isFinite(t))
  if (times.length === 0) return null
  const oldest = Math.min(...times)
  const mins = Math.max(0, Math.round((Date.now() - oldest) / 60_000))
  if (mins < 1) return 'tasas de hace menos de 1 min'
  if (mins === 1) return 'tasas de hace 1 min'
  return `tasas de hace ${mins} min`
}

function rangeLabel(minQty: number, nextMin: number | null): string {
  if (nextMin == null) return `${minQty}+`
  if (nextMin <= minQty + 1) return String(minQty)
  return `${minQty}–${nextMin - 1}`
}

function sortedMins(tiers: PriceTierDraft[]): number[] {
  return tiers
    .map((t) => Number(t.minQty))
    .filter((n) => Number.isInteger(n) && n >= 1)
    .sort((a, b) => a - b)
}

export function newTierKey() {
  return Math.random().toString(36).slice(2, 10)
}

export function emptyTier(minQty = '1'): PriceTierDraft {
  return { key: newTierKey(), minQty, refUsd: '', refBs: '' }
}

export function PriceInputs({ tiers, onChange, rates = null }: Props) {
  const age = rates ? ageLabel(rates) : null
  const mins = sortedMins(tiers)

  function patch(key: string, patch: Partial<PriceTierDraft>) {
    onChange(tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)))
  }

  function remove(key: string) {
    if (tiers.length <= 1) return
    onChange(tiers.filter((t) => t.key !== key))
  }

  function suggestBs(key: string, refUsd: string) {
    const usd = parseAmount(refUsd)
    if (
      usd == null ||
      !rates?.bcv ||
      !rates?.binance ||
      !(rates.bcv.rate > 0) ||
      !(rates.binance.rate > 0)
    ) {
      return
    }
    const suggested = round2(usd * (rates.binance.rate / rates.bcv.rate))
    patch(key, { refBs: String(suggested) })
  }

  function addTier() {
    const nextMin =
      mins.length > 0 ? String(Math.max(...mins) + 1) : String(tiers.length + 1)
    onChange([...tiers, emptyTier(nextMin)])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Precios por cantidad (USD)</Label>
        <Button type="button" variant="outline" size="xs" onClick={addTier}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Nivel
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        El rango se cierra con el siguiente mínimo. Base obligatoria en cantidad 1.
        {age ? ` · ${age}` : ''}
      </p>

      <div className="space-y-2">
        {tiers.map((tier) => {
          const minN = Number(tier.minQty)
          const next =
            Number.isInteger(minN) && minN >= 1
              ? (mins.find((m) => m > minN) ?? null)
              : null
          const label =
            Number.isInteger(minN) && minN >= 1
              ? rangeLabel(minN, next)
              : '—'
          const usd = parseAmount(tier.refUsd)
          const bs = parseAmount(tier.refBs)
          const gap = usd && bs ? (bs / usd - 1) * 100 : null
          const canSuggest =
            usd != null &&
            rates?.bcv != null &&
            rates?.binance != null &&
            rates.bcv.rate > 0
          const canRemove = tiers.length > 1 && minN !== 1

          return (
            <div
              key={tier.key}
              className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-violet-700">
                  Rango {label} uds
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!canRemove}
                  onClick={() => remove(tier.key)}
                  className="h-7 w-7 text-gray-400 hover:text-red-600"
                  title={
                    minN === 1
                      ? 'El nivel base (min 1) no se elimina'
                      : 'Eliminar nivel'
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Desde (min qty)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={tier.minQty}
                    disabled={minN === 1}
                    onChange={(e) => patch(tier.key, { minQty: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">REF_USD</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={tier.refUsd}
                    placeholder="0.00"
                    onChange={(e) => patch(tier.key, { refUsd: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Pago en divisas</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">REF_BS</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={!canSuggest}
                      title={
                        canSuggest
                          ? 'REF_USD × (Binance / BCV)'
                          : 'Requiere REF_USD y tasas BCV/Binance'
                      }
                      onClick={() => suggestBs(tier.key, tier.refUsd)}
                    >
                      Sugerir
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={tier.refBs}
                    placeholder="0.00"
                    onChange={(e) => patch(tier.key, { refBs: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    USD si paga en Bs (BCV + brecha)
                  </p>
                </div>
              </div>
              {gap !== null && (
                <p className="text-xs text-violet-700">
                  Brecha implícita:{' '}
                  <span className="font-medium">{gap.toFixed(1)}%</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
