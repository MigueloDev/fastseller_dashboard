'use client'

import { useEffect, useState } from 'react'
import type { Lead, LeadSource } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { formatDate } from '@/lib/format'
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
  VE_PHONE_PREFIXES,
  normalizePhone,
  parsePhone,
  sanitizePhoneDigits,
  type VePhonePrefix,
} from '@/lib/ve/phone'

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  TIKTOK: 'TikTok',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  WHATSAPP: 'WhatsApp',
  OTRO: 'Otro',
}

/** ISO → yyyy-MM-dd en America/Caracas (valor de <input type="date">). */
function toDateInput(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }) : ''
}

/** yyyy-MM-dd → ISO al mediodía de Caracas (evita correrse de día por timezone). */
function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T12:00:00-04:00`).toISOString() : null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create mode */
  lead: Lead | null
  onSaved: (lead: Lead) => void
}

export function LeadFormDialog({ open, onOpenChange, lead, onSaved }: Props) {
  const api = useApi()
  const editing = Boolean(lead)
  const [name, setName] = useState('')
  const [source, setSource] = useState<LeadSource | ''>('')
  const [prefix, setPrefix] = useState<VePhonePrefix | ''>('')
  const [digits, setDigits] = useState('')
  const [remindedAt, setRemindedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; source?: string; phone?: string }>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setName(lead?.name ?? '')
    setSource(lead?.source ?? '')
    const phone = parsePhone(lead?.phone)
    setPrefix(phone.prefix)
    setDigits(phone.digits)
    setRemindedAt(toDateInput(lead?.lastRemindedAt ?? null))
  }, [open, lead])

  async function submit() {
    const next: typeof errors = {}
    if (!name.trim()) next.name = 'El nombre es requerido'
    if (!source) next.source = 'Elige la red social'
    const phoneResult = normalizePhone(prefix, digits)
    if (!phoneResult.ok) next.phone = phoneResult.error
    setErrors(next)
    if (next.name || next.source || next.phone || !phoneResult.ok || !source) return

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        source,
        phone: phoneResult.value,
        lastRemindedAt: fromDateInput(remindedAt),
      }
      const saved = editing
        ? await api.updateLead(lead!.id, payload)
        : await api.createLead(payload)
      notify.success(editing ? 'Lead actualizado' : 'Lead registrado')
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error guardando lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar lead' : 'Registrar lead'}</DialogTitle>
          <DialogDescription>
            {lead
              ? `Registrado el ${formatDate(lead.createdAt)}.`
              : 'Nombre y red social son obligatorios.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label htmlFor="lead-name">
              Nombre <span className="text-red-600">*</span>
            </Label>
            <Input
              id="lead-name"
              className="mt-1"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((er) => ({ ...er, name: undefined }))
              }}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="lead-source">
              Red social <span className="text-red-600">*</span>
            </Label>
            <select
              id="lead-source"
              className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
              value={source}
              onChange={(e) => {
                setSource(e.target.value as LeadSource | '')
                setErrors((er) => ({ ...er, source: undefined }))
              }}
            >
              <option value="">Seleccionar…</option>
              {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.source && <p className="mt-1 text-xs text-red-600">{errors.source}</p>}
          </div>

          <div>
            <Label>Teléfono (opcional)</Label>
            <div className="mt-1 flex gap-2">
              <select
                className="h-9 w-[7.5rem] shrink-0 rounded-md border border-gray-200 bg-white px-2 text-sm"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value as VePhonePrefix | '')}
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
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>

          <div>
            <Label htmlFor="lead-reminded">Último recordatorio</Label>
            <Input
              id="lead-reminded"
              type="date"
              className="mt-1"
              value={remindedAt}
              onChange={(e) => setRemindedAt(e.target.value)}
            />
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
