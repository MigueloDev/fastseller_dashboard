import type { IntentType } from '@/types'
import clsx from 'clsx'

interface Props {
  intent: IntentType
  size?: 'sm' | 'md'
}

const config: Record<string, { label: string; icon: string; className: string }> = {
  intencion: {
    label: 'Intención de compra',
    icon: '🎯',
    className: 'bg-red-50 text-red-600 border border-red-100',
  },
  consulta: {
    label: 'Consulta',
    icon: '💬',
    className: 'bg-blue-50 text-blue-600 border border-blue-100',
  },
  saludo: {
    label: 'Saludo',
    icon: '👋',
    className: 'bg-gray-50 text-gray-500 border border-gray-200',
  },
}

export function IntentBadge({ intent, size = 'md' }: Props) {
  if (!intent || intent === 'off_topic' || !config[intent]) return null

  const { label, icon, className } = config[intent]

  return (
    <span className={clsx(
      'inline-flex items-center gap-1 rounded-full font-medium',
      size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1',
      className,
    )}>
      <span style={{ fontSize: 10 }}>{icon}</span>
      {label}
    </span>
  )
}
