'use client'

import { useEffect, useState } from 'react'
import type {
  CashMovementReason,
  CashMovementType,
  PaymentCurrency,
} from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
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

type Intent =
  | 'ENTRADA'
  | 'SALIDA'
  | 'AJUSTE'
  | 'GASTO'
  | 'PRESTAMO_OUT'
  | 'PRESTAMO_IN'

const INTENT: Record<
  Intent,
  { type: CashMovementType; reason: CashMovementReason }
> = {
  ENTRADA: { type: 'ENTRADA', reason: 'MANUAL' },
  SALIDA: { type: 'SALIDA', reason: 'MANUAL' },
  AJUSTE: { type: 'AJUSTE', reason: 'MANUAL' },
  GASTO: { type: 'SALIDA', reason: 'GASTO' },
  PRESTAMO_OUT: { type: 'SALIDA', reason: 'PRESTAMO' },
  PRESTAMO_IN: { type: 'ENTRADA', reason: 'PRESTAMO' },
}

type Props = {
  open: boolean
  accountId: string
  currency: PaymentCurrency
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function CashMovementDialog({
  open,
  accountId,
  currency,
  onOpenChange,
  onSaved,
}: Props) {
  const api = useApi()
  const [intent, setIntent] = useState<Intent>('ENTRADA')
  const [amountInput, setAmountInput] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setIntent('ENTRADA')
    setAmountInput('')
    setNote('')
    setError('')
  }, [open])

  const { type, reason } = INTENT[intent]
  const isLoan = reason === 'PRESTAMO'
  const amountLabel = type === 'AJUSTE' ? 'Delta (con signo)' : 'Monto'
  const unit = currency === 'BS' ? 'Bs' : 'USD'

  async function submit() {
    const n = Number(amountInput)
    if (!Number.isFinite(n) || n === 0) {
      setError(type === 'AJUSTE' ? 'Delta distinto de 0' : 'Monto inválido')
      return
    }
    if (type !== 'AJUSTE' && n < 0) {
      setError('El monto debe ser > 0')
      return
    }
    const trimmed = note.trim()
    if (isLoan && !trimmed) {
      setError('Indicá a quién / de quién')
      return
    }
    setSaving(true)
    try {
      await api.createCashMovement(
        accountId,
        type === 'AJUSTE'
          ? { type, reason, delta: n, note: trimmed || null }
          : { type, reason, amount: n, note: trimmed || null },
      )
      notify.success('Movimiento registrado')
      onSaved()
      onOpenChange(false)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error registrando movimiento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            Entrada, salida, gasto, préstamo o ajuste. Una salida mayor al
            saldo se rechaza.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
              value={intent}
              onChange={(e) => {
                setIntent(e.target.value as Intent)
                setError('')
              }}
            >
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="GASTO">Gasto</option>
              <option value="PRESTAMO_OUT">Préstamo otorgado</option>
              <option value="PRESTAMO_IN">Cobro de préstamo</option>
            </select>
          </div>
          <div>
            <Label>
              {amountLabel} ({unit}) <span className="text-red-600">*</span>
            </Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value)
                setError('')
              }}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          <div>
            <Label>
              {isLoan ? 'A quién / de quién' : 'Nota (opcional)'}
              {isLoan && <span className="text-red-600"> *</span>}
            </Label>
            <Input
              className="mt-1"
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setError('')
              }}
            />
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
