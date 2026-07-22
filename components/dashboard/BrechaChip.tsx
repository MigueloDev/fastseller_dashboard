'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import type { ExchangeRates, RateQuote } from '@/types'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Props = {
  rates: ExchangeRates | null
  loading?: boolean
  className?: string
}

function formatRate(n: number): string {
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

function formatFetchedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function gapLabel(rates: ExchangeRates | null, loading: boolean): string {
  if (loading) return 'Brecha …'
  if (rates?.gap == null) return 'Brecha —'
  return `Brecha ${(rates.gap * 100).toFixed(1)}%`
}

function RateRow({
  label,
  quote,
}: {
  label: string
  quote: RateQuote | null | undefined
}) {
  return (
    <div className="flex w-full items-baseline justify-between gap-6 px-1.5 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right tabular-nums text-foreground">
        {quote ? (
          <>
            <span className="font-medium">Bs {formatRate(quote.rate)}</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              {formatFetchedAt(quote.fetchedAt)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </span>
    </div>
  )
}

export function BrechaChip({ rates, loading = false, className }: Props) {
  const router = useRouter()
  const label = gapLabel(rates, loading)
  const ready = !loading && rates != null

  const triggerClass = cn(
    'inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm tabular-nums text-gray-700 outline-none',
    ready &&
      'transition-colors hover:border-violet-200 hover:bg-violet-50/30 hover:text-violet-700 data-popup-open:border-violet-200 data-popup-open:bg-violet-50/30',
    className,
  )

  if (!ready) {
    return <span className={triggerClass}>{label}</span>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass}>
        {label}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tasas de cambio</DropdownMenuLabel>
          <RateRow label="BCV" quote={rates.bcv} />
          <RateRow label="Binance" quote={rates.binance} />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="flex items-baseline justify-between gap-6 px-1.5 py-1 text-sm">
          <span className="text-muted-foreground">Brecha</span>
          <span className="font-medium tabular-nums">
            {rates.gap != null ? `${(rates.gap * 100).toFixed(1)}%` : '—'}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-violet-700 focus:text-violet-700"
          onClick={() => router.push('/calculadora')}
        >
          Abrir calculadora
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
