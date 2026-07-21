'use client'

import type { MovementType, StockMovement } from '@/types'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const TYPE_STYLE: Record<MovementType, string> = {
  ENTRADA: 'bg-green-50 text-green-800 border-green-200',
  SALIDA: 'bg-red-50 text-red-700 border-red-200',
  AJUSTE: 'bg-amber-50 text-amber-800 border-amber-200',
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-VE', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

type Props = {
  movements: StockMovement[]
  variantNames?: Record<string, string>
  emptyLabel?: string
}

export function MovementHistory({
  movements,
  variantNames = {},
  emptyLabel = 'Sin movimientos',
}: Props) {
  if (movements.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">{emptyLabel}</p>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80">
            <TableHead className="text-xs">Tipo</TableHead>
            <TableHead className="text-xs">Cant.</TableHead>
            <TableHead className="text-xs">Variante</TableHead>
            <TableHead className="text-xs">Quién</TableHead>
            <TableHead className="text-xs">Cuándo</TableHead>
            <TableHead className="text-xs">Nota</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${TYPE_STYLE[m.type]}`}
                >
                  {m.type}
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums text-xs">
                {m.delta > 0 ? '+' : ''}
                {m.delta}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {m.variantId
                  ? variantNames[m.variantId] ?? m.variantId.slice(0, 6)
                  : '—'}
              </TableCell>
              <TableCell className="text-xs">{m.agentName ?? '—'}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">
                {formatWhen(m.createdAt)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[12rem] truncate">
                {m.note ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
