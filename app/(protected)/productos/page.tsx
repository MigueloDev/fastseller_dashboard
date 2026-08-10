'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package, Plus, PackagePlus } from 'lucide-react'
import type { ExchangeRates, MovementType, Product, StockSummaryItem } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
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
      notify.error(err instanceof Error ? err.message : 'Error cargando productos')
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
      notify.success('Producto activado')
      await load()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al activar')
    }
  }

  async function confirmDeactivate() {
    if (!toDeactivate) return
    setDeactivating(true)
    try {
      await api.deleteProduct(toDeactivate.id)
      notify.success('Producto desactivado')
      setToDeactivate(null)
      await load()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al desactivar')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <PageContainer wide>
        <PageHeader
          title="Productos"
          description="Catálogo, precios e inventario"
          actions={
            <>
              <Button type="button" variant="outline" onClick={openArrival}>
                <PackagePlus className="size-4" />
                Llegó mercancía
              </Button>
              <Button type="button" variant="primary" onClick={openCreate}>
                <Plus className="size-4" />
                Nuevo
              </Button>
            </>
          }
        />

        {loading ? (
          <TableSkeleton columns={5} rows={6} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="El catálogo está vacío. Crea el primer producto para empezar."
          >
            <Button type="button" variant="primary" onClick={openCreate}>
              <Plus className="size-4" />
              Crear producto
            </Button>
          </EmptyState>
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
      </PageContainer>

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
