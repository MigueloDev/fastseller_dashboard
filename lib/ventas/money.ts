import type { BsRateQuote, PaymentMethod, PriceRef } from '@/types'

export const PAYMENT_METHOD_META: Record<
  PaymentMethod,
  { label: string; currency: 'USD' | 'BS'; priceRef: PriceRef }
> = {
  EFECTIVO_USD: { label: 'Efectivo USD', currency: 'USD', priceRef: 'REF_USD' },
  ZELLE: { label: 'Zelle', currency: 'USD', priceRef: 'REF_USD' },
  USDT: { label: 'USDT', currency: 'USD', priceRef: 'REF_USD' },
  PAGO_MOVIL: { label: 'Pago móvil', currency: 'BS', priceRef: 'REF_BS' },
  TRANSFERENCIA: { label: 'Transferencia', currency: 'BS', priceRef: 'REF_BS' },
  PUNTO: { label: 'Punto de venta', currency: 'BS', priceRef: 'REF_BS' },
  EFECTIVO_BS: { label: 'Efectivo Bs', currency: 'BS', priceRef: 'REF_BS' },
}

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]

export function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n)
}

export function formatBs(n: number): string {
  return `Bs ${new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`
}

export function rateAgeLabel(fetchedAt: string | undefined | null): string {
  if (!fetchedAt) return 'sin tasa'
  const ms = Date.now() - new Date(fetchedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'ahora'
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'hace segundos'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

export function balanceLabel(
  balanceUsd: number,
  balanceBs: number | null,
  bsRate: BsRateQuote | null,
): string {
  const usd = formatUsd(balanceUsd)
  if (balanceBs == null || !bsRate) return usd
  return `${usd} ≈ ${formatBs(balanceBs)} · tasa ${bsRate.rate.toFixed(2)} · ${rateAgeLabel(bsRate.fetchedAt)}`
}

export function priceOf(
  prices: Array<{ ref: PriceRef; amount: number; active: boolean; minQty: number }>,
  ref: PriceRef,
): number | null {
  const p =
    prices.find((x) => x.ref === ref && x.active && x.minQty === 1) ??
    prices.find((x) => x.ref === ref && x.active) ??
    prices.find((x) => x.ref === ref)
  return p ? Number(p.amount) : null
}
