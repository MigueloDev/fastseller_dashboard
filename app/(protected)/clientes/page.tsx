'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Users } from 'lucide-react'
import type { Customer } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { CustomerFormDialog } from '@/components/clientes/CustomerFormDialog'
import { formatCedulaDisplay } from '@/lib/ve/cedula'
import { formatPhoneDisplay } from '@/lib/ve/phone'

export default function ClientesPage() {
  const api = useApi()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  const load = useCallback(async () => {
    try {
      const rows = await api.getCustomers(debounced || undefined)
      setCustomers(rows)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando clientes')
    } finally {
      setLoading(false)
    }
  }, [api, debounced])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditing(customer)
    setFormOpen(true)
  }

  function onSaved(saved: Customer) {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx === -1) return [saved, ...prev]
      const next = [...prev]
      next[idx] = saved
      return next
    })
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <PageContainer>
        <PageHeader
          title="Clientes"
          actions={
            <>
              <Input
                className="h-8 w-56"
                placeholder="Buscar cédula o nombre…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button type="button" variant="primary" onClick={openCreate}>
                <Plus className="size-4" />
                Nuevo
              </Button>
            </>
          }
        />

        {loading ? (
          <TableSkeleton rows={6} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              debounced
                ? `Sin resultados para “${debounced}”.`
                : 'No hay clientes todavía.'
            }
          >
            <Button type="button" variant="primary" onClick={openCreate}>
              Registrar cliente
            </Button>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {customers.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {[
                      formatCedulaDisplay(c.cedula) || null,
                      formatPhoneDisplay(c.phone) || null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Sin cédula / teléfono'}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(c)}
                >
                  <Pencil className="size-4" />
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSaved={onSaved}
      />
    </div>
  )
}
