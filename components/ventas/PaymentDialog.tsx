'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CashAccount, ExchangeRateRow, ExchangeRates, PaymentMethod, Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReceiptPicker } from '@/components/ui/receipt-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BcvRatePicker } from '@/components/ventas/BcvRatePicker'
import {
  CashAccountSelect,
  pickDefaultAccount,
} from '@/components/cuentas/CashAccountSelect'
import {
  balanceLabel,
  formatBs,
  formatUsd,
  PAYMENT_METHOD_META,
  PAYMENT_METHODS,
  rateAgeLabel,
} from '@/lib/ventas/money'
import { fileToWebpBase64, RECEIPT_MAX_BYTES } from '@/lib/ventas/receiptImage'

type Props = {
  open: boolean
  sale: Sale
  rates: ExchangeRates | null
  rateHistory: ExchangeRateRow[]
  onOpenChange: (open: boolean) => void
  onSaved: (sale: Sale) => void
}

export function PaymentDialog({
  open,
  sale,
  rates,
  rateHistory,
  onOpenChange,
  onSaved,
}: Props) {
  const api = useApi()
  const [method, setMethod] = useState<PaymentMethod>('PAGO_MOVIL')
  const [amountInput, setAmountInput] = useState('')
  const [inputMode, setInputMode] = useState<'native' | 'usd'>('native')
  const [note, setNote] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [rateId, setRateId] = useState(rateHistory[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ amount?: string; receipt?: string; account?: string }>({})
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [accountId, setAccountId] = useState('')

  const meta = PAYMENT_METHOD_META[method]
  const pickedRate = rateHistory.find((r) => r.id === rateId) ?? null
  const rate = pickedRate?.rate ?? rates?.bcv?.rate ?? null
  const rateFetchedAt = pickedRate?.fetchedAt ?? rates?.bcv?.fetchedAt

  // El cierre de la venta es en USD (Σ amountUsd de cada pago).
  // El Bs pendiente del diálogo DEBE usar la tasa seleccionada, no sale.balanceBs
  // (ese va a tasa live y hace que un abono "por el total en Bs" quede corto/largo).
  const balanceBsAtRate =
    rate && rate > 0
      ? Math.round(sale.balanceUsd * rate * 100) / 100
      : null
  const selectedBsRate =
    rate && rate > 0
      ? { rate, fetchedAt: rateFetchedAt ?? new Date().toISOString() }
      : null

  useEffect(() => {
    if (!open) return
    setMethod('PAGO_MOVIL')
    setAmountInput('')
    setErrors({})
    setInputMode('native')
    setNote('')
    setRateId(rateHistory[0]?.id ?? '')
    setReceiptFile(null)
    setAccountId('')
    void api.getCashAccounts().then((rows) => {
      setAccounts(rows)
      const def = pickDefaultAccount(rows, PAYMENT_METHOD_META.PAGO_MOVIL.currency)
      setAccountId(def?.id ?? '')
    }).catch(() => setAccounts([]))
  }, [open, rateHistory, api])

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
    if (balanceBsAtRate == null) {
      setErrors((e) => ({ ...e, amount: 'Sin tasa BCV para convertir' }))
      return
    }
    setAmountInput(String(balanceBsAtRate))
  }

  async function submit() {
    setErrors({})
    if (computed.amountNative == null || computed.amountNative <= 0) {
      setErrors({ amount: 'Monto inválido' })
      return
    }
    if (!accountId) {
      setErrors({ account: 'Cuenta requerida' })
      return
    }
    if (meta.currency === 'BS' && (!rate || rate <= 0)) {
      setErrors({ amount: 'No hay tasa BCV disponible' })
      return
    }
    setSaving(true)
    try {
      let receiptBase64: string | null = null
      if (receiptFile) {
        const converted = await fileToWebpBase64(receiptFile)
        if (converted.bytes > RECEIPT_MAX_BYTES) {
          setErrors({ receipt: 'El WebP convertido supera 5 MB' })
          return
        }
        receiptBase64 = converted.base64
      }
      const updated = await api.addPayment(sale.id, {
        method,
        amount: computed.amountNative,
        accountId,
        note: note.trim() || null,
        receiptBase64,
        rateId: rateId || null,
      })
      // Toast con la misma tasa del abono (no la live de updated.balanceBs).
      const remBs =
        rate && rate > 0
          ? Math.round(updated.balanceUsd * rate * 100) / 100
          : updated.balanceBs
      const remRate = selectedBsRate ?? updated.bsRate
      notify.success(
        updated.status === 'PAGADA'
          ? 'Venta pagada'
          : `Abonado. Faltan ${balanceLabel(updated.balanceUsd, remBs, remRate)}`,
      )
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error registrando pago')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Saldo:{' '}
            {balanceLabel(sale.balanceUsd, balanceBsAtRate, selectedBsRate)}
            {meta.currency === 'BS' && selectedBsRate
              ? ' · Bs según tasa elegida (cierre en USD)'
              : ''}
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
                setInputMode('native')
                setAmountInput('')
                const def = pickDefaultAccount(
                  accounts,
                  PAYMENT_METHOD_META[next].currency,
                )
                setAccountId(def?.id ?? '')
                setErrors((er) => ({ ...er, account: undefined }))
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

          <CashAccountSelect
            accounts={accounts}
            currency={meta.currency}
            value={accountId}
            onChange={(next) => {
              setAccountId(next)
              setErrors((er) => ({ ...er, account: undefined }))
            }}
            label="Cuenta"
            error={errors.account}
          />

          {rateHistory.length > 0 && (
            <div>
              <Label>Tasa BCV</Label>
              <BcvRatePicker
                options={rateHistory}
                value={rateId}
                onChange={setRateId}
              />
            </div>
          )}

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
                Monto <span className="text-red-600">*</span>{' '}
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
              onChange={(e) => {
                setAmountInput(e.target.value)
                setErrors((er) => ({ ...er, amount: undefined }))
              }}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
            )}
            {meta.currency === 'BS' && (
              <p className="mt-1 text-xs text-gray-500">
                {rate
                  ? `tasa ${rate.toFixed(2)} · ${rateAgeLabel(rateFetchedAt)}`
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

          <div>
            <Label>Comprobante (opcional)</Label>
            {open && (
              <ReceiptPicker
                file={receiptFile}
                onChange={(next) => {
                  setReceiptFile(next)
                  setErrors((e) => ({ ...e, receipt: undefined }))
                }}
                error={errors.receipt}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
