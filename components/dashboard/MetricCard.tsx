'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  sub?: React.ReactNode
  href?: string
  className?: string
}

export function MetricCard({ label, value, sub, href, className }: Props) {
  const body = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
        {value}
      </p>
      {sub != null && (
        <div className="mt-1.5 text-sm text-gray-500">{sub}</div>
      )}
    </>
  )

  const classes = cn(
    'rounded-lg border border-gray-200 bg-white p-4',
    href && 'transition-colors hover:border-violet-200 hover:bg-violet-50/30',
    className
  )

  if (href) {
    return (
      <Link href={href} className={cn(classes, 'block')}>
        {body}
      </Link>
    )
  }

  return <div className={classes}>{body}</div>
}
