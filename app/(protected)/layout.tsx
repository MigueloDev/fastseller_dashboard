import { ClerkLoaded, ClerkLoading, UserButton } from '@clerk/nextjs'
import { NavLink } from '@/components/NavLink'
import {
  MessageCircle,
  Calculator,
  BarChart2,
  Package,
  ShoppingCart,
} from 'lucide-react'
import Link from 'next/link'

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
              <span className="font-semibold text-gray-900 flex items-center gap-1.5 text-[15px]">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                VictoriaLeads
              </span>
              <div className="hidden md:flex items-center gap-1">
                <NavLink href="/inbox" label="Conversaciones" />
                <NavLink href="/productos" label="Productos" />
                <NavLink href="/ventas" label="Ventas" />
                <NavLink href="/calculadora" label="Calculadora" />
                <NavLink href="/scouting" label="Scouting" />
                <NavLink href="/conversiones" label="Conversiones" disabled />
              </div>
            </div>
            <UserButton afterSignOutUrl="/sign-in" />
          </nav>

          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>

          <nav className="md:hidden h-14 bg-white border-t border-gray-200 flex
            items-center justify-around shrink-0">
            <Link href="/inbox" className="flex flex-col items-center gap-1 text-violet-600">
              <MessageCircle className="w-5 h-5" />
              <span className="text-[10px] font-medium">Chats</span>
            </Link>
            <Link href="/productos" className="flex flex-col items-center gap-1 text-gray-500">
              <Package className="w-5 h-5" />
              <span className="text-[10px] font-medium">Productos</span>
            </Link>
            <Link href="/ventas" className="flex flex-col items-center gap-1 text-gray-500">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-[10px] font-medium">Ventas</span>
            </Link>
            <Link href="/calculadora" className="flex flex-col items-center gap-1 text-gray-500">
              <Calculator className="w-5 h-5" />
              <span className="text-[10px] font-medium">Calc</span>
            </Link>
            <div className="flex flex-col items-center gap-1 text-gray-300 cursor-not-allowed opacity-40">
              <BarChart2 className="w-5 h-5" />
              <span className="text-[10px] font-medium">Conv.</span>
            </div>
          </nav>
        </div>
      </ClerkLoaded>
    </>
  )
}
