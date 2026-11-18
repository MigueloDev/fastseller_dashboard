'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftRight, Plus, Wallet } from 'lucide-react'
import type { CashAccount, PaymentCurrency } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/ui/page-header'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { AccountFormDialog } from '@/components/cuentas/AccountFormDialog'
import { CashTransferDialog } from '@/components/cuentas/CashTransferDialog'
import { formatBs, formatUsd } from '@/lib/ventas/money'
import { cn } from '@/lib/utils'

function formatBalance(account: CashAccount) {
  return account.currency === 'BS'
    ? formatBs(account.balance)
    : formatUsd(account.balance)
}

function totalsByCurrency(accounts: CashAccount[]) {
  const totals = new Map<PaymentCurrency, { total: number; count: number }>()
  for (const a of accounts) {
    if (!a.active) continue
    const t = totals.get(a.currency) ?? { total: 0, count: 0 }
    t.total = Math.round((t.total + a.balance) * 100) / 100
    t.count += 1
    totals.set(a.currency, t)
  }
  return (['BS', 'USD'] as const).flatMap((currency) => {
    const t = totals.get(currency)
    return t ? [{ currency, ...t }] : []
  })
}

export default function CuentasPage() {
  const api = useApi()
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

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
            <div className="flex flex-wrap items-center gap-2">
              {accounts.length > 1 && (
                <Button type="button" variant="outline" onClick={() => setTransferOpen(true)}>
                  <ArrowLeftRight className="size-4" />
                  Transferir
                </Button>
              )}
              <Button type="button" variant="primary" onClick={() => setFormOpen(true)}>
                <Plus className="size-4" />
                Nueva cuenta
              </Button>
            </div>
          }
        />

        {!loading && accounts.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {totalsByCurrency(accounts).map((t) => (
              <div
                key={t.currency}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <p className="text-xs text-gray-500">
                  Disponible {t.currency === 'BS' ? 'Bs' : 'USD'}
                </p>
                <p
                  className={cn(
                    'text-2xl font-semibold tabular-nums tracking-tight',
                    t.total < 0 && 'text-red-600',
                  )}
                >
                  {t.currency === 'BS' ? formatBs(t.total) : formatUsd(t.total)}
                </p>
                <p className="text-xs text-gray-500">
                  {t.count} cuenta{t.count === 1 ? '' : 's'} activa{t.count === 1 ? '' : 's'}
                </p>
              </div>
            ))}
          </div>
        )}

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
                    {
                      a.balance > 0 ? (
                        <p className="text-sm font-medium tabular-nums text-gray-900">
                          {formatBalance(a)}
                        </p>
                      ) : (
                        <p className="text-sm font-medium tabular-nums text-red-500">
                          {formatBalance(a)}
                        </p>
                      )
                    }
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
      <CashTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onSaved={() => void load()}
      />
    </div>
  )
}
