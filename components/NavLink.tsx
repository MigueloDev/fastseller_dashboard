'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface Props {
  href: string
  label: string
  disabled?: boolean
}

export function NavLink({ href, label, disabled }: Props) {
  const pathname = usePathname()
  const isActive = !disabled && pathname.startsWith(href)

  if (disabled) {
    return (
      <span className="px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed flex items-center gap-1.5">
        {label}
        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
          Próximo
        </span>
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={clsx(
        'px-3 py-1.5 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-violet-50 text-violet-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      {label}
    </Link>
  )
}