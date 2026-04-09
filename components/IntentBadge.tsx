import type { IntentType } from '@/types'
import clsx from 'clsx'

interface Props {
  intent: IntentType
  pulse?: boolean
}

export function IntentBadge({ intent, pulse = false }: Props) {
  if (!intent || intent === 'off_topic') return null

  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      intent === 'intencion' && 'bg-red-100 text-red-700',
      intent === 'consulta' && 'bg-blue-100 text-blue-700',
      pulse && intent === 'intencion' && 'animate-pulse',
    )}>
      {intent === 'intencion' ? 'Intención de compra' : 'Consulta'}
    </span>
  )
}
