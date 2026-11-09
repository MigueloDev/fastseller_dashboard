import type { MetricsProfit } from '@/types'
import { formatUsd } from '@/lib/ventas/money'
import { PERIOD_LABELS, type PeriodKey } from '@/lib/dashboard/period'
import { PeriodDelta } from '@/components/dashboard/PeriodDelta'

type Props = {
  profit: MetricsProfit
  previousUsd: number | null
  period: PeriodKey
  salesCount: number
}

export function ProfitCard({ profit, previousUsd, period, salesCount }: Props) {
  const empty = salesCount === 0
  const unknown = profit.totalUsd == null && !empty

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Ganancia
        </p>
        <p className="text-xs text-gray-400">{PERIOD_LABELS[period]}</p>
      </div>

      <p
        className={`mt-3 tabular-nums text-4xl font-semibold tracking-tight ${
          profit.totalUsd != null && profit.totalUsd < 0
            ? 'text-red-600'
            : 'text-gray-900'
        }`}
      >
        {profit.totalUsd == null ? '—' : formatUsd(profit.totalUsd)}
      </p>

      <div className="mt-2 min-h-5">
        {empty ? (
          <p className="text-sm text-gray-500">Sin ventas en este período</p>
        ) : unknown ? (
          <p className="text-sm text-gray-500">Sin costo histórico</p>
        ) : (
          <PeriodDelta current={profit.totalUsd} previous={previousUsd} />
        )}
      </div>

      {(profit.marginPct != null ||
        (profit.unknownCount > 0 && profit.totalUsd != null)) && (
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-sm text-gray-500">
          {profit.marginPct != null && (
            <p>
              Margen{' '}
              <span className="font-medium tabular-nums text-gray-900">
                {profit.marginPct.toLocaleString('es-VE', {
                  maximumFractionDigits: 1,
                })}
                %
              </span>
            </p>
          )}
          {profit.unknownCount > 0 && profit.totalUsd != null && (
            <p>{profit.unknownCount} sin costo, fuera del total</p>
          )}
        </div>
      )}
    </div>
  )
}
