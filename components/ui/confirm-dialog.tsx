"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Props = {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel?: string
  loadingLabel?: string
  loading?: boolean
  /** true = botón rojo (anular/eliminar); false = acción primaria normal */
  destructive?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/**
 * Confirmación in-modal (convención CLAUDE.md):
 * no cierra con click afuera, requiere acción explícita.
 */
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  loadingLabel,
  loading,
  destructive = true,
  onOpenChange,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "primary"}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (loadingLabel ?? "Procesando…") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { ConfirmDialog }
