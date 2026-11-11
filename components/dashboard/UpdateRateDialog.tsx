'use client'

import { useState } from 'react'
import type { ExchangeRates, RateQuote } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { formatDateTime } from '@/lib/format'
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
  current: RateQuote | null
  onOpenChange: (open: boolean) => void
  onUpdated: (rates: ExchangeRates) => void
}

export function UpdateRateDialog({ open, current, onOpenChange, onUpdated }: Props) {
  const api = useApi()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  // Acepta coma decimal (es-VE): "901,62" → 901.62
  const manual = Number(value.trim().replace(',', '.'))
  const manualValid = value.trim() !== '' && Number.isFinite(manual) && manual > 0

  async function submit(rate?: number) {
    setSaving(true)
    try {
      const res = await api.updateRate({ source: 'BCV', rate })
      onUpdated(res)
      notify.success(
        rate != null
          ? 'Tasa BCV guardada'
          : res.stored
            ? 'Tasa BCV actualizada desde BCV'
            : 'BCV sigue publicando la misma tasa',
      )
      setValue('')
      onOpenChange(false)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error actualizando tasa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Actualizar tasa BCV</DialogTitle>
          <DialogDescription>
            {current
              ? `Actual: Bs ${current.rate} · ${formatDateTime(current.fetchedAt)}`
              : 'Sin tasa registrada'}
          </DialogDescription>
        </DialogHeader>

        <Button variant="outline" disabled={saving} onClick={() => void submit()}>
          Consultar BCV ahora
        </Button>

        <div className="space-y-1.5">
          <Label htmlFor="manual-bcv">O ingresar tasa manual (Bs por USD)</Label>
          <Input
            id="manual-bcv"
            inputMode="decimal"
            placeholder="Ej: 901,6175"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Queda fija por hoy: el job automático no la reemplaza hasta que BCV publique la del día siguiente.
          </p>
        </div>

        <DialogFooter>
          <Button disabled={saving || !manualValid} onClick={() => void submit(manual)}>
            Guardar tasa manual
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
