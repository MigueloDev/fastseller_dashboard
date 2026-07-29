'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import type { ExchangeRateRow, ExchangeRates, PaymentMethod, Sale } from '@/types'
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
import { BcvRatePicker } from '@/components/ventas/BcvRatePicker'
import {
  balanceLabel,
  formatBs,
  formatUsd,
  PAYMENT_METHOD_META,
  PAYMENT_METHODS,
  rateAgeLabel,
} from '@/lib/ventas/money'
import { fileToWebpBase64 } from '@/lib/ventas/receiptImage'

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024
const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp'

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
  const fileRef = useRef<HTMLInputElement>(null)
  const [method, setMethod] = useState<PaymentMethod>('PAGO_MOVIL')
  const [amountInput, setAmountInput] = useState('')
  const [inputMode, setInputMode] = useState<'native' | 'usd'>('native')
  const [note, setNote] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [rateId, setRateId] = useState(rateHistory[0]?.id ?? '')
  const [saving, setSaving] = useState(false)

  const meta = PAYMENT_METHOD_META[method]
  const pickedRate = rateHistory.find((r) => r.id === rateId) ?? null
  const rate = pickedRate?.rate ?? rates?.bcv?.rate ?? null
  const rateFetchedAt = pickedRate?.fetchedAt ?? rates?.bcv?.fetchedAt

  useEffect(() => {
    if (!open) return
    setMethod('PAGO_MOVIL')
    setAmountInput('')
    setInputMode('native')
    setNote('')
    setRateId(rateHistory[0]?.id ?? '')
    setReceiptFile(null)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (fileRef.current) fileRef.current.value = ''
  }, [open, rateHistory])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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
    if (rate && rate > 0) {
      setAmountInput(String(Math.round(sale.balanceUsd * rate * 100) / 100))
      return
    }
    if (sale.balanceBs == null) {
      toast.error('Sin tasa BCV')
      return
    }
    setAmountInput(String(Math.round(sale.balanceBs * 100) / 100))
  }

  function onPickReceipt(file: File | null) {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (!file) {
      setReceiptFile(null)
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Solo JPEG, PNG o WebP')
      if (fileRef.current) fileRef.current.value = ''
      setReceiptFile(null)
      return
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      toast.error('La imagen supera 5 MB')
      if (fileRef.current) fileRef.current.value = ''
      setReceiptFile(null)
      return
    }
    setReceiptFile(file)
    setPreviewUrl(URL.createObjectURL(file))
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
      let receiptBase64: string | null = null
      if (receiptFile) {
        const converted = await fileToWebpBase64(receiptFile)
        if (converted.bytes > RECEIPT_MAX_BYTES) {
          toast.error('El WebP convertido supera 5 MB')
          return
        }
        receiptBase64 = converted.base64
      }
      const updated = await api.addPayment(sale.id, {
        method,
        amount: computed.amountNative,
        note: note.trim() || null,
        receiptBase64,
        rateId: rateId || null,
      })
      toast.success(
        updated.status === 'PAGADA'
          ? 'Venta pagada'
          : `Abonado. Faltan ${balanceLabel(updated.balanceUsd, updated.balanceBs, updated.bsRate)}`,
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
            <input
              ref={fileRef}
              className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-violet-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-violet-700 hover:file:bg-violet-100"
              type="file"
              accept={RECEIPT_ACCEPT}
              onChange={(e) => onPickReceipt(e.target.files?.[0] ?? null)}
            />
            {receiptFile && (
              <div className="mt-2 flex items-start gap-3">
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Vista previa del comprobante"
                    className="h-16 w-16 rounded border border-gray-200 object-cover"
                  />
                )}
                <div className="min-w-0 flex-1 text-xs text-gray-500">
                  <p className="truncate font-medium text-gray-700">
                    {receiptFile.name}
                  </p>
                  <p>Se convertirá a WebP al guardar</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-1 h-7 text-xs"
                    onClick={() => {
                      if (fileRef.current) fileRef.current.value = ''
                      onPickReceipt(null)
                    }}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            )}
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
