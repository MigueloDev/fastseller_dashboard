'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReceiptViewerDialog } from '@/components/ui/receipt-viewer-dialog'
import {
  RECEIPT_ACCEPT,
  fileFromClipboard,
  validateReceiptFile,
} from '@/lib/ventas/receiptImage'

type Props = {
  file: File | null
  onChange: (file: File | null) => void
  error?: string
  id?: string
}

export function ReceiptPicker({ file, onChange, error, id }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  useEffect(() => {
    setViewerOpen(false)
    if (!file) {
      setPreviewUrl(null)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function applyFile(next: File | null) {
    if (!next) {
      setLocalError(null)
      onChangeRef.current(null)
      return
    }
    const err = validateReceiptFile(next)
    if (err) {
      setLocalError(err)
      onChangeRef.current(null)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setLocalError(null)
    onChangeRef.current(next)
  }

  const applyFileRef = useRef(applyFile)
  applyFileRef.current = applyFile

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const pasted = fileFromClipboard(e)
      if (!pasted) return
      e.preventDefault()
      applyFileRef.current(pasted)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const loadUrl = useCallback(async () => {
    if (!previewUrl) throw new Error('Sin vista previa')
    return previewUrl
  }, [previewUrl])

  const displayError = localError ?? error

  return (
    <>
      <input
        id={id}
        ref={fileRef}
        className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-violet-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-violet-700 hover:file:bg-violet-100"
        type="file"
        accept={RECEIPT_ACCEPT}
        onChange={(e) => applyFile(e.target.files?.[0] ?? null)}
      />
      <p className="mt-1 text-xs text-gray-500">O pega una captura con Ctrl+V</p>
      {displayError && (
        <p className="mt-1 text-xs text-red-600">{displayError}</p>
      )}
      {file && previewUrl && (
        <div className="mt-2 space-y-2">
          <button
            type="button"
            className="block w-full rounded-md border border-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            onClick={() => setViewerOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Vista previa del comprobante"
              className="max-h-72 w-full rounded-md object-contain"
            />
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-700">{file.name}</p>
              <p>Se convertirá a WebP al guardar · clic para ampliar</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => applyFile(null)}
            >
              Quitar
            </Button>
          </div>
        </div>
      )}
      <ReceiptViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        title="Vista previa"
        loadUrl={loadUrl}
      />
    </>
  )
}
