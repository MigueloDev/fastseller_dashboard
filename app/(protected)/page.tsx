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
import { ProfitCard } from '@/components/dashboard/ProfitCard'
import { LowStockAlert } from '@/components/dashboard/LowStockAlert'
import { PageContainer, PageHeader } from '@/components/ui/page-header'

function HomeSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-3 lg:grid-cols-5">
        <div className="h-52 rounded-lg border border-gray-200 bg-white lg:col-span-2" />
        <div className="h-52 rounded-lg border border-gray-200 bg-white lg:col-span-3" />
      </div>
      <div className="h-24 max-w-sm rounded-lg border border-gray-200 bg-white" />
      <div className="h-48 rounded-lg border border-gray-200 bg-white" />
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
      <PageContainer>
        <PageHeader
          title="Inicio"
          actions={
            <>
              <BrechaChip rates={rates} loading={ratesLoading} onRatesChange={setRates} />
              <PeriodTabs value={period} onChange={setPeriod} />
            </>
          }
        />

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
            <div className="grid items-stretch gap-3 lg:grid-cols-5">
              <div className="h-full lg:col-span-2">
                <ProfitCard
                  profit={data.profit}
                  previousUsd={data.previous?.profitUsd ?? null}
                  period={period}
                  salesCount={data.sold.count}
                />
              </div>
              <div className="h-full lg:col-span-3">
                <SalesChart
                  points={data.salesByDay}
                  period={period}
                  from={chartRange.from}
                  to={chartRange.to}
                  totalUsd={data.sold.totalUsd}
                  count={data.sold.count}
                  collectedUsd={data.collected.totalUsd}
                  previousUsd={data.previous?.soldUsd ?? null}
                  refUsd={data.byPriceRef.REF_USD.totalUsd}
                  refBs={data.byPriceRef.REF_BS.totalUsd}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:max-w-sm">
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

            <TopProducts products={data.topProducts} period={period} />
          </>
        )}
      </PageContainer>
    </div>
  )
}
