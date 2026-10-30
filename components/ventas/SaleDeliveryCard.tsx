'use client'

import { useState } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import type { Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DELIVERY_TYPE_LABEL,
  mapsDirectionsUrl,
  mapsEmbedUrl,
  mapsUrl,
} from '@/lib/ventas/delivery'
import {
  DeliveryFields,
  deliveryDraftFromSale,
  deliveryPayload,
  type DeliveryDraft,
} from '@/components/ventas/SaleExtrasFields'

type Props = {
  sale: Sale
  onSaleUpdated: (sale: Sale) => void
}

export function SaleDeliveryCard({ sale, onSaleUpdated }: Props) {
  const api = useApi()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DeliveryDraft>(() => deliveryDraftFromSale(sale))
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  const canEdit = sale.status !== 'ANULADA' && sale.deliveryStatus === 'POR_ENTREGAR'
  const hasPos = sale.deliveryLat != null && sale.deliveryLng != null
  const embed = hasPos ? mapsEmbedUrl(sale.deliveryLat!, sale.deliveryLng!) : null

  async function save() {
    let payload
    try {
      payload = deliveryPayload(draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revisa la entrega')
      return
    }
    setSaving(true)
    try {
      onSaleUpdated(await api.setSaleDelivery(sale.id, payload))
      setEditing(false)
      notify.success('Entrega actualizada')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo actualizar la entrega')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <DeliveryFields
          value={draft}
          onChange={(d) => {
            setDraft(d)
            setError(undefined)
          }}
          error={error}
        />
        <div className="flex gap-2">
          <Button variant="primary" size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? 'Guardando…' : 'Guardar entrega'}
          </Button>
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900">
          <MapPin className="size-5" /> {DELIVERY_TYPE_LABEL[sale.deliveryType]}
        </h2>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(deliveryDraftFromSale(sale))
              setEditing(true)
            }}
          >
            {sale.deliveryType === 'RETIRO' ? 'Agregar entrega' : 'Editar'}
          </Button>
        )}
      </div>

      {sale.deliveryType !== 'RETIRO' && (
        <>
          {sale.deliveryAddress && <p className="text-sm text-gray-900">{sale.deliveryAddress}</p>}
          {sale.deliveryReference && (
            <p className="text-xs text-gray-500">Ref: {sale.deliveryReference}</p>
          )}
          {embed && (
            <iframe
              title="Mapa de entrega"
              src={embed}
              className="h-64 w-full rounded-md border border-gray-200"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          )}
          {hasPos && (
            <div className="flex flex-wrap gap-2">
              <a
                href={mapsUrl(sale.deliveryLat!, sale.deliveryLng!)}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <MapPin className="mr-1 size-4" /> Abrir en Google Maps
              </a>
              <a
                href={mapsDirectionsUrl(sale.deliveryLat!, sale.deliveryLng!)}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Navigation className="mr-1 size-4" /> Cómo llegar
              </a>
            </div>
          )}
        </>
      )}
    </section>
  )
}
