'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, LogOut, Smartphone } from 'lucide-react'
import type { WhatsAppState } from '@/types'
import { useApi } from '@/hooks/useApi'
import { useSocket } from '@/hooks/useSocket'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const STATUS_LABELS: Record<WhatsAppState['status'], string> = {
  connecting: 'Conectando…',
  waiting_qr: 'Esperando escaneo',
  connected: 'Conectado',
  disconnected: 'Desconectado',
  logged_out: 'Sesión cerrada',
}

function StatusChip({ status }: { status: WhatsAppState['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'connected' && 'bg-green-100 text-green-700',
        status === 'waiting_qr' && 'bg-amber-100 text-amber-700',
        (status === 'connecting' || status === 'disconnected') &&
          'bg-gray-100 text-gray-600',
        status === 'logged_out' && 'bg-red-50 text-red-600'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'connected' && 'bg-green-600',
          status === 'waiting_qr' && 'bg-amber-500',
          (status === 'connecting' || status === 'disconnected') && 'bg-gray-400',
          status === 'logged_out' && 'bg-red-500'
        )}
      />
      {STATUS_LABELS[status]}
    </span>
  )
}

export function WhatsAppConnection() {
  const api = useApi()
  const socket = useSocket()
  const [state, setState] = useState<WhatsAppState | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const load = useCallback(async () => {
    try {
      const status = await api.getWhatsAppStatus()
      setState(prev =>
        prev && prev.updatedAt > status.updatedAt ? prev : status
      )
    } catch {
      toast.error('No se pudo obtener el estado de WhatsApp')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!socket) return
    const handler = (payload: WhatsAppState) => {
      setState(payload)
      setLoading(false)
    }
    socket.on('bot_status', handler)
    return () => {
      socket.off('bot_status', handler)
    }
  }, [socket])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await api.logoutWhatsApp()
      toast.success('Sesión de WhatsApp cerrada')
      setConfirmOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cerrar sesión')
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading && !state) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-violet-600" />
          <p className="text-sm">Cargando…</p>
        </div>
      </div>
    )
  }

  const status = state?.status ?? 'disconnected'

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Conexión de WhatsApp</CardTitle>
            <StatusChip status={status} />
          </div>
          <CardDescription>
            Vincula el bot con tu cuenta de WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'waiting_qr' && state?.qr && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <QRCodeSVG value={state.qr} size={256} />
              </div>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
                <li>Abre WhatsApp en tu teléfono</li>
                <li>
                  Ve a <span className="font-medium">Dispositivos vinculados</span>
                </li>
                <li>
                  Toca <span className="font-medium">Vincular dispositivo</span> y
                  escanea el código
                </li>
              </ol>
              <p className="text-xs text-gray-400">
                El código se renueva automáticamente
              </p>
            </div>
          )}

          {(status === 'connecting' ||
            status === 'disconnected' ||
            status === 'logged_out' ||
            (status === 'waiting_qr' && !state?.qr)) && (
            <div className="flex flex-col items-center gap-3 py-8 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">
                {status === 'logged_out'
                  ? 'Sesión cerrada — generando un código nuevo…'
                  : status === 'disconnected'
                    ? 'Conexión perdida — reconectando…'
                    : 'Conectando con WhatsApp…'}
              </p>
            </div>
          )}

          {status === 'connected' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {state?.user?.name ?? 'Cuenta vinculada'}
                  </p>
                  {state?.user?.id && (
                    <p className="text-sm text-gray-500">
                      {formatPhone(state.user.id.split(':')[0])}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar sesión de WhatsApp?</DialogTitle>
            <DialogDescription>
              El bot dejará de recibir y enviar mensajes hasta que vuelvas a
              escanear el código QR.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={loggingOut}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut && <Loader2 className="h-4 w-4 animate-spin" />}
              Cerrar sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
