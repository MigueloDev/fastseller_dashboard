'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, UserPlus, X } from 'lucide-react'
import type { Customer } from '@/types'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCedulaDisplay } from '@/lib/ve/cedula'
import { formatPhoneDisplay } from '@/lib/ve/phone'
import { CustomerFormDialog } from '@/components/clientes/CustomerFormDialog'

type Props = {
  value: Customer | null
  onChange: (customer: Customer | null) => void
}

function labelOf(c: Customer): string {
  const parts = [
    formatCedulaDisplay(c.cedula) || null,
    c.name || `${c.firstName} ${c.lastName}`.trim(),
    formatPhoneDisplay(c.phone) || null,
  ].filter(Boolean)
  return parts.join(' · ')
}

export function CustomerPicker({ value, onChange }: Props) {
  const api = useApi()
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  )
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (value) return
    if (!debounced) {
      setResults([])
      setStatus('idle')
      setOpen(false)
      return
    }

    let cancelled = false
    setStatus('loading')
    void api
      .getCustomers(debounced)
      .then((rows) => {
        if (cancelled) return
        setResults(rows)
        setStatus('done')
        setOpen(true)
      })
      .catch(() => {
        if (cancelled) return
        setResults([])
        setStatus('error')
        setOpen(true)
      })
    return () => {
      cancelled = true
    }
  }, [api, debounced, value])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function select(c: Customer) {
    onChange(c)
    setQuery('')
    setDebounced('')
    setResults([])
    setStatus('idle')
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setQuery('')
    setDebounced('')
    setResults([])
    setStatus('idle')
    setOpen(false)
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
        <div className="min-w-0 flex-1 text-sm text-gray-900">
          <p className="truncate font-medium">{value.name}</p>
          <p className="truncate text-xs text-gray-500">
            {[
              formatCedulaDisplay(value.cedula) || null,
              formatPhoneDisplay(value.phone) || null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Sin cédula / teléfono'}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Cambiar cliente"
          onClick={clear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  const showPanel =
    open && (status === 'loading' || status === 'done' || status === 'error')
  const empty =
    status === 'done' && debounced.length > 0 && results.length === 0

  return (
    <div ref={wrapRef} className="flex flex-wrap items-start gap-2">
      {/* relative solo en el input: el listado cae debajo, no sobre el flex row */}
      <div className="relative min-w-0 flex-1 basis-48">
        <Input
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Buscar por cédula o nombre…"
          value={query}
          onChange={(e) => {
            const next = e.target.value
            setQuery(next)
            if (!next.trim()) {
              setOpen(false)
              setResults([])
              setStatus('idle')
            } else {
              setOpen(true)
            }
          }}
          onFocus={() => {
            if (debounced || status === 'loading') setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              setOpen(false)
            }
          }}
        />

        {showPanel && (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 top-full z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-md"
          >
            {status === 'loading' && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando…
              </div>
            )}

            {status === 'error' && (
              <p className="px-3 py-2 text-sm text-red-600">
                Error al buscar. Intenta de nuevo.
              </p>
            )}

            {status === 'done' &&
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="flex w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-violet-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(c)}
                >
                  {labelOf(c)}
                </button>
              ))}

            {empty && (
              <div className="space-y-2 px-3 py-2">
                <p className="text-sm text-gray-500">
                  Sin resultados para “{debounced}”
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setCreateOpen(true)}
                >
                  <UserPlus className="mr-1 h-4 w-4" />
                  Registrar cliente
                </Button>
              </div>
            )}
          </div>
        )}

        {!empty && debounced.length > 0 && status === 'done' && (
          <button
            type="button"
            className="mt-1 text-xs text-violet-700 hover:underline"
            onClick={() => setCreateOpen(true)}
          >
            ¿No está? Registrar cliente
          </button>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setCreateOpen(true)}
      >
        <UserPlus className="mr-1 h-4 w-4" />
        Registrar cliente
      </Button>

      <CustomerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialQuery={query || debounced}
        onSaved={select}
      />
    </div>
  )
}
