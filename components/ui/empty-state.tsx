import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Estado vacío estándar: ícono + texto corto + CTA opcional (convención CLAUDE.md) */
function EmptyState({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center",
        className
      )}
    >
      <Icon className="mx-auto size-5 text-gray-400" />
      <p className="mt-2 text-sm text-gray-500">{title}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}

export { EmptyState }
