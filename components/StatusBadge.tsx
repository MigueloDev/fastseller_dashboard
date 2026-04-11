import { Badge } from '@/components/ui/badge'
import type { ConversationStatus } from '@/types'

interface Props {
  status: ConversationStatus
}

const config: Record<ConversationStatus, {
  label: string
  variant: 'secondary' | 'default' | 'outline'
  className?: string
}> = {
  bot: { label: 'Bot', variant: 'secondary' },
  human: { label: 'Humano', variant: 'default' },
  closed: { label: 'Cerrado', variant: 'outline', className: 'border-green-200 text-green-600' },
}

export function StatusBadge({ status }: Props) {
  const { label, variant, className } = config[status]
  return <Badge variant={variant} className={className}>{label}</Badge>
}
