import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Set semántico único (convención CLAUDE.md): no introducir colores por módulo
const TONES = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  success: "bg-green-50 text-green-700 border-green-200",
  error: "bg-red-50 text-red-600 border-red-200",
  neutral: "bg-gray-50 text-gray-600 border-gray-200",
} as const

type StatusTone = keyof typeof TONES

// Mapa único de estados de negocio (ventas, entregas, cobro derivado, movimientos)
const STATUS_MAP: Record<string, { tone: StatusTone; label: string }> = {
  PENDIENTE: { tone: "pending", label: "Pendiente" },
  ABONADA: { tone: "pending", label: "Abonada" },
  CREDITO: { tone: "pending", label: "A crédito" },
  POR_ENTREGAR: { tone: "pending", label: "Por entregar" },
  AJUSTE: { tone: "pending", label: "Ajuste" },
  PAGADA: { tone: "success", label: "Pagada" },
  ENTREGADA: { tone: "success", label: "Entregada" },
  ACTIVA: { tone: "success", label: "Activa" },
  ENTRADA: { tone: "success", label: "Entrada" },
  ANULADA: { tone: "error", label: "Anulada" },
  SALIDA: { tone: "error", label: "Salida" },
}

function StatusBadge({
  status,
  label,
  className,
}: {
  status: string
  label?: string
  className?: string
}) {
  const entry = STATUS_MAP[status] ?? { tone: "neutral" as const, label }
  return (
    <Badge variant="outline" className={cn(TONES[entry.tone], className)}>
      {label ?? entry.label ?? status}
    </Badge>
  )
}

export { StatusBadge, STATUS_MAP, TONES }
