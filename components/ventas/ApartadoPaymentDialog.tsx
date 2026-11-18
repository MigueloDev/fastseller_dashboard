'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CashAccount, ExchangeRateRow, ExchangeRates, PaymentMethod, Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReceiptPicker } from '@/components/ui/receipt-picker'
import { SelectCombobox } from '@/components/ui/select-combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BcvRatePicker } from '@/components/ventas/BcvRatePicker'
import { CashAccountSelect, pickDefaultAccount } from '@/components/cuentas/CashAccountSelect'
import {
  formatBs,
  formatUsd,
  PAYMENT_METHOD_META,
  PAYMENT_METHODS,
  rateAgeLabel,
  round2,
} from '@/lib/ventas/money'
import { formatDate } from '@/lib/format'
import { layawaySchedule } from '@/lib/ventas/layaway'
import { fileToWebpBase64, RECEIPT_MAX_BYTES } from '@/lib/ventas/receiptImage'

type Props = {
  open: boolean
  sale: Sale
  rates: ExchangeRates | null
  rateHistory: ExchangeRateRow[]
  onOpenChange: (open: boolean) => void
  onSaved: (sale: Sale) => void
}

/**
 * Pago de una venta por apartado: precarga la próxima cuota y muestra cómo
 * queda el cronograma con el monto escrito (puede pagar más o menos).
 */
