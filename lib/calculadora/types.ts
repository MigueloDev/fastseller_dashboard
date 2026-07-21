export interface Inputs {
  unitPrice: number;
  qty: number;
  shipping: number;
  customsPct: number;
  otherCosts: number;
  bcvRate: number;
  binanceRate: number;
  pricingMode: "price" | "margin";
  salePriceUsd: number;
  desiredMarginPct: number;
}

export interface Results {
  totalCostUsd: number;
  costPerUnitUsd: number;
  costPerUnitBs: number;
  salePriceUsd: number;
  salePriceBs: number;
  revenueTotalBs: number;
  grossProfitBs: number;
  marginPctBcv: number;
  usdtPerUnit: number;
  usdtRecoveredTotal: number;
  usdtInvested: number;
  realProfitUsd: number;
  realMarginPct: number;
  exchangeEfficiency: number;
  breakEvenNominal: number;
  breakEvenReal: number;
  spreadLossPct: number;
}
