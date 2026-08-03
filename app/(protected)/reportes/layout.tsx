'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/reportes/ventas', label: 'Ventas' },
  { href: '/reportes/kardex', label: 'Kardex' },
  { href: '/reportes/movimientos', label: 'Movimientos' },
]

export default function ReportesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-600" />
          <h1 className="text-lg font-semibold text-gray-900">Reportes</h1>
        </div>
        <nav className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                pathname === tab.href
                  ? 'bg-violet-50 font-medium text-violet-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
