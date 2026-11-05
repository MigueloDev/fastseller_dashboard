'use client'

import { MapPin, Plus, Trash2 } from 'lucide-react'
import type {
  Customer,
  DeliveryType,
  Sale,
  SaleChargeInput,
  SaleChargeKind,
  SaleDeliveryInput,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectCombobox } from '@/components/ui/select-combobox'
import {
  CHARGE_KIND_LABEL,
  DELIVERY_TYPE_LABEL,
  mapsUrl,
  parseLatLng,
} from '@/lib/ventas/delivery'

export type DeliveryDraft = {
  type: DeliveryType
  address: string
  reference: string
  /** Texto libre: "lat,lng" o link de Google Maps */
  location: string
}

export type ChargeDraft = {
  key: string
  kind: SaleChargeKind
  description: string
  amountUsd: string
  billedToCustomer: boolean
}

// Reemplazado por SelectCombobox; el valor queda documentado en los <select> comentados abajo.
// const SELECT_CLASS = 'h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm'

function newKey() {
  return Math.random().toString(36).slice(2, 10)
}

export function emptyCharge(): ChargeDraft {
  return { key: newKey(), kind: 'DELIVERY', description: '', amountUsd: '', billedToCustomer: true }
}

export function deliveryDraftFromSale(sale?: Sale): DeliveryDraft {
  if (!sale || sale.deliveryType === 'RETIRO') {
    return { type: 'RETIRO', address: '', reference: '', location: '' }
  }
  return {
    type: sale.deliveryType,
    address: sale.deliveryAddress ?? '',
    reference: sale.deliveryReference ?? '',
    location: sale.deliveryLat != null ? `${sale.deliveryLat},${sale.deliveryLng}` : '',
  }
}

/** Precarga la última dirección del cliente sin pisar lo que ya se escribió. */
export function withCustomerAddress(draft: DeliveryDraft, customer: Customer | null): DeliveryDraft {
  if (!customer || draft.address || draft.location) return draft
  return {
    ...draft,
    address: customer.address ?? '',
    reference: customer.addressReference ?? '',
    location: customer.lat != null && customer.lng != null ? `${customer.lat},${customer.lng}` : '',
  }
}

export function chargeDraftsFromSale(sale?: Sale): ChargeDraft[] {
  return (sale?.charges ?? []).map((c) => ({
    key: newKey(),
    kind: c.kind,
    description: c.description ?? '',
    amountUsd: String(c.amountUsd),
    billedToCustomer: c.billedToCustomer,
  }))
}

/** @throws Error con mensaje para el usuario */
export function deliveryPayload(d: DeliveryDraft): SaleDeliveryInput {
  if (d.type === 'RETIRO') return { type: 'RETIRO' }
  let lat: number | null = null
  let lng: number | null = null
  if (d.location.trim()) {
    const pos = parseLatLng(d.location)
    if (!pos) throw new Error('Ubicación inválida: pega "lat,lng" o un link largo de Google Maps')
    ;({ lat, lng } = pos)
  }
  const address = d.address.trim() || null
  if (!address && lat == null) throw new Error('Indica dirección o ubicación de entrega')
  return { type: d.type, address, reference: d.reference.trim() || null, lat, lng }
}

/** @throws Error con mensaje para el usuario */
export function chargesPayload(drafts: ChargeDraft[]): SaleChargeInput[] {
  return drafts.map((c) => {
    const amountUsd = Number(c.amountUsd)
    if (!Number.isFinite(amountUsd) || !(amountUsd > 0)) {
      throw new Error(`Monto inválido en ${CHARGE_KIND_LABEL[c.kind]}`)
    }
    return {
      kind: c.kind,
      description: c.description.trim() || null,
      amountUsd: Math.round(amountUsd * 100) / 100,
      billedToCustomer: c.billedToCustomer,
    }
  })
}

export function billedTotal(drafts: ChargeDraft[]): number {
  return drafts.reduce((s, c) => s + (c.billedToCustomer ? Number(c.amountUsd) || 0 : 0), 0)
}

