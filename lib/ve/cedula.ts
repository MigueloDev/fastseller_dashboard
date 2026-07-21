/**
 * Normaliza cédula VE: quita espacios/guiones/puntos, upper.
 * Acepta V|E + 6–9 dígitos, o solo 6–9 dígitos.
 */
export function normalizeCedula(raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/[\s\-.]/g, '')
  if (!s) return null
  if (/^[VE]\d{6,9}$/.test(s)) return s
  if (/^\d{6,9}$/.test(s)) return s
  return null
}

export function formatCedulaDisplay(cedula: string | null | undefined): string {
  if (!cedula) return ''
  if (/^[VE]\d+$/i.test(cedula)) {
    return `${cedula[0].toUpperCase()}-${cedula.slice(1)}`
  }
  return cedula
}
