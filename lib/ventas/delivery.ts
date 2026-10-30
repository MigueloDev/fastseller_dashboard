import type { DeliveryType, SaleChargeKind } from '@/types'

export const DELIVERY_TYPE_LABEL: Record<DeliveryType, string> = {
  RETIRO: 'Retiro en tienda',
  DELIVERY: 'Delivery',
  FORANEA: 'Envío foráneo',
}

export const CHARGE_KIND_LABEL: Record<SaleChargeKind, string> = {
  DELIVERY: 'Delivery',
  ENVIO: 'Envío',
  COMISION: 'Comisión',
  OTRO: 'Otro',
}

/**
 * Extrae lat/lng de "lat,lng" o de un link de Google Maps (@lat,lng · q= · query= · ll= · !3d…!4d…).
 * Espejo de backend/src/sales/charges.js#parseLatLng. Links cortos (maps.app.goo.gl) → null.
 */
export function parseLatLng(text: string): { lat: number; lng: number } | null {
  let s = text.trim()
  try {
    s = decodeURIComponent(s)
  } catch {
    // texto con % suelto: usar tal cual
  }
  const num = '(-?\\d{1,3}(?:\\.\\d+)?)'
  const patterns = [
    new RegExp(`!3d${num}!4d${num}`),
    new RegExp(`@${num},\\s*${num}`),
    new RegExp(`[?&](?:q|query|ll|destination)=(?:loc:)?${num},\\s*${num}`),
    new RegExp(`^${num},\\s*${num}$`),
  ]
  for (const re of patterns) {
    const m = s.match(re)
    if (!m) continue
    const lat = Number(m[1])
    const lng = Number(m[2])
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
  }
  return null
}

/** Maps URLs: gratis y sin API key. Abre la app de Google Maps en móvil. */
export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

/** Maps Embed API: gratis ilimitado, requiere key restringida por referrer. null sin key. */
export function mapsEmbedUrl(lat: number, lng: number): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
  if (!key) return null
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${lat},${lng}&zoom=16`
}
