'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Wallet } from 'lucide-react'
import type { CashAccount } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { AccountFormDialog } from '@/components/cuentas/AccountFormDialog'
import { formatBs, formatUsd } from '@/lib/ventas/money'
import { cn } from '@/lib/utils'

function formatBalance(account: CashAccount) {
  return account.currency === 'BS'
    ? formatBs(account.balance)
    : formatUsd(account.balance)
}

export default function CuentasPage() {
  const api = useApi()
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const rows = await api.getCashAccounts()
      setAccounts(rows)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error cargando cuentas')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  function onSaved(saved: CashAccount) {
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id)
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
          title="Cuentas"
          description="Saldos de bolsillos reales (banco / exchange)."
          actions={
            <Button type="button" variant="primary" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Nueva cuenta
            </Button>
          }
        />

        {loading ? (
          <TableSkeleton rows={4} />
        ) : accounts.length === 0 ? (
          <EmptyState icon={Wallet} title="No hay cuentas todavía.">
            <Button type="button" variant="primary" onClick={() => setFormOpen(true)}>
              Crear cuenta
            </Button>
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/cuentas/${a.id}`}
                  className={cn(
                    'block rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-violet-200',
                    !a.active && 'opacity-60',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{a.alias}</p>
                      <p className="text-xs text-gray-500">
                        {a.institution} · {a.holder}
                        {!a.active ? ' · inactiva' : ''}
                      </p>
                    </div>
                    <p className="text-sm font-medium tabular-nums text-gray-900">
                      {formatBalance(a)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {a.currency === 'BS' ? 'Bs' : 'USD'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={onSaved}
      />
    </div>
  )
}
