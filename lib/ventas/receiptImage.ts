export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024
export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp'

const RECEIPT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateReceiptFile(file: File): string | null {
  if (!RECEIPT_TYPES.has(file.type)) return 'Solo JPEG, PNG o WebP'
  if (file.size > RECEIPT_MAX_BYTES) return 'La imagen supera 5 MB'
  return null
}

export function fileFromClipboard(e: ClipboardEvent): File | null {
  const items = e.clipboardData?.items
  if (!items) return null
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item?.kind === 'file' && item.type.startsWith('image/')) {
      return item.getAsFile()
    }
  }
  return null
}

/**
 * Convert an image File to WebP via canvas (quality 0.8).
 * Rejects non-image inputs and conversion failures — never returns the original.
 */
export async function fileToWebpBase64(
  file: File,
  quality = 0.8,
): Promise<{ base64: string; bytes: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo crear canvas')
    ctx.drawImage(bitmap, 0, 0)

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    )
    if (!blob || blob.type !== 'image/webp') {
      throw new Error('No se pudo convertir a WebP')
    }

    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    return { base64: `data:image/webp;base64,${base64}`, bytes: bytes.length }
  } finally {
    bitmap.close()
  }
}
