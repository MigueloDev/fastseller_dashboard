'use client'

import { useEffect, useState } from 'react'
import type { CashAccount, PaymentCurrency } from '@/types'
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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: CashAccount | null
  onSaved: (account: CashAccount) => void
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account = null,
  onSaved,
}: Props) {
  const api = useApi()
  const editing = Boolean(account)
  const [alias, setAlias] = useState('')
  const [institution, setInstitution] = useState('')
  const [holder, setHolder] = useState('')
  const [currency, setCurrency] = useState<PaymentCurrency>('BS')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{
    alias?: string
    institution?: string
    holder?: string
  }>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setAlias(account?.alias ?? '')
    setInstitution(account?.institution ?? '')
    setHolder(account?.holder ?? '')
    setCurrency(account?.currency ?? 'BS')
    setActive(account?.active ?? true)
  }, [open, account])

  async function submit() {
    const nextErrors: typeof errors = {}
    if (!alias.trim()) nextErrors.alias = 'Alias requerido'
    if (!institution.trim()) nextErrors.institution = 'Institución requerida'
    if (!holder.trim()) nextErrors.holder = 'Titular requerido'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    setSaving(true)
    try {
      const saved = editing && account
        ? await api.updateCashAccount(account.id, {
            alias: alias.trim(),
            institution: institution.trim(),
            holder: holder.trim(),
            active,
          })
        : await api.createCashAccount({
            alias: alias.trim(),
            institution: institution.trim(),
            holder: holder.trim(),
            currency,
          })
      notify.success(editing ? 'Cuenta actualizada' : 'Cuenta creada')
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error guardando cuenta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle>
          <DialogDescription>
            Bolsillo real (banco o exchange). La moneda no se cambia si ya hay
            movimientos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>
              Alias <span className="text-red-600">*</span>
            </Label>
            <Input
              className="mt-1"
              value={alias}
              onChange={(e) => {
                setAlias(e.target.value)
                setErrors((er) => ({ ...er, alias: undefined }))
              }}
            />
            {errors.alias && (
              <p className="mt-1 text-xs text-red-600">{errors.alias}</p>
            )}
          </div>
          <div>
            <Label>
              Institución <span className="text-red-600">*</span>
            </Label>
            <Input
              className="mt-1"
              value={institution}
              onChange={(e) => {
                setInstitution(e.target.value)
                setErrors((er) => ({ ...er, institution: undefined }))
              }}
            />
            {errors.institution && (
              <p className="mt-1 text-xs text-red-600">{errors.institution}</p>
            )}
          </div>
          <div>
            <Label>
              Titular <span className="text-red-600">*</span>
            </Label>
            <Input
              className="mt-1"
              value={holder}
              onChange={(e) => {
                setHolder(e.target.value)
                setErrors((er) => ({ ...er, holder: undefined }))
              }}
            />
            {errors.holder && (
              <p className="mt-1 text-xs text-red-600">{errors.holder}</p>
            )}
          </div>
          <div>
            <Label>Moneda</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm disabled:opacity-50"
              value={currency}
              disabled={editing}
              onChange={(e) => setCurrency(e.target.value as PaymentCurrency)}
            >
              <option value="BS">Bs</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Activa
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
