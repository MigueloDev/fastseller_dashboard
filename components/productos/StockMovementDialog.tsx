'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import type {
  CreateMovementPayload,
  MovementType,
  Product,
} from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type LineDraft = {
  key: string
  productId: string
  variantId: string
  type: MovementType
  quantity: string
  delta: string
  unitCost: string
  note: string
}

type Props = {
  open: boolean
  products: Product[]
  defaultType?: MovementType
  defaultProductId?: string | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function newKey() {
  return Math.random().toString(36).slice(2, 10)
}

function emptyLine(
  type: MovementType,
  productId = '',
): LineDraft {
  return {
    key: newKey(),
    productId,
    variantId: '',
    type,
    quantity: '',
    delta: '',
    unitCost: '',
    note: '',
  }
}

function productLabel(p: Product) {
  return p.sku ? `${p.name} (${p.sku})` : p.name
}

function activeVariants(p: Product | undefined) {
  return (p?.variants ?? []).filter((v) => v.active)
}

export function StockMovementDialog({
  open,
  products,
  defaultType = 'ENTRADA',
  defaultProductId = null,
  onOpenChange,
  onSaved,
}: Props) {
  const api = useApi()
  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products],
  )

  const [lines, setLines] = useState<LineDraft[]>([emptyLine(defaultType)])
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setConfirming(false)
    setLines([
      emptyLine(defaultType, defaultProductId ?? activeProducts[0]?.id ?? ''),
    ])
  }, [open, defaultType, defaultProductId, activeProducts])

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    )
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      emptyLine(
        prev[0]?.type ?? defaultType,
        prev[0]?.productId || activeProducts[0]?.id || '',
      ),
    ])
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)))
  }

  function buildPayloads(): CreateMovementPayload[] | null {
    const payloads: CreateMovementPayload[] = []

    for (const line of lines) {
      const product = activeProducts.find((p) => p.id === line.productId)
      if (!product) {
        toast.error('Selecciona un producto en cada línea')
        return null
      }
      const variants = activeVariants(product)
      const variantId = variants.length > 0 ? line.variantId || null : null
      if (variants.length > 0 && !variantId) {
        toast.error(`Elige variante para ${product.name}`)
        return null
      }

      if (line.type === 'AJUSTE') {
        const delta = Number(line.delta)
        if (!Number.isInteger(delta) || delta === 0) {
          toast.error('AJUSTE requiere delta entero distinto de 0')
          return null
        }
        const note = line.note.trim()
        if (!note) {
          toast.error('AJUSTE requiere una nota')
          return null
        }
        payloads.push({
          productId: product.id,
          variantId,
          type: 'AJUSTE',
          delta,
          note,
        })
      } else {
        const quantity = Number(line.quantity)
        if (!Number.isInteger(quantity) || quantity < 1) {
          toast.error('Cantidad debe ser un entero ≥ 1')
          return null
        }
        const unitCost =
          line.type === 'ENTRADA' && line.unitCost.trim()
            ? Number(line.unitCost)
            : null
        if (unitCost != null && !(unitCost >= 0)) {
          toast.error('Costo unitario inválido')
          return null
        }
        payloads.push({
          productId: product.id,
          variantId,
          type: line.type,
          quantity,
          ...(line.type === 'ENTRADA' && unitCost != null ? { unitCost } : {}),
          note: line.note.trim() || null,
        })
      }
    }

    return payloads
  }

  function summaryText(): string {
    return lines
      .map((line) => {
        const product = activeProducts.find((p) => p.id === line.productId)
        const variants = activeVariants(product)
        const variant =
          variants.find((v) => v.id === line.variantId)?.name ?? null
        const label = [product?.name, variant].filter(Boolean).join(' · ')
        if (line.type === 'AJUSTE') {
          const d = Number(line.delta)
          return `${d > 0 ? '+' : ''}${d} ${label}`
        }
        const sign = line.type === 'ENTRADA' ? '+' : '−'
        return `${sign}${line.quantity} ${label}`
      })
      .join(', ')
  }

  function handleReview() {
    const payloads = buildPayloads()
    if (!payloads) return
    setConfirming(true)
  }

  async function handleConfirm() {
    const payloads = buildPayloads()
    if (!payloads) return
    setSaving(true)
    try {
      await api.createMovements(payloads)
      toast.success(
        payloads.length === 1
          ? 'Movimiento registrado'
          : `${payloads.length} movimientos registrados`,
      )
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setSaving(false)
    }
  }

  const title =
    defaultType === 'ENTRADA' && lines.every((l) => l.type === 'ENTRADA')
      ? 'Llegó mercancía'
      : 'Registrar movimiento'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{confirming ? 'Confirmar movimientos' : title}</DialogTitle>
          <DialogDescription>
            {confirming
              ? 'Revisa el resumen antes de guardar. No se puede editar después.'
              : 'El stock solo cambia vía movimientos. Usa AJUSTE para corregir con nota.'}
          </DialogDescription>
        </DialogHeader>

        {confirming ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-800">{summaryText()}</p>
            <p className="text-xs text-muted-foreground">¿Confirmar?</p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={saving}
              >
                Volver
              </Button>
              <Button type="button" onClick={() => void handleConfirm()} disabled={saving}>
                {saving ? 'Guardando…' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {lines.map((line, idx) => {
              const product = activeProducts.find((p) => p.id === line.productId)
              const variants = activeVariants(product)
              return (
                <div
                  key={line.key}
                  className="space-y-3 rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Línea {idx + 1}
                    </span>
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeLine(line.key)}
                        aria-label="Quitar línea"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label>Tipo</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        value={line.type}
                        onChange={(e) =>
                          updateLine(line.key, {
                            type: e.target.value as MovementType,
                          })
                        }
                      >
                        <option value="ENTRADA">ENTRADA</option>
                        <option value="SALIDA">SALIDA</option>
                        <option value="AJUSTE">AJUSTE</option>
                      </select>
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label>Producto</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        value={line.productId}
                        onChange={(e) =>
                          updateLine(line.key, {
                            productId: e.target.value,
                            variantId: '',
                          })
                        }
                      >
                        <option value="">Seleccionar…</option>
                        {activeProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {productLabel(p)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {variants.length > 0 && (
                    <div className="space-y-1">
                      <Label>Variante</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        value={line.variantId}
                        onChange={(e) =>
                          updateLine(line.key, { variantId: e.target.value })
                        }
                      >
                        <option value="">Seleccionar…</option>
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {line.type === 'AJUSTE' ? (
                      <div className="space-y-1">
                        <Label>Delta (+/−)</Label>
                        <Input
                          type="number"
                          step={1}
                          value={line.delta}
                          onChange={(e) =>
                            updateLine(line.key, { delta: e.target.value })
                          }
                          placeholder="ej. -3"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.key, { quantity: e.target.value })
                          }
                        />
                      </div>
                    )}
                    {line.type === 'ENTRADA' && (
                      <div className="space-y-1">
                        <Label>Costo unit. USD</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitCost}
                          onChange={(e) =>
                            updateLine(line.key, { unitCost: e.target.value })
                          }
                          placeholder="opcional"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label>
                      Nota{line.type === 'AJUSTE' ? ' (requerida)' : ''}
                    </Label>
                    <Input
                      value={line.note}
                      onChange={(e) =>
                        updateLine(line.key, { note: e.target.value })
                      }
                      placeholder={
                        line.type === 'AJUSTE'
                          ? 'Motivo del ajuste'
                          : 'opcional'
                      }
                    />
                  </div>
                </div>
              )
            })}

            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="size-3.5" />
              Agregar línea
            </Button>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleReview}>
                Revisar y confirmar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
