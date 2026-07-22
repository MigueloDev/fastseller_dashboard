'use client'

import { cn } from '@/lib/utils'
import { PERIOD_LABELS, type PeriodKey } from '@/lib/dashboard/period'

const KEYS: PeriodKey[] = ['hoy', 'semana', 'mes', 'todo']

type Props = {
  value: PeriodKey
  onChange: (key: PeriodKey) => void
}

export function PeriodTabs({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm transition-colors',
            value === key
              ? 'bg-violet-50 font-medium text-violet-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          {PERIOD_LABELS[key]}
        </button>
      ))}
    </div>
  )
}
