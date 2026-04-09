import { UserButton } from '@clerk/nextjs'
import { ConversationList } from '@/components/ConversationList'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="font-semibold text-gray-800">WhatsApp Bot</h1>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
        <ConversationList />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
