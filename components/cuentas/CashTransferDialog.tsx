'use client'

import { useEffect, useState } from 'react'
import type { CashAccount } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectCombobox } from '@/components/ui/select-combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CashAccountSelect } from '@/components/cuentas/CashAccountSelect'
import { formatBs, formatUsd } from '@/lib/ventas/money'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultFromAccountId?: string
  onSaved: () => void
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function CashTransferDialog({
  open,
  onOpenChange,
  defaultFromAccountId,
  onSaved,
}: Props) {
  const api = useApi()
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [feeInput, setFeeInput] = useState('0')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setFromId(defaultFromAccountId ?? '')
    setToId('')
    setAmountInput('')
    setFeeInput('0')
    setNote('')
    setError('')
    api
      .getCashAccounts()
      .then(setAccounts)
      .catch((err) =>
        notify.error(err instanceof Error ? err.message : 'Error cargando cuentas'),
      )
  }, [open, defaultFromAccountId, api])

  const from = accounts.find((a) => a.id === fromId)
  const money = (n: number) => (from?.currency === 'BS' ? formatBs(n) : formatUsd(n))
  const amount = Number(amountInput)
  const fee = Number(feeInput || 0)
  const validPreview =
    Number.isFinite(amount) && amount > 0 && Number.isFinite(fee) && fee >= 0 && fee < 100
  const received = validPreview ? round2(amount * (1 - fee / 100)) : 0

  async function submit() {
    if (!from) return setError('Elegí la cuenta de origen')
    if (!toId) return setError('Elegí la cuenta de destino')
    if (!Number.isFinite(amount) || !(amount > 0)) return setError('Monto inválido')
    if (!Number.isFinite(fee) || fee < 0 || fee >= 100) {
      return setError('La comisión debe estar entre 0 y 99,99 %')
    }
    setSaving(true)
    try {
      await api.createCashTransfer({
        fromAccountId: from.id,
        toAccountId: toId,
        amountSent: amount,
        feePercent: fee,
        note: note.trim() || null,
      })
      notify.success('Transferencia registrada')
      onSaved()
      onOpenChange(false)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error registrando transferencia')
    } finally {
      setSaving(false)
    }
  }

  const fromOptions = accounts
    .filter((a) => a.active)
    .map((a) => ({
      value: a.id,
      label: `${a.alias} · ${a.institution} (${a.currency === 'BS' ? 'Bs' : 'USD'})`,
    }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir entre cuentas</DialogTitle>
          <DialogDescription>
            Mismo tipo de moneda. La comisión se descuenta de lo que llega al
            destino (puede ser 0 %).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>
              Desde <span className="text-red-600">*</span>
            </Label>
            <SelectCombobox
              className="mt-1"
              items={fromOptions}
              value={fromId}
              onChange={(id) => {
                setFromId(id)
                setToId('')
                setError('')
              }}
              placeholder="Seleccione cuenta"
              aria-label="Cuenta de origen"
            />
            {from && (
              <p className="mt-1 text-xs text-gray-500">
                Saldo: <span className="tabular-nums">{money(from.balance)}</span>
              </p>
            )}
          </div>

          {from && (
            <CashAccountSelect
              accounts={accounts.filter((a) => a.id !== from.id)}
              currency={from.currency}
              value={toId}
              onChange={(id) => {
                setToId(id)
                setError('')
              }}
              label="Hacia"
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>
                Monto a enviar <span className="text-red-600">*</span>
              </Label>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                min="0"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value)
                  setError('')
                }}
              />
            </div>
            <div>
              <Label>Comisión (%)</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                value={feeInput}
                onChange={(e) => {
                  setFeeInput(e.target.value)
                  setError('')
                }}
              />
            </div>
          </div>

          {from && validPreview && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Recibe</span>
                <span className="font-medium tabular-nums">{money(received)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Comisión</span>
                <span className="tabular-nums">{money(round2(amount - received))}</span>
              </div>
            </div>
          )}

          <div>
            <Label>Nota (opcional)</Label>
            <Input
              className="mt-1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={saving}>
            {saving ? 'Guardando…' : 'Transferir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
