'use client'

import type { ExchangeRates } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  refUsd: string
  refBs: string
  onChangeUsd: (value: string) => void
  onChangeBs: (value: string) => void
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

export function PriceInputs({
  refUsd,
  refBs,
  onChangeUsd,
  onChangeBs,
  rates = null,
}: Props) {
  const usd = parseAmount(refUsd)
  const bs = parseAmount(refBs)
  const gap = usd && bs ? (bs / usd - 1) * 100 : null

  const canSuggest =
    usd != null &&
    rates?.bcv != null &&
    rates?.binance != null &&
    rates.bcv.rate > 0

  function suggest() {
    if (!canSuggest || !usd || !rates?.bcv || !rates?.binance) return
    const suggested = round2(usd * (rates.binance.rate / rates.bcv.rate))
    onChangeBs(String(suggested))
  }

  const age = rates ? ageLabel(rates) : null

  return (
    <div className="space-y-3">
      <Label>Precios (USD)</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">REF_USD</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={refUsd}
            placeholder="0.00"
            onChange={(e) => onChangeUsd(e.target.value)}
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
              onClick={suggest}
            >
              Sugerir
            </Button>
          </div>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={refBs}
            placeholder="0.00"
            onChange={(e) => onChangeBs(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            USD cuando el cliente paga en Bs (BCV + brecha)
            {age ? ` · ${age}` : ''}
          </p>
        </div>
      </div>
      {gap !== null && (
        <p className="text-xs text-violet-700 bg-violet-50 rounded-lg px-2.5 py-1.5">
          Brecha implícita: <span className="font-medium">{gap.toFixed(1)}%</span>
        </p>
      )}
    </div>
  )
}
