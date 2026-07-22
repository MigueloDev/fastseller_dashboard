'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { MetricsLowStock } from '@/types'

type Props = {
  items: MetricsLowStock[]
}

function label(item: MetricsLowStock) {
  if (item.variantName) return `${item.productName} — ${item.variantName}`
  return item.productName
}

export function LowStockAlert({ items }: Props) {
  if (items.length === 0) return null

  return (
    <Link
      href="/productos"
      className="block rounded-lg border border-amber-200 bg-amber-50/60 p-4 transition-colors hover:bg-amber-50"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-900">Stock bajo</p>
          <ul className="mt-1 space-y-0.5 text-sm text-amber-800">
            {items.slice(0, 5).map((item) => (
              <li key={`${item.productName}-${item.variantName ?? ''}`}>
                {label(item)}{' '}
                <span className="text-amber-700">
                  (quedan {item.available}
                  {item.minStock != null ? ` / mín ${item.minStock}` : ''}
                  {item.committed > 0 ? ` · ${item.committed} por entregar` : ''})
                </span>
              </li>
            ))}
          </ul>
          {items.length > 5 && (
            <p className="mt-1 text-xs text-amber-700">
              +{items.length - 5} más → Productos
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
