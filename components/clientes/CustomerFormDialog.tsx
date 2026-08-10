'use client'

import { useEffect, useState } from 'react'
import type { Customer } from '@/types'
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
import { normalizeCedula } from '@/lib/ve/cedula'
import {
  VE_PHONE_PREFIXES,
  normalizePhone,
  parsePhone,
  sanitizePhoneDigits,
  type VePhonePrefix,
} from '@/lib/ve/phone'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null/undefined = create mode */
  customer?: Customer | null
  initialQuery?: string
  onSaved: (customer: Customer) => void
}

function guessFromQuery(q: string): {
  cedula: string
  firstName: string
  lastName: string
} {
  const t = q.trim()
  if (!t) return { cedula: '', firstName: '', lastName: '' }
  const asCedula = normalizeCedula(t)
  if (asCedula) return { cedula: asCedula, firstName: '', lastName: '' }
  const parts = t.split(/\s+/)
  if (parts.length >= 2) {
    return {
      cedula: '',
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
    }
  }
  return { cedula: '', firstName: t, lastName: '' }
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer = null,
  initialQuery = '',
  onSaved,
}: Props) {
  const api = useApi()
  const editing = Boolean(customer)
  const [cedula, setCedula] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [prefix, setPrefix] = useState<VePhonePrefix | ''>('')
  const [digits, setDigits] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{
    cedula?: string
    name?: string
    phone?: string
  }>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (customer) {
      setCedula(customer.cedula ?? '')
      setFirstName(customer.firstName)
      setLastName(customer.lastName)
      const phone = parsePhone(customer.phone)
      setPrefix(phone.prefix)
      setDigits(phone.digits)
      return
    }
    const g = guessFromQuery(initialQuery)
    setCedula(g.cedula)
    setFirstName(g.firstName)
    setLastName(g.lastName)
    setPrefix('')
    setDigits('')
  }, [open, customer, initialQuery])

  async function submit() {
    const next: { cedula?: string; name?: string; phone?: string } = {}
    const c = normalizeCedula(cedula)
    if (!c) next.cedula = 'Cédula inválida (V/E + 6–9 dígitos)'
    const fn = firstName.trim()
    const ln = lastName.trim()
    if (!fn || !ln) next.name = 'Nombre y apellido son requeridos'
    const phoneResult = normalizePhone(prefix, digits)
    let phoneValue: string | null = null
    if (phoneResult.ok) phoneValue = phoneResult.value
    else next.phone = phoneResult.error
    setErrors(next)
    if (next.cedula || next.name || next.phone) return

    setSaving(true)
    try {
      const payload = {
        cedula: c!,
        firstName: fn,
        lastName: ln,
        phone: phoneValue,
      }
      const saved = editing
        ? await api.updateCustomer(customer!.id, payload)
        : await api.createCustomer(payload)
      notify.success(editing ? 'Cliente actualizado' : 'Cliente registrado')
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      notify.error(
        err instanceof Error
          ? err.message
          : editing
            ? 'Error actualizando cliente'
            : 'Error creando cliente',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar cliente' : 'Registrar cliente'}
          </DialogTitle>
          <DialogDescription>
            Cédula, nombre y apellido son obligatorios. Teléfono opcional.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label htmlFor="cust-cedula">
              Cédula <span className="text-red-600">*</span>
            </Label>
            <Input
              id="cust-cedula"
              className="mt-1"
              placeholder="V-12345678"
              value={cedula}
              onChange={(e) => {
                setCedula(e.target.value)
                setErrors((er) => ({ ...er, cedula: undefined }))
              }}
              autoFocus
            />
            {errors.cedula && (
              <p className="mt-1 text-xs text-red-600">{errors.cedula}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="cust-fn">
                Nombre <span className="text-red-600">*</span>
              </Label>
              <Input
                id="cust-fn"
                className="mt-1"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value)
                  setErrors((er) => ({ ...er, name: undefined }))
                }}
              />
            </div>
            <div>
              <Label htmlFor="cust-ln">
                Apellido <span className="text-red-600">*</span>
              </Label>
              <Input
                id="cust-ln"
                className="mt-1"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value)
                  setErrors((er) => ({ ...er, name: undefined }))
                }}
              />
            </div>
            {errors.name && (
              <p className="col-span-2 -mt-1 text-xs text-red-600">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <Label>Teléfono (opcional)</Label>
            <div className="mt-1 flex gap-2">
              <select
                className="h-9 w-[7.5rem] shrink-0 rounded-md border border-gray-200 bg-white px-2 text-sm"
                value={prefix}
                onChange={(e) =>
                  setPrefix(e.target.value as VePhonePrefix | '')
                }
              >
                <option value="">Prefijo</option>
                {VE_PHONE_PREFIXES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Input
                inputMode="numeric"
                maxLength={7}
                placeholder="1234567"
                value={digits}
                onChange={(e) => {
                  setDigits(sanitizePhoneDigits(e.target.value))
                  setErrors((er) => ({ ...er, phone: undefined }))
                }}
              />
            </div>
            {errors.phone ? (
              <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">Exactamente 7 dígitos</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? 'Guardando…' : editing ? 'Guardar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
