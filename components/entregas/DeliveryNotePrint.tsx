'use client'

import type { DeliveryNote } from '@/types'
import { formatUsd } from '@/lib/ventas/money'

function formatNoteNumber(n: number) {
  return `NE-${String(n).padStart(5, '0')}`
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

type Props = {
  note: DeliveryNote
}

export function DeliveryNotePrint({ note }: Props) {
  const showValue = note.showValue

  return (
    <article className="mx-auto max-w-[720px] bg-white px-6 py-8 text-gray-900 print:max-w-none print:px-0 print:py-0">
      <header className="mb-6 border-b border-gray-300 pb-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          VictoriaLeads
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold">Nota de entrega</h1>
          <p className="tabular-nums text-lg font-medium">
            {formatNoteNumber(note.number)}
          </p>
        </div>
        <p className="mt-1 text-sm text-gray-600">{formatDate(note.createdAt)}</p>
        {note.status === 'ANULADA' && (
          <p className="mt-2 text-sm font-semibold text-red-700">ANULADA</p>
        )}
      </header>

      <section className="mb-6 grid gap-1 text-sm">
        <p>
          <span className="text-gray-500">Cliente: </span>
          <span className="font-medium">{note.customer.name}</span>
        </p>
        {note.customer.cedula && (
          <p>
            <span className="text-gray-500">Cédula: </span>
            {note.customer.cedula}
          </p>
        )}
        {note.customer.phone && (
          <p>
            <span className="text-gray-500">Teléfono: </span>
            {note.customer.phone}
          </p>
        )}
      </section>

      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-2 font-medium">Producto</th>
            <th className="py-2 pr-2 font-medium">Variante</th>
            <th className="py-2 pr-2 text-right font-medium">Cant.</th>
            {showValue && (
              <>
                <th className="py-2 pr-2 text-right font-medium">P. unit.</th>
                <th className="py-2 text-right font-medium">Subtotal</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {note.items.map((it) => (
            <tr key={it.id} className="border-b border-gray-100">
              <td className="py-2 pr-2">
                {it.product?.name ?? it.productId}
                {it.product?.sku ? (
                  <span className="ml-1 text-xs text-gray-500">
                    ({it.product.sku})
                  </span>
                ) : null}
              </td>
              <td className="py-2 pr-2 text-gray-600">
                {it.variant?.name ?? '—'}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">{it.quantity}</td>
              {showValue && (
                <>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {formatUsd(it.unitPriceUsd)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatUsd(it.subtotalUsd)}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
        {showValue && (
          <tfoot>
            <tr>
              <td
                colSpan={4}
                className="pt-3 text-right text-sm font-medium text-gray-600"
              >
                Total
              </td>
              <td className="pt-3 text-right text-base font-semibold tabular-nums">
                {formatUsd(note.totalUsd)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {note.note && (
        <p className="mb-8 text-sm text-gray-700">
          <span className="text-gray-500">Observaciones: </span>
          {note.note}
        </p>
      )}

      <footer className="mt-12 grid grid-cols-2 gap-8 text-sm text-gray-600">
        <div>
          <div className="mb-10 border-b border-gray-400" />
          <p>Entregado por{note.agentName ? `: ${note.agentName}` : ''}</p>
        </div>
        <div>
          <div className="mb-10 border-b border-gray-400" />
          <p>Recibido por</p>
        </div>
      </footer>
    </article>
  )
}
