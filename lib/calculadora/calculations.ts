import type { Inputs, Results } from "./types";

export function compute(inputs: Inputs): Results {
  const { unitPrice, qty, shipping, customsPct, otherCosts, bcvRate, binanceRate } = inputs;

  const safeQty = qty || 1;
  const totalCostUsd =
    unitPrice * safeQty +
    shipping +
    (customsPct / 100) * unitPrice * safeQty +
    otherCosts;
  const costPerUnitUsd = totalCostUsd / safeQty;
  const costPerUnitBs = costPerUnitUsd * bcvRate;

  const salePriceUsd =
    inputs.pricingMode === "margin"
      ? costPerUnitUsd * (1 + inputs.desiredMarginPct / 100)
      : inputs.salePriceUsd;
  const salePriceBs = salePriceUsd * bcvRate;

  const revenueTotalBs = salePriceBs * safeQty;
  const grossProfitBs = revenueTotalBs - totalCostUsd * bcvRate;
  const marginPctBcv = revenueTotalBs > 0 ? (grossProfitBs / revenueTotalBs) * 100 : 0;

  const usdtPerUnit = binanceRate > 0 ? salePriceBs / binanceRate : 0;
  const usdtRecoveredTotal = usdtPerUnit * safeQty;
  const usdtInvested = totalCostUsd;
  const realProfitUsd = usdtRecoveredTotal - usdtInvested;
  const realMarginPct = usdtInvested > 0 ? (realProfitUsd / usdtInvested) * 100 : 0;
  const exchangeEfficiency = usdtInvested > 0 ? usdtRecoveredTotal / usdtInvested : 0;

  const breakEvenNominal = costPerUnitUsd * bcvRate;
  const breakEvenReal = costPerUnitUsd * binanceRate;

  const spreadLossPct =
    binanceRate > 0 ? ((binanceRate - bcvRate) / binanceRate) * 100 : 0;

  return {
    totalCostUsd,
    costPerUnitUsd,
    costPerUnitBs,
    salePriceUsd,
    salePriceBs,
    revenueTotalBs,
    grossProfitBs,
    marginPctBcv,
    usdtPerUnit,
    usdtRecoveredTotal,
    usdtInvested,
    realProfitUsd,
    realMarginPct,
    exchangeEfficiency,
    breakEvenNominal,
    breakEvenReal,
    spreadLossPct,
  };
}
