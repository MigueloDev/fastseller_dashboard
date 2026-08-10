import * as React from "react"

import { cn } from "@/lib/utils"

/** Contenedor estándar de página (convención CLAUDE.md). `wide` para tablas anchas (/reportes, /productos). */
function PageContainer({
  wide,
  className,
  ...props
}: React.ComponentProps<"div"> & { wide?: boolean }) {
  return (
    <div
      data-slot="page-container"
      className={cn(
        "mx-auto w-full space-y-6 px-4 py-4 sm:px-6 sm:py-6",
        wide ? "max-w-7xl" : "max-w-7xl",
        className
      )}
      {...props}
    />
  )
}

function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div
      data-slot="page-header"
      className={cn("flex items-start justify-between gap-4", className)}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export { PageContainer, PageHeader }
