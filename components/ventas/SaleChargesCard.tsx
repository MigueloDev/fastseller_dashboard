'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { CHARGE_KIND_LABEL } from '@/lib/ventas/delivery'
import { formatUsd } from '@/lib/ventas/money'
import {
  ChargesFields,
  chargesPayload,
  emptyCharge,
  type ChargeDraft,
} from '@/components/ventas/SaleExtrasFields'

type Props = {
  sale: Sale
  /** Vendedor: solo lectura; el backend ya le oculta gastos internos y ganancia. */
  readOnly: boolean
  onSaleUpdated: (sale: Sale) => void
}

export function SaleChargesCard({ sale, readOnly, onSaleUpdated }: Props) {
  const api = useApi()
  const [drafts, setDrafts] = useState<ChargeDraft[]>([])
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const live = sale.status !== 'ANULADA'
  // Un cargo cobrado cambia lo que debe el cliente → solo antes de cualquier pago.
  const billedEditable = sale.status === 'PENDIENTE' && sale.payments.length === 0
  const canChange = (billed: boolean) => !readOnly && live && (!billed || billedEditable)

  async function addAll() {
    let payload
    try {
      payload = chargesPayload(drafts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revisa los costos')
      return
    }
    if (payload.some((c) => c.billedToCustomer) && !billedEditable) {
      setError('La venta ya tiene pagos: regístralo como gasto interno (sin "Cobrar al cliente").')
      return
    }
    setBusy(true)
    try {
      let updated = sale
      for (const c of payload) updated = await api.addSaleCharge(sale.id, c)
      onSaleUpdated(updated)
      setDrafts([])
      notify.success(payload.length > 1 ? 'Costos agregados' : 'Costo agregado')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo agregar el costo')
    } finally {
      setBusy(false)
    }
  }

  async function remove(chargeId: string) {
    setBusy(true)
    try {
      onSaleUpdated(await api.deleteSaleCharge(sale.id, chargeId))
      notify.success('Costo eliminado')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo eliminar')
    } finally {
      setBusy(false)
    }
  }

  const charges = sale.charges ?? []
  if (charges.length === 0 && (readOnly || !live)) return null

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium text-gray-900">Costos y gastos</h2>
      {charges.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {charges.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-gray-900">{CHARGE_KIND_LABEL[c.kind]}</span>
                {c.description && <span className="text-gray-500"> · {c.description}</span>}
                <span
                  className={
                    c.billedToCustomer
                      ? 'ml-2 text-xs text-green-700'
                      : 'ml-2 text-xs text-amber-800'
                  }
                >
                  {c.billedToCustomer ? 'Cobrado al cliente' : 'Gasto interno'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="tabular-nums text-gray-900">{formatUsd(c.amountUsd)}</span>
                {canChange(c.billedToCustomer) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Eliminar costo"
                    disabled={busy}
                    onClick={() => void remove(c.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && live && (
        <>
          {drafts.length === 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDrafts([
                  // Con pagos solo cabe gasto interno: arrancar ya desmarcado.
                  { ...emptyCharge(), billedToCustomer: billedEditable },
                ])
              }
            >
              Agregar costo
            </Button>
          ) : (
            <div className="space-y-2">
              <ChargesFields
                value={drafts}
                onChange={(d) => {
                  setDrafts(d)
                  setError(undefined)
                }}
                error={error}
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" disabled={busy} onClick={() => void addAll()}>
                  {busy ? 'Guardando…' : 'Guardar'}
                </Button>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDrafts([])}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {sale.profitUsd != null && (
        <dl className="grid grid-cols-3 gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Costo mercancía</dt>
            <dd className="tabular-nums">{formatUsd(sale.costUsd ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Gastos</dt>
            <dd className="tabular-nums">{formatUsd(sale.expensesUsd ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Ganancia neta</dt>
            <dd className={sale.profitUsd >= 0 ? 'tabular-nums text-green-700' : 'tabular-nums text-red-600'}>
              {formatUsd(sale.profitUsd)}
              {sale.marginPct != null && (
                <span className="ml-1 text-xs text-gray-500">({sale.marginPct}%)</span>
              )}
            </dd>
          </div>
        </dl>
      )}
    </section>
  )
}
