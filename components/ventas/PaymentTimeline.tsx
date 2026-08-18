'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Payment, Sale } from '@/types'
import { useApi } from '@/hooks/useApi'
import { notify } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ReceiptViewerDialog } from '@/components/ui/receipt-viewer-dialog'
import {
  formatBs,
  formatUsd,
  PAYMENT_METHOD_META,
} from '@/lib/ventas/money'
import { formatDateTime } from '@/lib/format'
import {
  RECEIPT_ACCEPT,
  RECEIPT_MAX_BYTES,
  fileFromClipboard,
  fileToWebpBase64,
  validateReceiptFile,
} from '@/lib/ventas/receiptImage'

type Pending = { paymentId: string; file: File; previewUrl: string }

type Props = {
  payments: Payment[]
  onSaleUpdated: (sale: Sale) => void
}

export function PaymentTimeline({ payments, onSaleUpdated }: Props) {
  const api = useApi()
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef<Pending | null>(null)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [targetPaymentId, setTargetPaymentId] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  pendingRef.current = pending

  const loadUrl = useCallback(async () => {
    if (!viewerId) throw new Error('Sin pago seleccionado')
    const { url } = await api.getPaymentReceiptUrl(viewerId)
    return url
  }, [api, viewerId])

  function clearPending() {
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl)
      return null
    })
  }

  function setPendingFile(paymentId: string, file: File) {
    const err = validateReceiptFile(file)
    if (err) {
      notify.error(err)
      return
    }
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl)
      return { paymentId, file, previewUrl: URL.createObjectURL(file) }
    })
  }

  function pickFile(paymentId: string) {
    setTargetPaymentId(paymentId)
    fileRef.current?.click()
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const paymentId = targetPaymentId
    e.target.value = ''
    setTargetPaymentId(null)
    if (!file || !paymentId) return
    setPendingFile(paymentId, file)
  }

  useEffect(() => {
    return () => {
      const current = pendingRef.current
      if (current) URL.revokeObjectURL(current.previewUrl)
    }
  }, [])

  useEffect(() => {
    if (!pending) return
    function onPaste(e: ClipboardEvent) {
      const pasted = fileFromClipboard(e)
      const current = pendingRef.current
      if (!pasted || !current) return
      e.preventDefault()
      setPendingFile(current.paymentId, pasted)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [pending])

  async function confirmUpload() {
    if (!pending) return
    const { paymentId, file } = pending
    setBusyId(paymentId)
    try {
      const converted = await fileToWebpBase64(file)
      if (converted.bytes > RECEIPT_MAX_BYTES) {
        notify.error('El WebP convertido supera 5 MB')
        return
      }
      const updated = await api.putPaymentReceipt(paymentId, {
        receiptBase64: converted.base64,
      })
      onSaleUpdated(updated)
      notify.success('Comprobante actualizado')
      clearPending()
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : 'No se pudo actualizar el comprobante',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    const paymentId = deleteId
    if (!paymentId) return
    setBusyId(paymentId)
    try {
      const updated = await api.deletePaymentReceipt(paymentId)
      onSaleUpdated(updated)
      if (viewerId === paymentId) setViewerId(null)
      notify.success('Comprobante eliminado')
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : 'No se pudo eliminar el comprobante',
      )
    } finally {
      setBusyId(null)
      setDeleteId(null)
    }
  }

  if (payments.length === 0) {
    return (
      <p className="text-sm text-gray-500">Sin abonos registrados.</p>
    )
  }

  const uploading = pending != null && busyId === pending.paymentId

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={RECEIPT_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />

      <ol className="space-y-3">
        {payments.map((p) => {
          const meta = PAYMENT_METHOD_META[p.method]
          const busy = busyId === p.id
          return (
            <li
              key={p.id}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {meta?.label ?? p.method}
                </span>
                <span className="tabular-nums text-sm font-semibold text-gray-900">
                  {p.currency === 'BS'
                    ? `${formatBs(p.amount)} (${formatUsd(p.amountUsd)})`
                    : formatUsd(p.amountUsd)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                <span>{formatDateTime(p.paidAt)}</span>
                {p.agentName && <span>{p.agentName}</span>}
                {p.rateUsed != null && (
                  <span>
                    tasa {Number(p.rateUsed).toFixed(2)}
                    {p.rateSource ? ` (${p.rateSource})` : ''}
                  </span>
                )}
                {p.note && <span className="italic">{p.note}</span>}
                {p.hasReceipt ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-sm font-medium text-violet-600 outline-none hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50"
                      onClick={() => setViewerId(p.id)}
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-sm font-medium text-violet-600 outline-none hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50"
                      onClick={() => pickFile(p.id)}
                    >
                      {busy ? '…' : 'Cambiar'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-sm font-medium text-red-600 outline-none hover:text-red-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50"
                      onClick={() => setDeleteId(p.id)}
                    >
                      Eliminar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-sm font-medium text-violet-600 outline-none hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50"
                    onClick={() => pickFile(p.id)}
                  >
                    {busy ? '…' : 'Adjuntar comprobante'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <Dialog
        open={pending != null}
        onOpenChange={(open) => {
          if (!open && !uploading) clearPending()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vista previa del comprobante</DialogTitle>
            <DialogDescription>
              Revisa la imagen antes de subirla. Puedes pegar otra con Ctrl+V.
            </DialogDescription>
          </DialogHeader>
          {pending && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pending.previewUrl}
              alt="Vista previa del comprobante"
              className="mx-auto max-h-[70vh] w-full rounded-md object-contain"
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={clearPending}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => void confirmUpload()}
              disabled={uploading}
            >
              {uploading ? 'Subiendo…' : 'Subir comprobante'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptViewerDialog
        open={viewerId != null}
        onOpenChange={(open) => {
          if (!open) setViewerId(null)
        }}
        title="Comprobante de pago"
        loadUrl={loadUrl}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar comprobante"
        description="¿Eliminar el comprobante de este pago?"
        confirmLabel="Eliminar"
        loadingLabel="Eliminando…"
        loading={busyId !== null}
        onOpenChange={(open) => {
          if (!open && busyId === null) setDeleteId(null)
        }}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
