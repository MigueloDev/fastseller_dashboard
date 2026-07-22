'use client'

import type { Customer } from '@/types'
import { CustomerFormDialog } from '@/components/clientes/CustomerFormDialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialQuery?: string
  onCreated: (customer: Customer) => void
}

/** Thin wrapper — create-only entry used by CustomerPicker. */
export function CreateCustomerDialog({
  open,
  onOpenChange,
  initialQuery,
  onCreated,
}: Props) {
  return (
    <CustomerFormDialog
      open={open}
      onOpenChange={onOpenChange}
      customer={null}
      initialQuery={initialQuery}
      onSaved={onCreated}
    />
  )
}
