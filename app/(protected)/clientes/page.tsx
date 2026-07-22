'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, Users } from 'lucide-react'
import type { Customer } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      toast.error(err instanceof Error ? err.message : 'Error cargando clientes')
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-600" />
          <h1 className="text-lg font-semibold text-gray-900">Clientes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="h-9 w-56"
            placeholder="Buscar cédula o nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : customers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              {debounced
                ? `Sin resultados para “${debounced}”.`
                : 'No hay clientes todavía.'}
            </p>
            <Button type="button" className="mt-3" size="sm" onClick={openCreate}>
              Registrar cliente
            </Button>
          </div>
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
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSaved={onSaved}
      />
    </div>
  )
}
