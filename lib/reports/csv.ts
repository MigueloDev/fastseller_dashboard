export type CsvValue = string | number | null | undefined

/** Escapa un campo para CSV (comillas, comas, saltos de línea) + anti fórmula-injection. */
function escapeField(value: CsvValue): string {
  if (value == null) return ''
  let s = String(value)
  // Anti CSV/formula injection: un campo que empieza por = + - @ (o tab/CR) puede
  // ejecutarse como fórmula en Excel/Sheets. Prefijar con comilla simple lo neutraliza.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeField).join(','))
    .join('\r\n')
}

/**
 * Descarga un CSV desde el navegador. El BOM hace que Excel respete los acentos.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Fecha/hora estable para las celdas de un reporte. */
export function csvDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
