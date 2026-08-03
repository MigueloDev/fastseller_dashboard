"use client";

import type { Results } from "@/lib/calculadora/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ResultsDashboardProps {
  results: Results;
}

function fmtUsd(v: number) {
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtBs(v: number) {
  return v.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v: number) {
  return v.toFixed(2) + "%";
}

function marginColor(pct: number) {
  if (pct < 0) return "text-red-600";
  if (pct < 15) return "text-amber-800";
  return "text-green-700";
}

function Row({
  label,
  value,
  valueClass,
  highlight,
}: {
  label: string;
  value: string;
  valueClass?: string;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "bg-gray-50" : ""}>
      <td className="py-2 pr-4 text-xs text-muted-foreground">{label}</td>
      <td
        className={cn(
          "py-2 text-right font-mono text-sm tabular-nums text-foreground",
          valueClass
        )}
      >
        {value}
      </td>
    </tr>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={2} className="pt-4 pb-1">
        <div className="text-[10px] text-violet-600 uppercase tracking-widest border-b border-gray-200 pb-1">
          {label}
        </div>
      </td>
    </tr>
  );
}

export default function ResultsDashboard({ results }: ResultsDashboardProps) {
  const {
    totalCostUsd,
    costPerUnitUsd,
    breakEvenNominal,
    breakEvenReal,
    salePriceUsd,
    salePriceBs,
    marginPctBcv,
    usdtPerUnit,
    usdtInvested,
    usdtRecoveredTotal,
    realProfitUsd,
    realMarginPct,
    exchangeEfficiency,
  } = results;

  const effPct = (exchangeEfficiency * 100).toFixed(1) + "%";

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-[11px] text-violet-600 uppercase tracking-widest font-normal">
          Resultados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full border-collapse">
          <tbody>
            <Divider label="Costos" />
            <Row label="Costo por unidad" value={`$${fmtUsd(costPerUnitUsd)}`} />
            <Row label="Costo total (lote)" value={`$${fmtUsd(totalCostUsd)}`} />
            <Row
              label="Punto de equilibrio (nominal BCV)"
              value={`Bs ${fmtBs(breakEvenNominal)}`}
            />
            <Row
              label="Punto de equilibrio (real, recuperar $)"
              value={`Bs ${fmtBs(breakEvenReal)}`}
              valueClass="text-violet-600"
            />

            <Divider label="Ingresos" />
            <Row label="Precio de venta (USD)" value={`$${fmtUsd(salePriceUsd)}`} highlight />
            <Row label="Precio de venta (Bs al BCV)" value={`Bs ${fmtBs(salePriceBs)}`} />
            <Row
              label="Margen nominal (BCV)"
              value={fmtPct(marginPctBcv)}
              valueClass={marginColor(marginPctBcv)}
            />

            <Divider label="Recuperacion real en USD" />
            <Row
              label="Recompra USDT / unidad"
              value={`$${fmtUsd(usdtPerUnit)}`}
              highlight
            />
            <Row label="USDT invertido" value={`$${fmtUsd(usdtInvested)}`} />
            <Row label="USDT recuperado" value={`$${fmtUsd(usdtRecoveredTotal)}`} />
            <Row
              label="Ganancia real (USD)"
              value={`$${fmtUsd(realProfitUsd)}`}
              valueClass={realProfitUsd >= 0 ? "text-green-700" : "text-red-600"}
            />
            <Row
              label="Margen real %"
              value={fmtPct(realMarginPct)}
              valueClass={marginColor(realMarginPct)}
              highlight
            />
            <Row
              label="Eficiencia cambiaria"
              value={effPct}
              valueClass={
                exchangeEfficiency >= 1
                  ? "text-green-700"
                  : exchangeEfficiency >= 0.85
                    ? "text-amber-800"
                    : "text-red-600"
              }
            />
          </tbody>
        </table>

        <div className="mt-4 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Margen real
          </span>
          <span
            className={cn(
              "font-mono text-2xl font-bold tabular-nums",
              marginColor(realMarginPct)
            )}
          >
            {fmtPct(realMarginPct)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
