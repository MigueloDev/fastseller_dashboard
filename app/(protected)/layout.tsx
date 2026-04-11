import { ClerkLoaded, ClerkLoading, UserButton } from '@clerk/nextjs'
import { ConversationList } from '@/components/ConversationList'
import { NavLink } from '@/components/NavLink'
import { MessageCircle, BarChart2 } from 'lucide-react'

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
          {/* Top navbar */}
          <nav className="h-12 bg-white border-b border-gray-200 flex items-center
            justify-between px-4 shrink-0 z-10">
            <div className="flex items-center gap-6">
              <span className="font-semibold text-gray-900 flex items-center gap-1.5 text-[15px]">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                VictoriaLeads
              </span>
              <div className="hidden md:flex items-center gap-1">
                <NavLink href="/inbox" label="Conversaciones" />
                <NavLink href="/conversiones" label="Conversiones" disabled />
              </div>
            </div>
            <UserButton afterSignOutUrl="/sign-in" />
          </nav>

          {/* Content area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar — desktop only */}
            <aside className="hidden md:flex w-80 shrink-0 border-r border-gray-200
              bg-white flex-col">
              <ConversationList />
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {children}
            </main>
          </div>

          {/* Bottom nav — mobile only */}
          <nav className="md:hidden h-14 bg-white border-t border-gray-200 flex
            items-center justify-around shrink-0">
            <a href="/inbox" className="flex flex-col items-center gap-1 text-violet-600">
              <MessageCircle className="w-5 h-5" />
              <span className="text-[10px] font-medium">Chats</span>
            </a>
            <div className="flex flex-col items-center gap-1 text-gray-300 cursor-not-allowed opacity-40">
              <BarChart2 className="w-5 h-5" />
              <span className="text-[10px] font-medium">Conversiones</span>
            </div>
          </nav>
        </div>
      </ClerkLoaded>
    </>
  )
}
