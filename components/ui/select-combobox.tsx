'use client'

import { Combobox } from '@base-ui/react/combobox'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ComboboxItem = { value: string; label: string }

type SingleProps = {
  items: ComboboxItem[]
  value: string
  onChange: (value: string) => void
  multiple?: false
}

type MultiProps = {
  items: ComboboxItem[]
  value: string[]
  onChange: (value: string[]) => void
  multiple: true
}

type Props = (SingleProps | MultiProps) & {
  placeholder?: string
  disabled?: boolean
  /** Para asociar con un `<label htmlFor>` externo; va directo al `<input>` real. */
  id?: string
  /** Solo si no hay un `<label>` visible asociado por `id`. */
  'aria-label'?: string
  className?: string
}

const POPUP_CLASS =
  'z-50 max-h-(--available-height) w-[var(--anchor-width)] max-w-[var(--available-width)] origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-md outline-none data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95'

const ITEM_CLASS =
  'grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 px-2 py-1.5 outline-none select-none data-highlighted:bg-violet-50 data-highlighted:text-violet-900'

/**
 * Combobox de shadcn/base-ui para selección simple o múltiple (chips),
 * con el mismo look de los `<select>` nativos que reemplaza (borde
 * gray-200, foco violet).
 */
export function SelectCombobox(props: Props) {
  const { items, placeholder, disabled, className, id } = props
  const ariaLabel = props['aria-label']
  const byValue = new Map(items.map((i) => [i.value, i.label]))

  if (props.multiple) {
    const selected = props.value
    return (
      <Combobox.Root
        items={items}
        multiple
        value={selected}
        onValueChange={(next) => props.onChange(next)}
        itemToStringLabel={(v) => byValue.get(v) ?? v}
        itemToStringValue={(v) => v}
        disabled={disabled}
      >
        <Combobox.InputGroup
          className={cn(
            'flex h-9 w-full cursor-text items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 has-disabled:bg-gray-50',
            className,
          )}
        >
          <Combobox.Chips className="flex flex-1 items-center gap-1 overflow-hidden">
            <Combobox.Value>
              {(value: string[]) => (
                <>
                  {value.slice(0, 1).map((v) => (
                    <Combobox.Chip
                      key={v}
                      className="flex h-6 shrink-0 items-center gap-1 rounded-md bg-violet-100 px-1.5 text-xs font-medium text-violet-900 outline-none data-highlighted:bg-violet-200"
                    >
                      {byValue.get(v) ?? v}
                      <Combobox.ChipRemove
                        className="flex size-3.5 items-center justify-center rounded-sm hover:bg-violet-300"
                        aria-label={`Quitar ${byValue.get(v) ?? v}`}
                      >
                        <XIcon className="size-3" />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  ))}
                  {value.length > 1 && (
                    <span className="flex h-6 shrink-0 items-center rounded-md bg-violet-100 px-1.5 text-xs font-medium text-violet-900">
                      +{value.length - 1}
                    </span>
                  )}
                  <Combobox.Input
                    id={id}
                    aria-label={ariaLabel}
                    placeholder={value.length === 0 ? placeholder : ''}
                    className="h-6 min-w-10 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-gray-400"
                  />
                </>
              )}
            </Combobox.Value>
          </Combobox.Chips>
        </Combobox.InputGroup>

        <Combobox.Portal>
          <Combobox.Positioner className="outline-none" sideOffset={4}>
            <Combobox.Popup className={POPUP_CLASS}>
              <Combobox.Empty className="px-2 py-1.5 text-sm text-gray-500">
                Sin resultados.
              </Combobox.Empty>
              <Combobox.List>
                {(item: ComboboxItem) => (
                  <Combobox.Item key={item.value} className={ITEM_CLASS} value={item.value}>
                    <Combobox.ItemIndicator className="col-start-1">
                      <CheckIcon className="size-3.5" />
                    </Combobox.ItemIndicator>
                    <span className="col-start-2">{item.label}</span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    )
  }

  return (
    <Combobox.Root
      items={items}
      value={props.value}
      onValueChange={(next) => props.onChange(next ?? '')}
      itemToStringLabel={(v) => byValue.get(v) ?? v}
      itemToStringValue={(v) => v}
      disabled={disabled}
    >
      <Combobox.InputGroup
        className={cn(
          'relative flex h-9 w-full items-center rounded-md border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 has-disabled:bg-gray-50',
          className,
        )}
      >
        <Combobox.Input
          id={id}
          aria-label={ariaLabel}
          placeholder={placeholder}
          className="h-full w-full border-0 bg-transparent px-2 pr-12 text-sm outline-none placeholder:text-gray-400"
        />
        <Combobox.Clear className="absolute right-7 hidden size-6 items-center justify-center text-gray-400 hover:text-gray-600 data-visible:flex">
          <XIcon className="size-3.5" />
        </Combobox.Clear>
        <Combobox.Trigger className="absolute right-1 flex size-6 items-center justify-center text-gray-400">
          <ChevronsUpDownIcon className="size-3.5" />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="outline-none" sideOffset={4}>
          <Combobox.Popup className={POPUP_CLASS}>
            <Combobox.Empty className="px-2 py-1.5 text-sm text-gray-500">
              Sin resultados.
            </Combobox.Empty>
            <Combobox.List>
              {(item: ComboboxItem) => (
                <Combobox.Item key={item.value} className={ITEM_CLASS} value={item.value}>
                  <Combobox.ItemIndicator className="col-start-1">
                    <CheckIcon className="size-3.5" />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2">{item.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
