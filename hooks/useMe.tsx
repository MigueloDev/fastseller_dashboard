'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useApi } from '@/hooks/useApi'
import type { Me } from '@/types'

type MeState = {
  me: Me | null
  loading: boolean
  setMe: (me: Me) => void
}

const MeContext = createContext<MeState>({
  me: null,
  loading: true,
  setMe: () => {},
})

export function MeProvider({ children }: { children: ReactNode }) {
  const api = useApi()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .getMe()
      .then((row) => {
        if (!cancelled) setMe(row)
      })
      .catch(() => {
        if (!cancelled) setMe(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  return (
    <MeContext.Provider value={{ me, loading, setMe }}>
      {children}
    </MeContext.Provider>
  )
}

export function useMe() {
  return useContext(MeContext)
}

/** Ventas (lista, alta, detalle) y clientes. Editar venta no entra. */
export function sellerPathAllowed(pathname: string) {
  if (pathname === '/clientes') return true
  if (pathname === '/ventas' || pathname === '/ventas/nueva') return true
  return /^\/ventas\/[^/]+$/.test(pathname)
}
