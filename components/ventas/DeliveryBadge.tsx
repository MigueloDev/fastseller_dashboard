import type { DeliveryStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STYLE: Record<DeliveryStatus, string> = {
  POR_ENTREGAR: 'bg-amber-100 text-amber-900',
  ENTREGADA: 'bg-green-100 text-green-800',
}

const LABEL: Record<DeliveryStatus, string> = {
  POR_ENTREGAR: 'Por entregar',
  ENTREGADA: 'Entregada',
}

export function DeliveryBadge({
  status,
  className,
}: {
  status: DeliveryStatus
  className?: string
}) {
  return (
    <Badge className={cn(STYLE[status], className)}>{LABEL[status]}</Badge>
  )
}
