'use client'

import { useEffect } from 'react'
import { ClerkLoaded, ClerkLoading, UserButton } from '@clerk/nextjs'
import { NavLink } from '@/components/NavLink'
import { MeProvider, sellerPathAllowed, useMe } from '@/hooks/useMe'
import {
  MessageCircle,
  // Calculator, Package, Truck: solo los usaba la barra inferior anterior (ver abajo)
  ShoppingCart,
  Home,
  Users,
  UserPlus,
  Menu,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ADMIN_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/inbox', label: 'Conversaciones' },
  { href: '/productos', label: 'Productos' },
  { href: '/ventas', label: 'Ventas' },
  { href: '/entregas', label: 'Entregas' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/leads', label: 'Leads' },
  { href: '/reportes', label: 'Reportes' },
  { href: '/calculadora', label: 'Calculadora' },
  { href: '/whatsapp', label: 'WhatsApp' },
  { href: '/conversiones', label: 'Divisas' },
  { href: '/cuentas', label: 'Cuentas' },
  { href: '/usuarios', label: 'Usuarios' },
  { href: '/scouting', label: 'Scouting' },
]

const SELLER_LINKS = [
  { href: '/ventas', label: 'Ventas' },
  { href: '/clientes', label: 'Clientes' },
]

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
  const active = isActive(pathname, href)
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

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

/** Tabs fijos de la barra inferior admin; el resto de ADMIN_LINKS va en "Más". */
const ADMIN_TABS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/inbox', label: 'Chats', icon: MessageCircle },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/leads', label: 'Leads', icon: UserPlus },
]
const ADMIN_MORE = ADMIN_LINKS.filter((l) => !ADMIN_TABS.some((t) => t.href === l.href))

function MoreTab() {
  const pathname = usePathname()
  const router = useRouter()
  const active = ADMIN_MORE.some((l) => isActive(pathname, l.href))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex flex-col items-center gap-1 rounded-md focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none',
          active ? 'text-violet-600' : 'text-gray-500'
        )}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] font-medium">Más</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="min-w-44">
        {ADMIN_MORE.map((l) => (
          <DropdownMenuItem
            key={l.href}
            className={cn(isActive(pathname, l.href) && 'text-violet-700')}
            onClick={() => router.push(l.href)}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-violet-600" />
        <p className="text-sm">Cargando...</p>
      </div>
    </div>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { me, loading } = useMe()
  const pathname = usePathname()
  const router = useRouter()
  const seller = me?.role === 'VENDEDOR'
  const allowed = !seller || sellerPathAllowed(pathname)

  useEffect(() => {
    if (!seller || allowed) return
    router.replace('/ventas')
  }, [seller, allowed, router])

  if (loading) return <LoadingScreen />

  if (!me) {
    return (
      <div className="flex h-screen items-center justify-center bg-white px-6 text-center text-sm text-gray-500">
        No se pudo cargar tu usuario. Recarga la página.
      </div>
    )
  }

  const links = seller ? SELLER_LINKS : ADMIN_LINKS
  const home = seller ? '/ventas' : '/'

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <nav className="print:hidden h-12 bg-white border-b border-gray-200 flex items-center
        justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-6">
          <Link
            href={home}
            className="font-semibold text-gray-900 flex items-center gap-1.5 text-[15px]"
          >
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            VictoriaLeads
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </div>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden">
        {allowed ? children : null}
      </main>

      <nav className="print:hidden md:hidden h-[calc(3.5rem+env(safe-area-inset-bottom))]
        pb-[env(safe-area-inset-bottom)] bg-white border-t border-gray-200 flex items-center
        justify-around shrink-0">
        {seller ? (
          <>
            <MobileTab href="/ventas" label="Ventas" icon={ShoppingCart} />
            <MobileTab href="/clientes" label="Clientes" icon={Users} />
          </>
        ) : (
          <>
            {ADMIN_TABS.map((t) => (
              <MobileTab key={t.href} href={t.href} label={t.label} icon={t.icon} />
            ))}
            <MoreTab />
            {/* Barra anterior: 6 tabs fijos, dejaba Clientes/Reportes/Cuentas… sin acceso en móvil.
            <MobileTab href="/" label="Inicio" icon={Home} />
            <MobileTab href="/inbox" label="Chats" icon={MessageCircle} />
            <MobileTab href="/productos" label="Productos" icon={Package} />
            <MobileTab href="/ventas" label="Ventas" icon={ShoppingCart} />
            <MobileTab href="/entregas" label="Entregas" icon={Truck} />
            <MobileTab href="/calculadora" label="Calc" icon={Calculator} />
            */}
          </>
        )}
      </nav>
    </div>
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
        <LoadingScreen />
      </ClerkLoading>

      <ClerkLoaded>
        <MeProvider>
          <AppShell>{children}</AppShell>
        </MeProvider>
      </ClerkLoaded>
    </>
  )
}
