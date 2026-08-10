import * as React from "react"

import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-gray-100", className)}
      {...props}
    />
  )
}

/** Filas skeleton para tablas/listas en carga (convención CLAUDE.md: nunca spinner de página completa) */
function TableSkeleton({
  columns = 1,
  rows = 5,
  className,
}: {
  columns?: number
  rows?: number
  className?: string
}) {
  return (
    <div data-slot="table-skeleton" className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-9 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export { Skeleton, TableSkeleton }
