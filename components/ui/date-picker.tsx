'use client'

import { useId } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /**
   * Label visible (ej. "Desde"). El nombre accesible del trigger combina
   * este label con la fecha mostrada vía `aria-labelledby` — un botón no
   * tiene slots separados de nombre/valor como un `<select>`, así que si
   * solo usáramos `aria-label` o `<label htmlFor>` perderíamos la fecha
   * (reemplazan el nombre accesible en vez de combinarse con el contenido).
   */
  label?: string
  /** Solo si no hay `label` — ej. dentro de `ReportRange` sin texto visible aparte del propio valor. */
  'aria-label'?: string
}

/** YYYY-MM-DD → Date local (sin desfase de timezone). */
function parseYmd(ymd: string): Date | undefined {
  if (!ymd) return undefined
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Date Picker de shadcn (Popover + Calendar, https://ui.shadcn.com/docs/components/base/date-picker),
 * adaptado al contrato YYYY-MM-DD ('' = vacío) que ya usa `ReportRange.tsx`,
 * y al formato `dd/MM/yyyy` del dashboard (CLAUDE.md) en vez de "PPP" (inglés).
 *
 * El botón de limpiar es un <button> hermano del trigger, no anidado dentro
 * (un control interactivo dentro de otro no es focuseable por teclado y es
 * HTML inválido).
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Elegir fecha',
  className,
  label,
  ...rest
}: Props) {
  const autoId = useId()
  const triggerId = `${autoId}-trigger`
  const labelId = `${autoId}-label`
  const ariaLabel = rest['aria-label']
  const selected = parseYmd(value)
  const dateText = selected ? format(selected, 'dd/MM/yyyy') : placeholder
  // Sin `label` visible: el aria-label por sí solo pisaría el nombre accesible
  // y con él se perdería la fecha, así que se concatena con el valor actual
  // (mismo problema que resuelve aria-labelledby cuando sí hay `label`).
  const standaloneAriaLabel = ariaLabel ? `${ariaLabel}: ${dateText}` : undefined

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label id={labelId} htmlFor={triggerId} className="text-xs text-gray-500">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <Popover>
          <PopoverTrigger
            id={triggerId}
            aria-label={label ? undefined : standaloneAriaLabel}
            aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
            render={
              <Button
                variant="outline"
                data-empty={!selected}
                className={cn(
                  'h-9 w-full justify-start text-left font-normal data-[empty=true]:text-gray-400',
                  value && 'pr-8',
                )}
              />
            }
          >
            <CalendarIcon className="size-4" />
            {dateText}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected}
              onSelect={(date) => onChange(date ? toYmd(date) : '')}
            />
          </PopoverContent>
        </Popover>
        {value && (
          <button
            type="button"
            aria-label="Limpiar fecha"
            onClick={() => onChange('')}
            className="absolute right-1.5 flex size-5 shrink-0 items-center justify-center rounded-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
