'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, MoreVertical, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import type { Lead } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { formatDate } from '@/lib/format'
import { formatPhoneDisplay } from '@/lib/ve/phone'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LEAD_SOURCE_LABELS, LeadFormDialog } from '@/components/leads/LeadFormDialog'

export default function LeadsPage() {
  const api = useApi()
  const [leads, setLeads] = useState<Lead[]>([])
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [deleting, setDeleting] = useState<Lead | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  const load = useCallback(async () => {
    try {
      setLeads(await api.getLeads(debounced || undefined))
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando leads')
    } finally {
      setLoading(false)
    }
  }, [api, debounced])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  function upsert(saved: Lead) {
    setLeads((prev) =>
      prev.some((l) => l.id === saved.id)
        ? prev.map((l) => (l.id === saved.id ? saved : l))
        : [saved, ...prev],
    )
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(lead: Lead) {
    setEditing(lead)
    setFormOpen(true)
  }

  async function markReminded(lead: Lead) {
    try {
      upsert(await api.updateLead(lead.id, { lastRemindedAt: new Date().toISOString() }))
      notify.success('Recordatorio registrado')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error actualizando lead')
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.deleteLead(deleting.id)
      setLeads((prev) => prev.filter((l) => l.id !== deleting.id))
      notify.success('Lead eliminado')
      setDeleting(null)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error eliminando lead')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <PageContainer>
        <PageHeader
          title="Leads"
          description="Prospectos de redes sociales, registrados a mano."
          actions={
            <>
              <Input
                className="h-8 w-36 sm:w-56"
                placeholder="Buscar nombre o teléfono…"
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
        ) : leads.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={debounced ? `Sin resultados para “${debounced}”.` : 'No hay leads todavía.'}
          >
            <Button type="button" variant="primary" onClick={openCreate}>
              Registrar lead
            </Button>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {leads.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">{l.name}</p>
                    <Badge variant="secondary">{LEAD_SOURCE_LABELS[l.source]}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatPhoneDisplay(l.phone) || 'Sin teléfono'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Registrado {formatDate(l.createdAt)} · Último recordatorio{' '}
                    {l.lastRemindedAt ? formatDate(l.lastRemindedAt) : 'nunca'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Acciones para ${l.name}`}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem onClick={() => void markReminded(l)}>
                      <BellRing className="size-4" />
                      Recordé hoy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(l)}>
                      <Pencil className="size-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => setDeleting(l)}
                    >
                      <Trash2 className="size-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editing} onSaved={upsert} />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar lead"
        description={deleting ? `Se eliminará a ${deleting.name}. No se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        loadingLabel="Eliminando…"
        loading={deleteBusy}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
