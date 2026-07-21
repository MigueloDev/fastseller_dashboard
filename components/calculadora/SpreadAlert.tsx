"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SpreadAlertProps {
  bcvRate: number;
  binanceRate: number;
  spreadLossPct: number;
}

export default function SpreadAlert({
  bcvRate,
  binanceRate,
  spreadLossPct,
}: SpreadAlertProps) {
  if (spreadLossPct <= 0 || bcvRate <= 0 || binanceRate <= 0) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-800">
      <AlertTriangle className="text-amber-800" />
      <AlertTitle className="font-mono font-semibold text-amber-800">
        Impacto del spread
      </AlertTitle>
      <AlertDescription className="text-amber-800/80">
        Vendes a BCV{" "}
        <span className="font-mono tabular-nums text-amber-900">
          Bs {bcvRate.toFixed(2)}
        </span>
        , pero recompras USDT en Binance{" "}
        <span className="font-mono tabular-nums text-amber-900">
          Bs {binanceRate.toFixed(2)}
        </span>
        . Pierdes{" "}
        <span className="font-mono tabular-nums font-bold text-amber-900">
          {spreadLossPct.toFixed(1)}%
        </span>{" "}
        solo en cambio antes de contar los costos del producto.
      </AlertDescription>
    </Alert>
  );
}
