'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ExchangeRates, MetricsSummary } from '@/types'
import { useApi } from '@/hooks/useApi'
import {
  rangeForPeriod,
  ymdRange,
  type PeriodKey,
} from '@/lib/dashboard/period'
import { formatBs, formatUsd } from '@/lib/ventas/money'
import { PeriodTabs } from '@/components/dashboard/PeriodTabs'
import { BrechaChip } from '@/components/dashboard/BrechaChip'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TopProducts } from '@/components/dashboard/TopProducts'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { LowStockAlert } from '@/components/dashboard/LowStockAlert'

function HomeSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="h-3 w-16 rounded bg-gray-100" />
            <div className="mt-3 h-8 w-28 rounded bg-gray-100" />
            <div className="mt-2 h-3 w-24 rounded bg-gray-50" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="h-48 rounded-lg border border-gray-200 bg-white" />
        <div className="h-48 rounded-lg border border-gray-200 bg-white" />
      </div>
    </div>
  )
}

export default function HomePage() {
  const api = useApi()
  const [period, setPeriod] = useState<PeriodKey>('mes')
  const [data, setData] = useState<MetricsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [ratesLoading, setRatesLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const range = rangeForPeriod(period)
      const summary = await api.getMetricsSummary(range)
      setData(summary)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : 'Error cargando métricas')
    } finally {
      setLoading(false)
    }
  }, [api, period])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    setRatesLoading(true)
    void api
      .getRates()
      .then((r) => {
        if (!cancelled) setRates(r)
      })
      .catch(() => {
        if (!cancelled) setRates(null)
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  const chartRange = ymdRange(period)

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Inicio</h1>
        <div className="flex flex-wrap items-center gap-2">
          <BrechaChip rates={rates} loading={ratesLoading} />
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
        {loading && <HomeSkeleton />}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 text-sm font-medium text-red-700 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Vendido"
                value={formatUsd(data.sold.totalUsd)}
                sub={
                  <>
                    <span>
                      {data.sold.count} venta
                      {data.sold.count === 1 ? '' : 's'}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-400">
                      Divisas {formatUsd(data.byPriceRef.REF_USD.totalUsd)} · Bs{' '}
                      {formatUsd(data.byPriceRef.REF_BS.totalUsd)}
                    </span>
                  </>
                }
              />
              <MetricCard
                label="Cobrado"
                value={formatUsd(data.collected.totalUsd)}
                sub={`${data.collected.count} pago${data.collected.count === 1 ? '' : 's'}`}
              />
              <MetricCard
                label="Por cobrar"
                value={formatUsd(data.receivables.totalUsd)}
                href="/ventas?status=PENDIENTE"
                sub={
                  data.receivables.totalUsd === 0
                    ? 'al día'
                    : data.receivables.totalBs != null
                      ? `≈ ${formatBs(data.receivables.totalBs)}`
                      : 'sin tasa BCV'
                }
              />
            </div>

            <LowStockAlert items={data.lowStock} />

            <div className="grid gap-3 lg:grid-cols-2">
              <TopProducts products={data.topProducts} period={period} />
              <SalesChart
                points={data.salesByDay}
                period={period}
                from={chartRange.from}
                to={chartRange.to}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
