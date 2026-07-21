'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Package, Plus, PackagePlus } from 'lucide-react'
import type { ExchangeRates, MovementType, Product, StockSummaryItem } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { ProductTable } from '@/components/productos/ProductTable'
import { ProductFormDialog } from '@/components/productos/ProductFormDialog'
import { DeactivateProductDialog } from '@/components/productos/DeactivateProductDialog'
import { StockMovementDialog } from '@/components/productos/StockMovementDialog'

export default function ProductosPage() {
  const api = useApi()
  const [products, setProducts] = useState<Product[]>([])
  const [stock, setStock] = useState<StockSummaryItem[]>([])
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [toDeactivate, setToDeactivate] = useState<Product | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)
  const [movementType, setMovementType] = useState<MovementType>('ENTRADA')
  const [movementProductId, setMovementProductId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [data, nextStock, nextRates] = await Promise.all([
        api.getProducts(true),
        api.getStock().catch(() => [] as StockSummaryItem[]),
        api.getRates().catch(() => null),
      ])
      setProducts(data)
      setStock(nextStock)
      if (nextRates) setRates(nextRates)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando productos')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setFormOpen(true)
  }

  function openArrival() {
    setMovementType('ENTRADA')
    setMovementProductId(null)
    setMovementOpen(true)
  }

  function openAdjust(product: Product) {
    setMovementType('AJUSTE')
    setMovementProductId(product.id)
    setMovementOpen(true)
  }

  async function toggleActive(product: Product) {
    if (product.active) {
      setToDeactivate(product)
      return
    }

    try {
      await api.updateProduct(product.id, { name: product.name, active: true })
      toast.success('Producto activado')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al activar')
    }
  }

  async function confirmDeactivate() {
    if (!toDeactivate) return
    setDeactivating(true)
    try {
      await api.deleteProduct(toDeactivate.id)
      toast.success('Producto desactivado')
      setToDeactivate(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al desactivar')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Productos</h1>
            <p className="text-xs text-muted-foreground">
              Catálogo, precios e inventario
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={openArrival}>
              <PackagePlus className="size-4" />
              Llegó mercancía
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" />
              Nuevo
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-violet-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Sin productos</h3>
            <p className="text-xs text-gray-500 mb-4 max-w-xs">
              El catálogo está vacío. Crea el primer producto para empezar.
            </p>
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" />
              Crear producto
            </Button>
          </div>
        ) : (
          <ProductTable
            products={products}
            stock={stock}
            rates={rates}
            onEdit={openEdit}
            onToggleActive={toggleActive}
            onAdjust={openAdjust}
          />
        )}
      </div>

      <ProductFormDialog
        open={formOpen}
        product={editing}
        rates={rates}
        onOpenChange={setFormOpen}
        onSaved={load}
      />

      <StockMovementDialog
        open={movementOpen}
        products={products}
        defaultType={movementType}
        defaultProductId={movementProductId}
        onOpenChange={setMovementOpen}
        onSaved={load}
      />

      <DeactivateProductDialog
        product={toDeactivate}
        open={Boolean(toDeactivate)}
        loading={deactivating}
        onOpenChange={(open) => {
          if (!open && !deactivating) setToDeactivate(null)
        }}
        onConfirm={confirmDeactivate}
      />
    </div>
  )
}
