'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  /** Fetches a signed URL when the dialog opens. */
  loadUrl: () => Promise<string>
}

export function ReceiptViewerDialog({
  open,
  onOpenChange,
  title = 'Comprobante',
  loadUrl,
}: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setUrl(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setUrl(null)

    void loadUrl()
      .then((next) => {
        if (!cancelled) setUrl(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'No se pudo cargar el comprobante',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, loadUrl])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-48">
          {loading && (
            <p className="py-12 text-center text-sm text-gray-500">
              Cargando…
            </p>
          )}
          {!loading && error && (
            <p className="py-12 text-center text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={title}
              className="mx-auto max-h-[70vh] w-full rounded-md object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
