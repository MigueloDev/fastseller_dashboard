'use client'

import type { ExchangeRateRow } from '@/types'

function optionLabel(row: ExchangeRateRow): string {
  const when = new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(row.fetchedAt))
  return `${row.rate.toFixed(2)} · ${when}`
}

type Props = {
  options: ExchangeRateRow[]
  value: string
  onChange: (id: string) => void
}

/** Selector de una fila histórica BCV (más reciente primero). */
export function BcvRatePicker({ options, value, onChange }: Props) {
  return (
    <select
      className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((r) => (
        <option key={r.id} value={r.id}>
          {optionLabel(r)}
        </option>
      ))}
    </select>
  )
}
