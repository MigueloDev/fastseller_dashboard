"use client"

import type * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-1", className)}
      classNames={{
        // `nav` es hermano de `month` dentro de `months` (no está anidado en
        // `month_caption`, pese a cómo se ve visualmente) — el ancla real
        // para los botones absolutos es `months`, si no, quedan posicionados
        // contra el ancestro posicionado más cercano (el popover) y casi
        // inclickeables.
        months: "relative flex gap-2",
        month: "space-y-2",
        caption_label: "text-sm font-medium text-gray-900",
        nav: "contents",
        button_previous:
          "absolute left-1 top-1 z-10 inline-flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50",
        button_next:
          "absolute right-1 top-1 z-10 inline-flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50",
        month_caption: "flex h-8 items-center justify-center",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-center text-xs font-normal text-gray-500",
        week: "mt-1 flex w-full",
        day: "p-0 text-center text-sm",
        day_button:
          "inline-flex size-8 items-center justify-center rounded-md text-gray-900 outline-none hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-500",
        selected:
          "[&>button]:bg-violet-500 [&>button]:text-white [&>button]:hover:bg-violet-600",
        today: "[&>button]:font-semibold [&>button]:text-violet-700",
        outside: "text-gray-300",
        disabled: "text-gray-300",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
