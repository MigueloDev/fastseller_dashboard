'use client'

import { CalendarClock } from 'lucide-react'
import type { LayawayInput, Sale } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectCombobox } from '@/components/ui/select-combobox'
import { formatUsd, round2 } from '@/lib/ventas/money'

export type LayawayDraft = {
  enabled: boolean
  downPaymentUsd: string
  installments: string
  everyDays: string
  deadlineDays: string
  penaltyPct: string
  serial: string
}

/** Valores del contrato base (4 cuotas semanales, 30 días, 20 % de penalidad). */
export function layawayDraftFromSale(sale?: Sale): LayawayDraft {
  const l = sale?.layaway
  return {
    enabled: Boolean(l),
    downPaymentUsd: l ? String(l.downPaymentUsd) : '',
    installments: String(l?.installments ?? 4),
    everyDays: String(l?.everyDays ?? 7),
    deadlineDays: String(l?.deadlineDays ?? 30),
    penaltyPct: String(l?.penaltyPct ?? 20),
    serial: l?.serial ?? '',
  }
}

/** Misma validación que el backend (layawayTermsError). Lanza Error con el mensaje. */
export function layawayPayload(d: LayawayDraft, totalUsd: number): LayawayInput | null {
  if (!d.enabled) return null
  const t = {
    downPaymentUsd: round2(Number(d.downPaymentUsd)),
    installments: Number(d.installments),
    everyDays: Number(d.everyDays),
    deadlineDays: Number(d.deadlineDays),
    penaltyPct: Number(d.penaltyPct),
  }
  if (!(t.downPaymentUsd > 0) || t.downPaymentUsd >= totalUsd) {
    throw new Error('La inicial debe ser mayor a 0 y menor al total')
  }
  if (!Number.isInteger(t.installments) || t.installments < 1) throw new Error('Número de cuotas inválido')
  if (!Number.isInteger(t.everyDays) || t.everyDays < 1) throw new Error('Frecuencia de cuotas inválida')
  if (!Number.isInteger(t.deadlineDays) || t.deadlineDays < t.installments * t.everyDays) {
    throw new Error('El plazo debe cubrir todas las cuotas')
  }
  if (!(t.penaltyPct >= 0 && t.penaltyPct <= 100)) throw new Error('Penalidad inválida')
  return { ...t, serial: d.serial.trim() || null }
}

const CONDITION_ITEMS = [
  { value: 'NORMAL', label: 'Normal (contado / crédito)' },
  { value: 'APARTADO', label: 'Apartado (inicial + cuotas)' },
]

export function LayawayFields({
  value,
  onChange,
  totalUsd,
  error,
}: {
  value: LayawayDraft
  onChange: (next: LayawayDraft) => void
  totalUsd: number
  error?: string
}) {
  const set = (p: Partial<LayawayDraft>) => onChange({ ...value, ...p })
  const down = Number(value.downPaymentUsd)
  const n = Number(value.installments)
  const cuota = down > 0 && n >= 1 && totalUsd > down ? round2((totalUsd - down) / n) : null

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900">
        <CalendarClock className="size-5" /> Condición de pago
      </h2>
      <SelectCombobox
        items={CONDITION_ITEMS}
        value={value.enabled ? 'APARTADO' : 'NORMAL'}
        // Campo obligatorio: el "clear" del combobox se ignora.
        onChange={(v) => v && set({ enabled: v === 'APARTADO' })}
        aria-label="Condición de pago"
      />

      {value.enabled && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="layaway-down">
                Inicial (USD) <span className="text-red-600">*</span>
              </Label>
              <Input
                id="layaway-down"
                className="mt-1"
                type="number"
                min={0}
                step="0.01"
                value={value.downPaymentUsd}
                onChange={(e) => set({ downPaymentUsd: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="layaway-n">Cuotas</Label>
              <Input
                id="layaway-n"
                className="mt-1"
                type="number"
                min={1}
                step="1"
                value={value.installments}
                onChange={(e) => set({ installments: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="layaway-every">Cada (días)</Label>
              <Input
                id="layaway-every"
                className="mt-1"
                type="number"
                min={1}
                step="1"
                value={value.everyDays}
                onChange={(e) => set({ everyDays: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="layaway-deadline">Plazo máx. (días)</Label>
              <Input
                id="layaway-deadline"
                className="mt-1"
                type="number"
                min={1}
                step="1"
                value={value.deadlineDays}
                onChange={(e) => set({ deadlineDays: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="layaway-penalty">Penalidad (% inicial)</Label>
              <Input
                id="layaway-penalty"
                className="mt-1"
                type="number"
                min={0}
                max={100}
                step="1"
                value={value.penaltyPct}
                onChange={(e) => set({ penaltyPct: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="layaway-serial">Serial (opcional)</Label>
              <Input
                id="layaway-serial"
                className="mt-1"
                value={value.serial}
                onChange={(e) => set({ serial: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 tabular-nums">
            {cuota != null
              ? `Inicial ${formatUsd(down)} + ${n} cuota${n > 1 ? 's' : ''} de ${formatUsd(cuota)} · el cliente necesita cédula registrada`
              : 'Indica la inicial para ver el monto de cada cuota'}
          </p>
        </>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  )
}
