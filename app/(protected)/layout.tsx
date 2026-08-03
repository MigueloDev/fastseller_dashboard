'use client'

import { ClerkLoaded, ClerkLoading, UserButton } from '@clerk/nextjs'
import { NavLink } from '@/components/NavLink'
import {
  MessageCircle,
  Calculator,
  FileText,
  Package,
  ShoppingCart,
  Home,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

function MobileTab({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const pathname = usePathname()
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-1',
        active ? 'text-violet-600' : 'text-gray-500'
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ClerkLoading>
        <div className="flex h-screen items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-violet-600" />
            <p className="text-sm">Cargando...</p>
          </div>
        </div>
      </ClerkLoading>

      <ClerkLoaded>
        <div className="h-screen flex flex-col bg-gray-50">
          <nav className="h-12 bg-white border-b border-gray-200 flex items-center
            justify-between px-4 shrink-0 z-10">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="font-semibold text-gray-900 flex items-center gap-1.5 text-[15px]"
              >
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                VictoriaLeads
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <NavLink href="/" label="Inicio" />
                <NavLink href="/inbox" label="Conversaciones" />
                <NavLink href="/productos" label="Productos" />
                <NavLink href="/ventas" label="Ventas" />
                <NavLink href="/clientes" label="Clientes" />
                <NavLink href="/reportes" label="Reportes" />
                <NavLink href="/calculadora" label="Calculadora" />
                <NavLink href="/whatsapp" label="WhatsApp" />
                <NavLink href="/conversiones" label="Divisas" />
                <NavLink href="/scouting" label="Scouting" />
              </div>
            </div>
            <UserButton afterSignOutUrl="/sign-in" />
          </nav>

          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>

          <nav className="md:hidden h-14 bg-white border-t border-gray-200 flex
            items-center justify-around shrink-0">
            <MobileTab href="/" label="Inicio" icon={Home} />
            <MobileTab href="/inbox" label="Chats" icon={MessageCircle} />
            <MobileTab href="/productos" label="Productos" icon={Package} />
            <MobileTab href="/ventas" label="Ventas" icon={ShoppingCart} />
            <MobileTab href="/reportes" label="Reportes" icon={FileText} />
            <MobileTab href="/calculadora" label="Calc" icon={Calculator} />
          </nav>
        </div>
      </ClerkLoaded>
    </>
  )
}
