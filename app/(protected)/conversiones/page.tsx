'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeftRight, Plus } from 'lucide-react'
import type {
  CurrencyPurchase,
  CurrencyPurchaseSummary,
  EligibleSaleForFx,
  ExchangeRates,
} from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatUsd } from '@/lib/ventas/money'
import { cn } from '@/lib/utils'

function formatBs(n: number) {
  return `Bs ${n.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`
}

function formatUsdt(n: number) {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 6 })} USDT`
}

function expectedUsdt(bsSpent: number, rate: number) {
  if (!(bsSpent > 0) || !(rate > 0)) return null
  return Math.round((bsSpent / rate) * 1e6) / 1e6
}

function SummaryCards({
  summary,
  loading,
}: {
  summary: CurrencyPurchaseSummary | null
  loading: boolean
}) {
  const cards = [
    {
      label: 'Bs usados',
      value: summary ? formatBs(summary.bsSpent) : '—',
    },
    {
      label: 'USDT adquiridos',
      value: summary ? formatUsdt(summary.usdtAcquired) : '—',
    },
    {
      label: 'Ganancia realizada',
      value:
        summary?.profitUsd != null ? formatUsd(summary.profitUsd) : '—',
      tone:
        summary?.profitUsd == null
          ? 'text-gray-900'
          : summary.profitUsd >= 0
            ? 'text-green-700'
            : 'text-red-600',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-gray-200 bg-white px-4 py-3"
        >
          <p className="text-xs text-gray-500">{c.label}</p>
          <p
            className={cn(
              'mt-1 text-lg font-semibold tabular-nums',
              c.tone ?? 'text-gray-900',
            )}
          >
            {loading && !summary ? '…' : c.value}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function ConversionesPage() {
  const api = useApi()
  const [items, setItems] = useState<CurrencyPurchase[]>([])
  const [summary, setSummary] = useState<CurrencyPurchaseSummary | null>(null)
  const [eligible, setEligible] = useState<EligibleSaleForFx[]>([])
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [saleId, setSaleId] = useState('')
  const [binanceRate, setBinanceRate] = useState('')
  const [usdtReceived, setUsdtReceived] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [page, elig, nextRates] = await Promise.all([
        api.getCurrencyPurchases({ limit: 50 }),
        api.getEligibleSalesForFx(50).catch(() => ({ items: [] })),
        api.getRates().catch(() => null),
      ])
      setItems(page.items)
      setSummary(page.summary)
      setEligible(elig.items)
      setRates(nextRates)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando compras')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    if (!formOpen) return
    if (binanceRate) return
    if (rates?.binance?.rate) {
      setBinanceRate(String(rates.binance.rate))
    }
  }, [formOpen, rates, binanceRate])

  const selected = useMemo(
    () => eligible.find((s) => s.id === saleId) ?? null,
    [eligible, saleId],
  )

  const rateNum = Number(binanceRate)
  const usdtNum = Number(usdtReceived)
  const previewExpected = selected
    ? expectedUsdt(selected.bsSpent, rateNum)
    : null
  const previewProfit =
    selected &&
    selected.costUsd != null &&
    Number.isFinite(usdtNum) &&
    usdtNum > 0
      ? Math.round((usdtNum + selected.usdCollected - selected.costUsd) * 100) /
        100
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!saleId) {
      toast.error('Seleccione una venta')
      return
    }
    if (!(rateNum > 0)) {
      toast.error('Tasa Binance debe ser > 0')
      return
    }
    if (!(usdtNum > 0)) {
      toast.error('USDT recibidos debe ser > 0')
      return
    }

    setSaving(true)
    try {
      await api.createCurrencyPurchase({
        saleId,
        binanceRate: Math.round(rateNum * 1e4) / 1e4,
        usdtReceived: Math.round(usdtNum * 1e6) / 1e6,
        note: note.trim() || null,
      })
      toast.success('Compra de divisas registrada')
      setFormOpen(false)
      setSaleId('')
      setUsdtReceived('')
      setNote('')
      setBinanceRate(rates?.binance?.rate ? String(rates.binance.rate) : '')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-violet-600" />
          <h1 className="text-lg font-semibold text-gray-900">
            Compra de divisas
          </h1>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setFormOpen((v) => !v)}
          disabled={eligible.length === 0 && !formOpen}
        >
          <Plus className="h-4 w-4" />
          {formOpen ? 'Cerrar' : 'Registrar compra'}
        </Button>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
        <SummaryCards summary={summary} loading={loading} />

        {formOpen && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="space-y-1">
              <Label htmlFor="fx-sale">Venta (Bs cobrados)</Label>
              {eligible.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No hay ventas PAGADA con pagos en Bs pendientes de convertir.
                </p>
              ) : (
                <select
                  id="fx-sale"
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
                  value={saleId}
                  onChange={(e) => setSaleId(e.target.value)}
                  required
                >
                  <option value="">Seleccionar…</option>
                  {eligible.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.customer?.name ?? 'Cliente'} · {formatUsd(s.totalUsd)} ·{' '}
                      {formatBs(s.bsSpent)}
                      {s.usdCollected > 0
                        ? ` + ${formatUsd(s.usdCollected)}`
                        : ''}{' '}
                      ·{' '}
                      {new Date(s.createdAt).toLocaleDateString('es', {
                        dateStyle: 'short',
                      })}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selected && (
              <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <p>
                  Bs a convertir:{' '}
                  <span className="font-medium text-gray-900">
                    {formatBs(selected.bsSpent)}
                  </span>
                </p>
                {selected.usdCollected > 0 && (
                  <p>
                    Pagos directos USD:{' '}
                    <span className="font-medium text-gray-900">
                      {formatUsd(selected.usdCollected)}
                    </span>
                  </p>
                )}
                <p>
                  Costo productos:{' '}
                  <span className="font-medium text-gray-900">
                    {selected.costUsd != null
                      ? formatUsd(selected.costUsd)
                      : 'sin snapshot'}
                  </span>
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="fx-rate">Tasa Binance (Bs/USDT)</Label>
                <Input
                  id="fx-rate"
                  type="number"
                  min={0.0001}
                  step="any"
                  value={binanceRate}
                  onChange={(e) => setBinanceRate(e.target.value)}
                  required
                />
                {rates?.binance?.rate != null && (
                  <button
                    type="button"
                    className="text-[11px] text-violet-700 hover:underline"
                    onClick={() => setBinanceRate(String(rates.binance!.rate))}
                  >
                    Usar tasa live ({rates.binance.rate})
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="fx-usdt">USDT recibidos</Label>
                <Input
                  id="fx-usdt"
                  type="number"
                  min={0.000001}
                  step="any"
                  value={usdtReceived}
                  onChange={(e) => setUsdtReceived(e.target.value)}
                  required
                />
              </div>
            </div>

            {(previewExpected != null || previewProfit != null) && (
              <div className="rounded-md border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-violet-900">
                {previewExpected != null && (
                  <p>
                    USDT esperados (Bs ÷ tasa):{' '}
                    <span className="font-semibold tabular-nums">
                      {formatUsdt(previewExpected)}
                    </span>
                  </p>
                )}
                {previewProfit != null && (
                  <p>
                    Ganancia realizada:{' '}
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        previewProfit >= 0 ? 'text-green-700' : 'text-red-600',
                      )}
                    >
                      {formatUsd(previewProfit)}
                    </span>
                    <span className="text-violet-700">
                      {' '}
                      = USDT + USD − costo
                    </span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="fx-note">Nota (opcional)</Label>
              <Textarea
                id="fx-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || eligible.length === 0}>
                {saving ? 'Guardando…' : 'Registrar'}
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Aún no hay compras de USDT registradas.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {items.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {p.sale?.customer?.name ?? 'Cliente'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.purchasedAt).toLocaleString('es', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      {p.agentName ? ` · ${p.agentName}` : ''}
                      {' · '}
                      tasa {p.binanceRate}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular-nums text-gray-900">
                      {formatUsdt(p.usdtReceived)}
                    </p>
                    <p className="text-xs text-gray-500 tabular-nums">
                      {formatBs(p.bsSpent)}
                    </p>
                    {p.profitUsd != null ? (
                      <p
                        className={cn(
                          'text-xs font-medium tabular-nums',
                          p.profitUsd >= 0 ? 'text-green-700' : 'text-red-600',
                        )}
                      >
                        {formatUsd(p.profitUsd)}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">Sin costo</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