export function DeliveryFields({
  value,
  onChange,
  error,
}: {
  value: DeliveryDraft
  onChange: (next: DeliveryDraft) => void
  error?: string
}) {
  const pos = value.location.trim() ? parseLatLng(value.location) : null
  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900">
        <MapPin className="size-5" /> Entrega
      </h2>
      <div>
        <Label htmlFor="delivery-type">Tipo</Label>
        {/* Reemplazado por Combobox.
        <select
          id="delivery-type"
          className={`mt-1 ${SELECT_CLASS}`}
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value as DeliveryType })}
        >
          {(Object.keys(DELIVERY_TYPE_LABEL) as DeliveryType[]).map((t) => (
            <option key={t} value={t}>
              {DELIVERY_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        */}
        <SelectCombobox
          items={(Object.keys(DELIVERY_TYPE_LABEL) as DeliveryType[]).map((t) => ({
            value: t,
            label: DELIVERY_TYPE_LABEL[t],
          }))}
          value={value.type}
          onChange={(t) => onChange({ ...value, type: t as DeliveryType })}
          className="mt-1"
          aria-label="Tipo de entrega"
        />
      </div>
      {value.type !== 'RETIRO' && (
        <>
          <div>
            <Label htmlFor="delivery-address">Dirección</Label>
            <Input
              id="delivery-address"
              className="mt-1"
              value={value.address}
              placeholder={value.type === 'FORANEA' ? 'Ciudad, agencia de envío…' : 'Calle, edificio, apto…'}
              onChange={(e) => onChange({ ...value, address: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="delivery-reference">Punto de referencia</Label>
            <Input
              id="delivery-reference"
              className="mt-1"
              value={value.reference}
              onChange={(e) => onChange({ ...value, reference: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="delivery-location">Ubicación (opcional)</Label>
            <Input
              id="delivery-location"
              className="mt-1"
              value={value.location}
              placeholder="10.4806,-66.9036 o link de Google Maps"
              onChange={(e) => onChange({ ...value, location: e.target.value })}
            />
            <p className="mt-1 text-xs text-gray-500">
              {pos ? (
                <a
                  className="text-violet-600 underline"
                  href={mapsUrl(pos.lat, pos.lng)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Verificar en Google Maps ({pos.lat}, {pos.lng})
                </a>
              ) : value.location.trim() ? (
                <span className="text-red-600">
                  No se encontraron coordenadas. Los links cortos (maps.app.goo.gl) no las traen: ábrelo y copia el link largo.
                </span>
              ) : (
                'Pega el pin que mandó el cliente por WhatsApp o el link de Google Maps.'
              )}
            </p>
          </div>
        </>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  )
}

export function ChargesFields({
  value,
  onChange,
  error,
}: {
  value: ChargeDraft[]
  onChange: (next: ChargeDraft[]) => void
  error?: string
}) {
  const patch = (key: string, p: Partial<ChargeDraft>) =>
    onChange(value.map((c) => (c.key === key ? { ...c, ...p } : c)))

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Costos adicionales</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...value, emptyCharge()])}>
          <Plus className="mr-1 h-4 w-4" />
          Costo
        </Button>
      </div>
      {value.length === 0 && (
        <p className="text-xs text-gray-500">Delivery, envío, comisiones u otros gastos de esta venta.</p>
      )}
      {value.map((c) => (
        <div
          key={c.key}
          className="grid gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[120px_1fr_96px_auto_auto] sm:items-end"
        >
          <div>
            <label className="mb-1 block text-xs text-gray-500">Tipo</label>
            {/* Reemplazado por Combobox.
            <select
              className={SELECT_CLASS}
              value={c.kind}
              onChange={(e) => {
                const kind = e.target.value as SaleChargeKind
                // Comisión casi siempre es gasto interno; delivery/envío suelen cobrarse.
                patch(c.key, { kind, billedToCustomer: kind !== 'COMISION' })
              }}
            >
              {(Object.keys(CHARGE_KIND_LABEL) as SaleChargeKind[]).map((k) => (
                <option key={k} value={k}>
                  {CHARGE_KIND_LABEL[k]}
                </option>
              ))}
            </select>
            */}
            <SelectCombobox
              items={(Object.keys(CHARGE_KIND_LABEL) as SaleChargeKind[]).map((k) => ({
                value: k,
                label: CHARGE_KIND_LABEL[k],
              }))}
              value={c.kind}
              onChange={(value) => {
                const kind = value as SaleChargeKind
                // Comisión casi siempre es gasto interno; delivery/envío suelen cobrarse.
                patch(c.key, { kind, billedToCustomer: kind !== 'COMISION' })
              }}
              aria-label="Tipo de costo"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Descripción</label>
            <Input value={c.description} onChange={(e) => patch(c.key, { description: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Monto USD</label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="tabular-nums"
              value={c.amountUsd}
              onChange={(e) => patch(c.key, { amountUsd: e.target.value })}
            />
          </div>
          <label className="flex h-9 items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="size-4 accent-violet-600"
              checked={c.billedToCustomer}
              onChange={(e) => patch(c.key, { billedToCustomer: e.target.checked })}
            />
            Cobrar al cliente
          </label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Quitar costo"
            onClick={() => onChange(value.filter((x) => x.key !== c.key))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  )
}
