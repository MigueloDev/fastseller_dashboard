'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'

export type VariantDraft = {
  id?: string
  name: string
  sku: string
}

type Props = {
  variants: VariantDraft[]
  onChange: (variants: VariantDraft[]) => void
}

export function VariantInputs({ variants, onChange }: Props) {
  function update(index: number, patch: Partial<VariantDraft>) {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  function remove(index: number) {
    onChange(variants.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...variants, { name: '', sku: '' }])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Variantes</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-3.5" />
          Agregar
        </Button>
      </div>

      {variants.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sin variantes — el producto se vende como unidad única.
        </p>
      )}

      {variants.map((v, i) => (
        <div key={v.id ?? `new-${i}`} className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input
              value={v.name}
              placeholder="#33, Negro…"
              onChange={(e) => update(i, { name: e.target.value })}
            />
          </div>
          <div className="w-36 space-y-1">
            <Label className="text-xs text-muted-foreground">SKU</Label>
            <Input
              value={v.sku}
              placeholder="opcional"
              onChange={(e) => update(i, { sku: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => remove(i)}
            aria-label="Quitar variante"
          >
            <Trash2 className="size-3.5 text-red-600" />
          </Button>
        </div>
      ))}
    </div>
  )
}
