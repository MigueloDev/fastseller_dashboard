export const VE_PHONE_PREFIXES = [
  '0414',
  '0424',
  '0412',
  '0422',
  '0416',
  '0426',
] as const

export type VePhonePrefix = (typeof VE_PHONE_PREFIXES)[number]

const PHONE_RE = /^(0414|0424|0412|0422|0416|0426)\d{7}$/

/** Solo dígitos, máx 7 (cuerpo del móvil VE). */
export function sanitizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 7)
}

export function normalizePhone(
  prefix: string,
  digits: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const p = prefix.trim()
  const d = sanitizePhoneDigits(digits)
  if (!p && !d) return { ok: true, value: null }
  if (!VE_PHONE_PREFIXES.includes(p as VePhonePrefix) || d.length !== 7) {
    return {
      ok: false,
      error: 'Teléfono: elige prefijo y exactamente 7 dígitos',
    }
  }
  const value = `${p}${d}`
  if (!PHONE_RE.test(value)) {
    return { ok: false, error: 'Teléfono inválido' }
  }
  return { ok: true, value }
}

export function parsePhone(stored: string | null | undefined): {
  prefix: VePhonePrefix | ''
  digits: string
} {
  if (!stored) return { prefix: '', digits: '' }
  const s = stored.replace(/[\s\-]/g, '')
  const prefix = VE_PHONE_PREFIXES.find((p) => s.startsWith(p))
  if (!prefix) return { prefix: '', digits: sanitizePhoneDigits(s) }
  return { prefix, digits: s.slice(4).slice(0, 7) }
}

export function formatPhoneDisplay(stored: string | null | undefined): string {
  if (!stored) return ''
  const { prefix, digits } = parsePhone(stored)
  if (!prefix || digits.length !== 7) return stored
  return `${prefix}-${digits.slice(0, 3)}-${digits.slice(3)}`
}
