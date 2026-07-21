import { ConversationList } from '@/components/ConversationList'

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="hidden md:flex w-80 shrink-0 border-r border-gray-200 bg-white flex-col">
        <ConversationList />
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  )
}
