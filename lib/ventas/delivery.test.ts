import { describe, it, expect } from 'vitest'
import { parseLatLng, mapsUrl } from '@/lib/ventas/delivery'

describe('parseLatLng', () => {
  const caracas = { lat: 10.4806, lng: -66.9036 }
  it('acepta lat,lng y links de Google Maps', () => {
    expect(parseLatLng('10.4806, -66.9036')).toEqual(caracas)
    expect(parseLatLng('https://www.google.com/maps/@10.4806,-66.9036,15z')).toEqual(caracas)
    expect(parseLatLng('https://maps.google.com/?q=10.4806,-66.9036')).toEqual(caracas)
    expect(parseLatLng('https://www.google.com/maps/search/?api=1&query=10.4806%2C-66.9036')).toEqual(caracas)
    expect(parseLatLng('https://www.google.com/maps/place/X/data=!3d10.4806!4d-66.9036')).toEqual(caracas)
  })
  it('null sin coordenadas o fuera de rango', () => {
    expect(parseLatLng('https://maps.app.goo.gl/abc')).toBeNull()
    expect(parseLatLng('Av. Libertador')).toBeNull()
    expect(parseLatLng('95, 10')).toBeNull()
    expect(parseLatLng('100%')).toBeNull()
  })
  it('mapsUrl round-trip', () => {
    expect(parseLatLng(mapsUrl(10.4806, -66.9036))).toEqual(caracas)
  })
})
