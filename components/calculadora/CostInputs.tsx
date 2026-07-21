"use client";

import type { Inputs } from "@/lib/calculadora/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { cn } from "@/lib/utils";

interface CostInputsProps {
  inputs: Inputs;
  onChange: (patch: Partial<Inputs>) => void;
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-normal">
        {label}
        {hint && (
          <span className="ml-1 normal-case tracking-normal text-muted-foreground/70 text-[10px]">
            ({hint})
          </span>
        )}
      </Label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-2.5 text-muted-foreground font-mono text-sm select-none z-10">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          value={value >= 0 ? value : ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder ?? "0"}
          className={cn(
            "font-mono tabular-nums",
            prefix && "pl-7",
            suffix && "pr-8"
          )}
        />
        {suffix && (
          <span className="absolute right-2.5 text-muted-foreground font-mono text-sm select-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CostInputs({ inputs, onChange }: CostInputsProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] text-violet-600 uppercase tracking-widest mb-3 pb-2 border-b border-gray-200">
          Costos del producto (USD)
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Precio unitario"
              prefix="$"
              value={inputs.unitPrice}
              onChange={(v) => onChange({ unitPrice: v })}
              placeholder="0.00"
            />
            <Field
              label="Cantidad"
              hint="unidades"
              value={inputs.qty}
              onChange={(v) => onChange({ qty: v })}
              placeholder="1"
            />
          </div>
          <Field
            label="Envio / Flete"
            hint="lote total"
            prefix="$"
            value={inputs.shipping}
            onChange={(v) => onChange({ shipping: v })}
            placeholder="0.00"
          />
          <Field
            label="Aduana / Arancel"
            hint="% del costo del producto"
            value={inputs.customsPct}
            onChange={(v) => onChange({ customsPct: v })}
            suffix="%"
            placeholder="10"
          />
          <Field
            label="Otros costos"
            hint="almacen, ultima milla..."
            prefix="$"
            value={inputs.otherCosts}
            onChange={(v) => onChange({ otherCosts: v })}
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <div className="text-[11px] text-violet-600 uppercase tracking-widest mb-3 pb-2 border-b border-gray-200">
          Precios
        </div>
        <ButtonGroup className="w-full mb-3">
          <Button
            type="button"
            variant={inputs.pricingMode === "margin" ? "default" : "outline"}
            className={cn(
              "flex-1",
              inputs.pricingMode === "margin" && "bg-violet-600 text-white hover:bg-violet-700"
            )}
            onClick={() => onChange({ pricingMode: "margin" })}
          >
            Margen objetivo %
          </Button>
          <Button
            type="button"
            variant={inputs.pricingMode === "price" ? "default" : "outline"}
            className={cn(
              "flex-1",
              inputs.pricingMode === "price" && "bg-violet-600 text-white hover:bg-violet-700"
            )}
            onClick={() => onChange({ pricingMode: "price" })}
          >
            Precio de venta fijo
          </Button>
        </ButtonGroup>

        {inputs.pricingMode === "margin" ? (
          <Field
            label="Margen deseado"
            hint="sobre costo BCV"
            value={inputs.desiredMarginPct}
            onChange={(v) => onChange({ desiredMarginPct: v })}
            suffix="%"
            placeholder="30"
          />
        ) : (
          <Field
            label="Precio de venta"
            hint="por unidad en USD"
            prefix="$"
            value={inputs.salePriceUsd}
            onChange={(v) => onChange({ salePriceUsd: v })}
            placeholder="0.00"
          />
        )}
      </div>
    </div>
  );
}
