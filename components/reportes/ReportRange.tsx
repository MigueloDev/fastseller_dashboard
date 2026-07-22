'use client'

import { PeriodTabs } from '@/components/dashboard/PeriodTabs'
import { formatYmd, localRange, type PeriodKey } from '@/lib/dashboard/period'

export type RangeState = {
  period: PeriodKey
  /** YYYY-MM-DD; si están puestos mandan sobre el tab. */
  fromYmd: string
  toYmd: string
}

export const DEFAULT_RANGE: RangeState = {
  period: 'mes',
  fromYmd: '',
  toYmd: '',
}

/**
 * Traduce el estado del filtro a from/to ISO para la API.
 * El rango manual gana sobre el tab; `to` cubre el día completo.
 */
export function rangeQuery(state: RangeState): { from?: string; to?: string } {
  if (state.fromYmd || state.toYmd) {
    const query: { from?: string; to?: string } = {}
    if (state.fromYmd) {
      query.from = new Date(`${state.fromYmd}T00:00:00`).toISOString()
    }
    if (state.toYmd) {
      query.to = new Date(`${state.toYmd}T23:59:59.999`).toISOString()
    }
    return query
  }
  const r = localRange(state.period)
  if (!r) return {}
  return { from: r.from.toISOString(), to: r.to.toISOString() }
}

/** Etiqueta legible del rango activo, para títulos y nombres de archivo. */
export function rangeLabel(state: RangeState): string {
  if (state.fromYmd || state.toYmd) {
    return `${state.fromYmd || '…'}_${state.toYmd || '…'}`
  }
  const r = localRange(state.period)
  if (!r) return 'todo'
  return `${formatYmd(r.from)}_${formatYmd(r.to)}`
}

type Props = {
  value: RangeState
  onChange: (next: RangeState) => void
}

export function ReportRange({ value, onChange }: Props) {
  const custom = Boolean(value.fromYmd || value.toYmd)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PeriodTabs
        value={value.period}
        onChange={(period) => onChange({ period, fromYmd: '', toYmd: '' })}
      />
      <div className="flex items-center gap-1.5 text-sm text-gray-600">
        <input
          type="date"
          aria-label="Desde"
          className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
          value={value.fromYmd}
          onChange={(e) => onChange({ ...value, fromYmd: e.target.value })}
        />
        <span className="text-gray-400">→</span>
        <input
          type="date"
          aria-label="Hasta"
          className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
          value={value.toYmd}
          onChange={(e) => onChange({ ...value, toYmd: e.target.value })}
        />
        {custom && (
          <button
            type="button"
            className="text-xs text-violet-700 underline"
            onClick={() => onChange({ ...value, fromYmd: '', toYmd: '' })}
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}
