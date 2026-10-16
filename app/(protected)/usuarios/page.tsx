'use client'

import { useCallback, useEffect, useState } from 'react'
import type { StaffMember, StaffRole } from '@/types'
import { useApi } from '@/hooks/useApi'
import { useMe } from '@/hooks/useMe'
import { notify } from '@/lib/toast'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Users } from 'lucide-react'

const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
}

export default function UsuariosPage() {
  const api = useApi()
  const { me, setMe } = useMe()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setStaff(await api.getStaff())
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  async function changeRole(member: StaffMember, role: StaffRole) {
    if (role === member.role) return
    setSavingId(member.id)
    try {
      const updated = await api.updateStaffRole(member.id, role)
      setStaff((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      if (me && updated.id === me.id) {
        setMe({ ...me, role: updated.role })
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo cambiar el rol')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <PageContainer>
        <PageHeader
          title="Usuarios"
          description="Quien ya entró al dashboard. El rol se asigna aquí."
        />

        {loading ? (
          <TableSkeleton rows={4} />
        ) : staff.length === 0 ? (
          <EmptyState icon={Users} title="Todavía no hay usuarios." />
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {staff.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {member.name || 'Sin nombre'}
                    {me?.id === member.id ? ' (tú)' : ''}
                  </p>
                  <p className="text-xs text-gray-500">{member.email || 'Sin email'}</p>
                </div>
                <select
                  className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm"
                  value={member.role}
                  disabled={savingId === member.id}
                  aria-label={`Rol de ${member.name || 'usuario'}`}
                  onChange={(e) => void changeRole(member, e.target.value as StaffRole)}
                >
                  <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
                  <option value="VENDEDOR">{ROLE_LABEL.VENDEDOR}</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </div>
  )
}