export function ApartadoPaymentDialog({ open, sale, rates, rateHistory, onOpenChange, onSaved }: Props) {
  const api = useApi()
  const [method, setMethod] = useState<PaymentMethod>('PAGO_MOVIL')
  const [amountInput, setAmountInput] = useState('')
  const [inputMode, setInputMode] = useState<'native' | 'usd'>('usd')
  const [note, setNote] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [rateId, setRateId] = useState(rateHistory[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ amount?: string; receipt?: string; account?: string }>({})
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [accountId, setAccountId] = useState('')

  const meta = PAYMENT_METHOD_META[method]
  const pickedRate = rateHistory.find((r) => r.id === rateId) ?? null
  const rawRate = pickedRate?.rate ?? rates?.bcv?.rate ?? null
  const rate = rawRate != null ? round2(rawRate) : null
  const rateFetchedAt = pickedRate?.fetchedAt ?? rates?.bcv?.fetchedAt
  const next = sale.schedule?.next ?? null
  const nextAmountUsd = next?.amountUsd
  // Cuotas en USD; en Bs se paga a la tasa BCV del día (cláusula SEGUNDA).
  const usdMode = meta.currency === 'USD' || inputMode === 'usd'

  useEffect(() => {
    if (!open) return
    setMethod('PAGO_MOVIL')
    setInputMode('usd')
    setAmountInput(nextAmountUsd != null ? String(nextAmountUsd) : '')
    setErrors({})
    setNote('')
    setRateId(rateHistory[0]?.id ?? '')
    setReceiptFile(null)
    setAccountId('')
    void api.getCashAccounts().then((rows) => {
      setAccounts(rows)
      setAccountId(pickDefaultAccount(rows, PAYMENT_METHOD_META.PAGO_MOVIL.currency)?.id ?? '')
    }).catch(() => setAccounts([]))
  }, [open, rateHistory, api, nextAmountUsd])

  const computed = useMemo(() => {
    const n = Number(amountInput)
    if (!Number.isFinite(n) || n <= 0) return { amountNative: null as number | null, amountUsd: null as number | null }
    if (meta.currency === 'USD') return { amountNative: n, amountUsd: n }
    if (!rate || rate <= 0) return { amountNative: null, amountUsd: null }
    if (inputMode === 'usd') return { amountNative: round2(n * rate), amountUsd: n }
    return { amountNative: n, amountUsd: round2(n / rate) }
  }, [amountInput, meta.currency, inputMode, rate])

  // Vista previa: el cronograma recalculado como si el pago entrara hoy.
  const preview = useMemo(() => {
    if (!sale.layaway || computed.amountUsd == null) return null
    return layawaySchedule({
      totalUsd: sale.totalUsd,
      layaway: sale.layaway,
      payments: [...sale.payments, { amountUsd: computed.amountUsd, paidAt: new Date().toISOString() }],
    })
  }, [sale, computed.amountUsd])

  function fill(usd: number) {
    if (usdMode) return setAmountInput(String(usd))
    if (!rate || rate <= 0) return setErrors((e) => ({ ...e, amount: 'Sin tasa BCV para convertir' }))
    setAmountInput(String(round2(usd * rate)))
  }

  async function submit() {
    setErrors({})
    if (computed.amountNative == null || computed.amountNative <= 0) return setErrors({ amount: 'Monto inválido' })
    if (!accountId) return setErrors({ account: 'Cuenta requerida' })
    if (meta.currency === 'BS' && (!rate || rate <= 0)) return setErrors({ amount: 'No hay tasa BCV disponible' })
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
      const nxt = updated.schedule?.next
      notify.success(
        updated.status === 'PAGADA'
          ? 'Apartado pagado por completo'
          : `Abonado. Próxima: ${nxt ? `${nxt.label} ${formatUsd(nxt.amountUsd)} (${formatDate(nxt.dueAt)})` : `resta ${formatUsd(updated.balanceUsd)}`}`,
      )
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error registrando pago')
    } finally {
      setSaving(false)
    }
  }

  const previewNext = preview?.next ? preview.rows.slice(preview.next.index).filter((r) => r.status !== 'PAGADA') : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pago de apartado</DialogTitle>
          <DialogDescription>
            {next
              ? `${next.label}: ${formatUsd(next.amountUsd)} · vence ${formatDate(next.dueAt)}`
              : 'Sin cuotas pendientes'}
            {' · '}Resta {formatUsd(sale.balanceUsd)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Método</Label>
            <SelectCombobox
              className="mt-1"
              items={PAYMENT_METHODS.map((m) => ({
                value: m,
                label: `${PAYMENT_METHOD_META[m].label} (${PAYMENT_METHOD_META[m].currency})`,
              }))}
              value={method}
              onChange={(value) => {
                if (!value) return // método obligatorio: ignorar el "clear" del combobox
                const nextMethod = value as PaymentMethod
                setMethod(nextMethod)
                setInputMode('usd')
                setAmountInput(next ? String(next.amountUsd) : '')
                setAccountId(pickDefaultAccount(accounts, PAYMENT_METHOD_META[nextMethod].currency)?.id ?? '')
                setErrors((er) => ({ ...er, account: undefined }))
              }}
              aria-label="Método de pago"
            />
          </div>

          <CashAccountSelect
            accounts={accounts}
            currency={meta.currency}
            value={accountId}
            onChange={(v) => {
              setAccountId(v)
              setErrors((er) => ({ ...er, account: undefined }))
            }}
            label="Cuenta"
            error={errors.account}
          />

          {rateHistory.length > 0 && (
            <div>
              <Label>Tasa BCV</Label>
              <BcvRatePicker options={rateHistory} value={rateId} onChange={setRateId} />
            </div>
          )}

          {meta.currency === 'BS' && (
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={inputMode === 'usd' ? 'default' : 'outline'} onClick={() => { setInputMode('usd'); setAmountInput('') }}>
                En USD
              </Button>
              <Button type="button" size="sm" variant={inputMode === 'native' ? 'default' : 'outline'} onClick={() => { setInputMode('native'); setAmountInput('') }}>
                En Bs
              </Button>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>
                Monto <span className="text-red-600">*</span> {usdMode ? '(USD)' : '(Bs)'}
              </Label>
              <div className="flex gap-1">
                {next && (
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => fill(next.amountUsd)}>
                    Pagar cuota
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => fill(sale.balanceUsd)}>
                  Pagar restante
                </Button>
              </div>
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
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
            {meta.currency === 'BS' && (
              <p className="mt-1 text-xs text-gray-500">
                {rate ? `tasa ${rate.toFixed(2)} · ${rateAgeLabel(rateFetchedAt)}` : 'Sin tasa BCV'}
                {computed.amountNative != null && computed.amountUsd != null && (
                  <span className="ml-2 font-medium text-gray-700">
                    → {usdMode ? formatBs(computed.amountNative) : formatUsd(computed.amountUsd)}
                  </span>
                )}
              </p>
            )}
          </div>

          {preview && (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {preview.remainingUsd <= 0.1 ? (
                <p className="font-medium text-green-700">Con este pago el apartado queda saldado.</p>
              ) : (
                <>
                  <p className="mb-1 font-medium text-gray-700">
                    Después de este pago resta {formatUsd(preview.remainingUsd)}:
                  </p>
                  <ul className="space-y-0.5 tabular-nums">
                    {previewNext.map((r) => (
                      <li key={r.label} className="flex justify-between gap-2">
                        <span>{r.label} · {formatDate(r.dueAt)}</span>
                        <span>{formatUsd(round2(r.expectedUsd - r.paidUsd))}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div>
            <Label>Referencia / nota (opcional)</Label>
            <Input className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div>
            <Label>Comprobante (opcional)</Label>
            {open && (
              <ReceiptPicker
                file={receiptFile}
                onChange={(f) => {
                  setReceiptFile(f)
                  setErrors((e) => ({ ...e, receipt: undefined }))
                }}
                error={errors.receipt}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
