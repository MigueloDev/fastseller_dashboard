"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RateDisplayProps {
  bcvRate: number;
  binanceRate: number;
  bcvUpdatedAt: string;
  binanceUpdatedAt: string;
  binanceFailed: boolean;
  loading: boolean;
  onBcvChange: (v: number) => void;
  onBinanceChange: (v: number) => void;
  onRefresh: () => void;
}

function formatTimestamp(iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function RateDisplay({
  bcvRate,
  binanceRate,
  bcvUpdatedAt,
  binanceUpdatedAt,
  binanceFailed,
  loading,
  onBcvChange,
  onBinanceChange,
  onRefresh,
}: RateDisplayProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
        <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest font-normal">
          Tasas de cambio
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="text-violet-600 hover:text-violet-700"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw />
          )}
          {loading ? "Cargando..." : "Actualizar"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                BCV
              </span>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                {formatTimestamp(bcvUpdatedAt)}
              </span>
            </div>
            <Input
              type="number"
              value={bcvRate || ""}
              onChange={(e) => onBcvChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="border-0 bg-transparent px-0 h-auto text-lg font-mono tabular-nums shadow-none focus-visible:ring-0"
            />
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Bs / USD (oficial)
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Binance P2P
              </span>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                {formatTimestamp(binanceUpdatedAt)}
              </span>
            </div>
            <Input
              type="number"
              value={binanceRate || ""}
              onChange={(e) => onBinanceChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="border-0 bg-transparent px-0 h-auto text-lg font-mono tabular-nums shadow-none focus-visible:ring-0"
            />
            <div className="text-[10px] mt-0.5">
              {binanceFailed ? (
                <span className="text-violet-600">Error de API - ingreso manual</span>
              ) : (
                <span className="text-muted-foreground">Bs / USDT (real)</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
