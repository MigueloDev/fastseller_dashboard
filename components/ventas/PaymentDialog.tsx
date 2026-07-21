'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { ExchangeRates, PaymentMethod, Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  balanceLabel,
  formatBs,
  formatUsd,
  PAYMENT_METHOD_META,
  PAYMENT_METHODS,
  rateAgeLabel,
} from '@/lib/ventas/money'

type Props = {
  open: boolean
  sale: Sale
  rates: ExchangeRates | null
  onOpenChange: (open: boolean) => void
  onSaved: (sale: Sale) => void
}

export function PaymentDialog({
  open,
  sale,
  rates,
  onOpenChange,
  onSaved,
}: Props) {
  const api = useApi()
  const [method, setMethod] = useState<PaymentMethod>('PAGO_MOVIL')
  const [amountInput, setAmountInput] = useState('')
  const [inputMode, setInputMode] = useState<'native' | 'usd'>('native')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const meta = PAYMENT_METHOD_META[method]
  const bcv = rates?.bcv ?? null
  const rate = bcv?.rate ?? null

  useEffect(() => {
    if (!open) return
    setMethod('PAGO_MOVIL')
    setAmountInput('')
    setInputMode('native')
    setNote('')
  }, [open])

  const computed = useMemo(() => {
    const n = Number(amountInput)
    if (!Number.isFinite(n) || n <= 0) {
      return { amountNative: null as number | null, amountUsd: null as number | null }
    }
    if (meta.currency === 'USD') {
      return { amountNative: n, amountUsd: n }
    }
    if (!rate || rate <= 0) {
      return { amountNative: null, amountUsd: null }
    }
    if (inputMode === 'usd') {
      return { amountNative: Math.round(n * rate * 100) / 100, amountUsd: n }
    }
    return { amountNative: n, amountUsd: Math.round((n / rate) * 100) / 100 }
  }, [amountInput, meta.currency, inputMode, rate])

  const fillLabel =
    sale.payments.length === 0 ? 'Pagar total' : 'Pagar restante'

  function fillRemaining() {
    const useUsd = meta.currency === 'USD' || inputMode === 'usd'
    if (useUsd) {
      setAmountInput(String(Math.round(sale.balanceUsd * 100) / 100))
      return
    }
    if (sale.balanceBs == null) {
      toast.error('Sin tasa BCV')
      return
    }
    setAmountInput(String(Math.round(sale.balanceBs * 100) / 100))
  }

  async function submit() {
    if (computed.amountNative == null || computed.amountNative <= 0) {
      toast.error('Monto inválido')
      return
    }
    if (meta.currency === 'BS' && (!rate || rate <= 0)) {
      toast.error('No hay tasa BCV disponible')
      return
    }
    setSaving(true)
    try {
      const updated = await api.addPayment(sale.id, {
        method,
        amount: computed.amountNative,
        note: note.trim() || null,
      })
      toast.success(
        `Abonado. Faltan ${balanceLabel(updated.balanceUsd, updated.balanceBs, updated.bsRate)}`,
      )
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error registrando pago')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Saldo:{' '}
            {balanceLabel(sale.balanceUsd, sale.balanceBs, sale.bsRate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Método</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
              value={method}
              onChange={(e) => {
                const next = e.target.value as PaymentMethod
                setMethod(next)
                // BS methods always start in bolívares; USD has no toggle
                setInputMode('native')
                setAmountInput('')
              }}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_META[m].label} (
                  {PAYMENT_METHOD_META[m].currency})
                </option>
              ))}
            </select>
          </div>

          {meta.currency === 'BS' && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={inputMode === 'native' ? 'default' : 'outline'}
                onClick={() => setInputMode('native')}
              >
                En Bs
              </Button>
              <Button
                type="button"
                size="sm"
                variant={inputMode === 'usd' ? 'default' : 'outline'}
                onClick={() => setInputMode('usd')}
              >
                En USD
              </Button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2">
              <Label>
                Monto{' '}
                {meta.currency === 'BS'
                  ? inputMode === 'usd'
                    ? '(USD)'
                    : '(Bs)'
                  : '(USD)'}
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={fillRemaining}
              >
                {fillLabel}
              </Button>
            </div>
            <Input
              className="mt-1"
              type="number"
              min={0}
              step="0.01"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
            {meta.currency === 'BS' && (
              <p className="mt-1 text-xs text-gray-500">
                {rate
                  ? `tasa ${rate.toFixed(2)} · ${rateAgeLabel(bcv?.fetchedAt)}`
                  : 'Sin tasa BCV'}
                {computed.amountNative != null &&
                  computed.amountUsd != null && (
                    <span className="ml-2 font-medium text-gray-700">
                      →{' '}
                      {inputMode === 'usd'
                        ? formatBs(computed.amountNative)
                        : formatUsd(computed.amountUsd)}
                    </span>
                  )}
              </p>
            )}
          </div>

          <div>
            <Label>Nota (opcional)</Label>
            <Input
              className="mt-1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
