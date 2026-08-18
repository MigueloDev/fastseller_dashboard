'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { notify as toast } from '@/lib/toast'
import { ArrowLeftRight, Plus } from 'lucide-react'
import type {
  CashAccount,
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
import { ReceiptPicker } from '@/components/ui/receipt-picker'
import { ReceiptViewerDialog } from '@/components/ui/receipt-viewer-dialog'
import { formatBs, formatUsd } from '@/lib/ventas/money'
import { formatDate, formatDateTime } from '@/lib/format'
import { fileToWebpBase64, RECEIPT_MAX_BYTES } from '@/lib/ventas/receiptImage'
import { cn } from '@/lib/utils'
import {
  CashAccountSelect,
  pickDefaultAccount,
} from '@/components/cuentas/CashAccountSelect'

function formatUsdt(n: number) {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 6 })} USDT`
}

function expectedUsdt(bsSpent: number, rate: number) {
  if (!(bsSpent > 0) || !(rate > 0)) return null
  return Math.round((bsSpent / rate) * 1e6) / 1e6
}

function purchaseTitle(p: CurrencyPurchase) {
  const allocs = p.allocations ?? []
  const names = allocs
    .map((a) => a.sale?.customer?.name)
    .filter((n): n is string => Boolean(n))
  if (names.length > 1) {
    const shown = names.slice(0, 2).join(', ')
    const more = names.length > 2 ? ` +${names.length - 2}` : ''
    return `${names.length} ventas · ${shown}${more}`
  }
  return names[0] ?? p.sale?.customer?.name ?? 'Cliente'
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
  const [saleIds, setSaleIds] = useState<string[]>([])
  const [binanceRate, setBinanceRate] = useState('')
  const [usdtReceived, setUsdtReceived] = useState('')
  const [note, setNote] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')

  const load = useCallback(async () => {
    try {
      const [page, elig, nextRates, cash] = await Promise.all([
        api.getCurrencyPurchases({ limit: 50 }),
        api.getEligibleSalesForFx(50).catch(() => ({ items: [] })),
        api.getRates().catch(() => null),
        api.getCashAccounts().catch(() => [] as CashAccount[]),
      ])
      setItems(page.items)
      setSummary(page.summary)
      setEligible(elig.items)
      setRates(nextRates)
      setAccounts(cash)
      setFromAccountId((cur) => cur || pickDefaultAccount(cash, 'BS')?.id || '')
      setToAccountId((cur) => cur || pickDefaultAccount(cash, 'USD')?.id || '')
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
    () => eligible.filter((s) => saleIds.includes(s.id)),
    [eligible, saleIds],
  )

  const rateNum = Number(binanceRate)
  const usdtNum = Number(usdtReceived)
  const bsTotal = selected.reduce((a, s) => a + s.bsSpent, 0)
  const usdTotal = selected.reduce((a, s) => a + s.usdCollected, 0)
  const previewExpected = selected.length
    ? expectedUsdt(bsTotal, rateNum)
    : null
  // profit solo si todas las seleccionadas cierran (PAGADA + costo)
  const previewProfit =
    selected.length > 0 &&
    selected.every((s) => s.status === 'PAGADA' && s.costUsd != null) &&
    Number.isFinite(usdtNum) &&
    usdtNum > 0
      ? Math.round(
          (usdtNum +
            selected.reduce(
              (a, s) =>
                a +
                (s.usdtConverted ?? 0) +
                (s.usdAttributed ?? 0) +
                s.usdCollected,
              0,
            ) -
            selected.reduce((a, s) => a + (s.costUsd ?? 0), 0)) *
            100,
        ) / 100
      : null

  function toggleSale(id: string) {
    setSaleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const loadReceiptUrl = useCallback(async () => {
    if (!viewerId) throw new Error('Sin compra seleccionada')
    const { url } = await api.getCurrencyPurchaseReceiptUrl(viewerId)
    return url
  }, [api, viewerId])

  function closeForm() {
    setFormOpen(false)
    setReceiptFile(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!saleIds.length) {
      toast.error('Seleccione al menos una venta')
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
    if (!fromAccountId || !toAccountId) {
      toast.error('Elija las cuentas de origen y destino')
      return
    }

    setSaving(true)
    try {
      let receiptBase64: string | null = null
      if (receiptFile) {
        const converted = await fileToWebpBase64(receiptFile)
        if (converted.bytes > RECEIPT_MAX_BYTES) {
          toast.error('El WebP convertido supera 5 MB')
          return
        }
        receiptBase64 = converted.base64
      }
      await api.createCurrencyPurchase({
        saleIds,
        binanceRate: Math.round(rateNum * 1e4) / 1e4,
        usdtReceived: Math.round(usdtNum * 1e6) / 1e6,
        fromAccountId,
        toAccountId,
        note: note.trim() || null,
        receiptBase64,
      })
      toast.success('Compra de divisas registrada')
      closeForm()
      setSaleIds([])
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
          onClick={() => {
            if (formOpen) {
              closeForm()
            } else {
              setFormOpen(true)
            }
          }}
          disabled={eligible.length === 0 && !formOpen}
        >
          <Plus className="h-4 w-4" />
          {formOpen ? 'Cerrar' : 'Registrar compra'}
        </Button>
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-4 p-4">
        <SummaryCards summary={summary} loading={loading} />

        {formOpen && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="space-y-1">
              <Label>Ventas (Bs pendientes de convertir)</Label>
              {eligible.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No hay ventas con pagos en Bs pendientes de convertir.
                </p>
              ) : (
                <ul className="max-h-56 space-y-1 overflow-auto rounded-md border border-gray-200 p-2">
                  {eligible.map((s) => {
                    const checked = saleIds.includes(s.id)
                    return (
                      <li key={s.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50',
                            checked && 'bg-violet-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={() => toggleSale(s.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-gray-900">
                              {s.customer?.name ?? 'Cliente'}
                            </span>
                            <span className="block text-xs text-gray-500">
                              {s.status} · {formatUsd(s.totalUsd)} ·{' '}
                              {formatBs(s.bsSpent)}
                              {s.bsConverted && s.bsConverted > 0
                                ? ` (ya ${formatBs(s.bsConverted)})`
                                : ''}
                              {s.usdCollected > 0
                                ? ` + ${formatUsd(s.usdCollected)}`
                                : ''}{' '}
                              · {formatDate(s.createdAt)}
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {selected.length > 0 && (
              <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <p>
                  Seleccionadas:{' '}
                  <span className="font-medium text-gray-900">
                    {selected.length}
                  </span>
                </p>
                <p>
                  Bs a convertir:{' '}
                  <span className="font-medium text-gray-900">
                    {formatBs(bsTotal)}
                  </span>
                </p>
                {usdTotal > 0 && (
                  <p>
                    Pagos USD por atribuir:{' '}
                    <span className="font-medium text-gray-900">
                      {formatUsd(usdTotal)}
                    </span>
                  </p>
                )}
                {selected.some((s) => s.status !== 'PAGADA') && (
                  <p className="text-gray-500">
                    Hay ventas pendientes: la ganancia se cierra al liquidarlas.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <CashAccountSelect
                id="fx-from"
                accounts={accounts}
                currency="BS"
                value={fromAccountId}
                onChange={setFromAccountId}
                label="Sale de"
              />
              <CashAccountSelect
                id="fx-to"
                accounts={accounts}
                currency="USD"
                value={toAccountId}
                onChange={setToAccountId}
                label="Entra a"
              />
            </div>

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

            <div className="space-y-1">
              <Label htmlFor="fx-receipt">Captura del intercambio (opcional)</Label>
              <ReceiptPicker
                id="fx-receipt"
                file={receiptFile}
                onChange={setReceiptFile}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
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
                      {purchaseTitle(p)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(p.purchasedAt)}
                      {p.agentName ? ` · ${p.agentName}` : ''}
                      {' · '}
                      tasa {p.binanceRate}
                      {(p.allocations?.length ?? 0) > 1
                        ? ` · ${p.allocations!.length} ventas`
                        : ''}
                    </p>
                    {p.hasReceipt && (
                      <button
                        type="button"
                        className="mt-1 text-xs font-medium text-violet-600 hover:text-violet-700"
                        onClick={() => setViewerId(p.id)}
                      >
                        Ver comprobante
                      </button>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold tabular-nums text-gray-900">
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

      <ReceiptViewerDialog
        open={viewerId != null}
        onOpenChange={(open) => {
          if (!open) setViewerId(null)
        }}
        title="Comprobante de intercambio"
        loadUrl={loadReceiptUrl}
      />
    </div>
  )
}
