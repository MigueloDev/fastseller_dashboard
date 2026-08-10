import type { DeliveryStatus } from '@/types'
import { StatusBadge } from '@/components/ui/status-badge'

export function DeliveryBadge({
  status,
  className,
}: {
  status: DeliveryStatus
  className?: string
}) {
  return <StatusBadge status={status} className={className} />
}
