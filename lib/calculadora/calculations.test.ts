import { describe, it, expect } from "vitest";
import { compute } from "@/lib/calculadora/calculations";
import type { Inputs } from "@/lib/calculadora/types";

const base: Inputs = {
  unitPrice: 10,
  qty: 100,
  shipping: 200,
  customsPct: 10,
  otherCosts: 50,
  bcvRate: 100,
  binanceRate: 120,
  pricingMode: "margin",
  salePriceUsd: 0,
  desiredMarginPct: 30,
};

describe("compute", () => {
  it("calculates total cost and cost per unit", () => {
    // 10*100 + 200 + 0.10*10*100 + 50 = 1350
    const r = compute(base);
    expect(r.totalCostUsd).toBeCloseTo(1350, 4);
    expect(r.costPerUnitUsd).toBeCloseTo(13.5, 4);
  });

  it("margin mode uses markup (sale = cost * 1.3); marginPctBcv is real margin", () => {
    // salePriceUsd = 13.5 * 1.3 = 17.55
    // marginPctBcv = (grossProfit / revenue) * 100 = 30/130 ≈ 23.0769
    const r = compute(base);
    expect(r.salePriceUsd).toBeCloseTo(17.55, 4);
    expect(r.marginPctBcv).toBeCloseTo(30 / 130 * 100, 4);
  });

  it("price mode uses salePriceUsd and ignores desiredMarginPct", () => {
    const r = compute({
      ...base,
      pricingMode: "price",
      salePriceUsd: 20,
      desiredMarginPct: 99,
    });
    expect(r.salePriceUsd).toBeCloseTo(20, 4);
  });

  it("computes USDT recovery and real profit", () => {
    // salePriceBs = 17.55 * 100 = 1755
    // usdtPerUnit = 1755 / 120 = 14.625
    // usdtRecoveredTotal = 14.625 * 100 = 1462.5
    // realProfitUsd = 1462.5 - 1350 = 112.5
    const r = compute(base);
    expect(r.usdtPerUnit).toBeCloseTo(14.625, 4);
    expect(r.usdtRecoveredTotal).toBeCloseTo(1462.5, 4);
    expect(r.realProfitUsd).toBeCloseTo(112.5, 4);
  });

  it("computes spread loss pct", () => {
    // (120 - 100) / 120 * 100 ≈ 16.6667
    const r = compute(base);
    expect(r.spreadLossPct).toBeCloseTo((120 - 100) / 120 * 100, 4);
  });

  it("computes break-even nominal and real", () => {
    // breakEvenNominal = 13.5 * 100 = 1350
    // breakEvenReal = 13.5 * 120 = 1620
    const r = compute(base);
    expect(r.breakEvenNominal).toBeCloseTo(1350, 4);
    expect(r.breakEvenReal).toBeCloseTo(1620, 4);
  });

  it("treats qty = 0 as safeQty = 1 (no divide by zero)", () => {
    const r = compute({ ...base, qty: 0 });
    // totalCostUsd = 10*1 + 200 + 0.10*10*1 + 50 = 261
    expect(r.totalCostUsd).toBeCloseTo(261, 4);
    expect(r.costPerUnitUsd).toBeCloseTo(261, 4);
    expect(Number.isFinite(r.costPerUnitUsd)).toBe(true);
  });

  it("documents rate=0 behavior: guarded fields are 0, not NaN", () => {
    const r = compute({ ...base, bcvRate: 0, binanceRate: 0 });
    expect(r.usdtPerUnit).toBe(0);
    expect(r.spreadLossPct).toBe(0);
    expect(r.costPerUnitBs).toBe(0);
    expect(r.salePriceBs).toBe(0);
    expect(Number.isFinite(r.realProfitUsd)).toBe(true);
  });

  it("does not throw when all costs are zero except qty", () => {
    expect(() =>
      compute({
        unitPrice: 0,
        qty: 1,
        shipping: 0,
        customsPct: 0,
        otherCosts: 0,
        bcvRate: 0,
        binanceRate: 0,
        pricingMode: "margin",
        salePriceUsd: 0,
        desiredMarginPct: 0,
      })
    ).not.toThrow();
  });
});
