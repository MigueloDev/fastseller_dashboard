"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import type { Inputs } from "@/lib/calculadora/types";
import { compute } from "@/lib/calculadora/calculations";
import { useApi } from "@/hooks/useApi";
import CostInputs from "@/components/calculadora/CostInputs";
import RateDisplay from "@/components/calculadora/RateDisplay";
import ResultsDashboard from "@/components/calculadora/ResultsDashboard";
import SpreadAlert from "@/components/calculadora/SpreadAlert";

const DEFAULT_INPUTS: Inputs = {
  unitPrice: 0,
  qty: 1,
  shipping: 0,
  customsPct: 10,
  otherCosts: 0,
  bcvRate: 0,
  binanceRate: 0,
  pricingMode: "margin",
  salePriceUsd: 0,
  desiredMarginPct: 30,
};

export default function CalculadoraPage() {
  const api = useApi();
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [bcvUpdatedAt, setBcvUpdatedAt] = useState("");
  const [binanceUpdatedAt, setBinanceUpdatedAt] = useState("");
  const [binanceFailed, setBinanceFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const results = useMemo(() => compute(inputs), [inputs]);

  const patch = useCallback((p: Partial<Inputs>) => {
    setInputs((prev) => ({ ...prev, ...p }));
  }, []);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const rates = await api.getRates();

      if (rates.bcv?.rate) {
        patch({ bcvRate: rates.bcv.rate });
        setBcvUpdatedAt(rates.bcv.fetchedAt);
      } else {
        toast.error("No se pudo obtener la tasa BCV. Puedes ingresarla manualmente.");
      }

      if (rates.binance?.rate) {
        patch({ binanceRate: rates.binance.rate });
        setBinanceUpdatedAt(rates.binance.fetchedAt);
        setBinanceFailed(false);
      } else {
        setBinanceFailed(true);
        toast.error("No se pudo obtener la tasa Binance. Ingreso manual disponible.");
      }
    } catch {
      setBinanceFailed(true);
      toast.error("No se pudieron obtener las tasas. Ingreso manual disponible.");
    } finally {
      setLoading(false);
    }
  }, [api, patch]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const ratesReady = inputs.bcvRate > 0 && inputs.binanceRate > 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:grid md:grid-cols-[1fr_1fr] md:gap-8 lg:grid-cols-[1fr_420px] space-y-6 md:space-y-0">
        <div className="space-y-6">
          <RateDisplay
            bcvRate={inputs.bcvRate}
            binanceRate={inputs.binanceRate}
            bcvUpdatedAt={bcvUpdatedAt}
            binanceUpdatedAt={binanceUpdatedAt}
            binanceFailed={binanceFailed}
            loading={loading}
            onBcvChange={(v) => patch({ bcvRate: v })}
            onBinanceChange={(v) => patch({ binanceRate: v })}
            onRefresh={fetchRates}
          />

          <CostInputs inputs={inputs} onChange={patch} />
        </div>

        <div className="space-y-4">
          <SpreadAlert
            bcvRate={inputs.bcvRate}
            binanceRate={inputs.binanceRate}
            spreadLossPct={results.spreadLossPct}
          />
          <div
            className={
              ratesReady ? "" : "opacity-40 pointer-events-none text-muted-foreground"
            }
          >
            <ResultsDashboard results={results} />
          </div>
          {!ratesReady && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Esperando tasas de cambio...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
