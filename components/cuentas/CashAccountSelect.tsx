import type { CashAccount, PaymentCurrency } from '@/types'
import { Label } from '@/components/ui/label'
import { SelectCombobox } from '@/components/ui/select-combobox'

export function pickDefaultAccount<T extends { active: boolean; currency: string }>(
  accounts: T[],
  currency: string,
): T | null {
  const matches = accounts.filter((a) => a.active && a.currency === currency)
  return matches.length === 1 ? matches[0] : null
}

export function CashAccountSelect({
  accounts,
  currency,
  value,
  onChange,
  id,
  label,
  error,
}: {
  accounts: CashAccount[]
  currency: PaymentCurrency
  value: string
  onChange: (id: string) => void
  id?: string
  label: string
  error?: string
}) {
  const options = accounts.filter((a) => a.active && a.currency === currency)
  // Reemplazado por Combobox.
  // <select
  //   id={id}
  //   className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
  //   value={value}
  //   onChange={(e) => onChange(e.target.value)}
  // >
  //   <option value="">Seleccione cuenta</option>
  //   {options.map((a) => (
  //     <option key={a.id} value={a.id}>
  //       {a.alias} · {a.institution}
  //     </option>
  //   ))}
  // </select>
  return (
    <div>
      <Label htmlFor={id}>
        {label} <span className="text-red-600">*</span>
      </Label>
      <SelectCombobox
        className="mt-1"
        items={options.map((a) => ({ value: a.id, label: `${a.alias} · ${a.institution}` }))}
        value={value}
        onChange={onChange}
        placeholder="Seleccione cuenta"
        aria-label={label}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {options.length === 0 && (
        <p className="mt-1 text-xs text-red-600">
          No hay cuentas {currency} activas
        </p>
      )}
    </div>
  )
}
