import { ConversationList } from '@/components/ConversationList'
import { MessageCircle } from 'lucide-react'

export default function InboxPage() {
  return (
    <>
      {/* Mobile: show conversation list full screen */}
      <div className="md:hidden flex-1 flex flex-col bg-white overflow-hidden">
        <ConversationList />
      </div>

      {/* Desktop: empty state */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center
            justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-violet-500" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Selecciona una conversación
          </h3>
          <p className="text-xs text-gray-500 max-w-xs">
            Los mensajes con intención de compra aparecen destacados con un punto rojo
          </p>
        </div>
      </div>
    </>
  )
}
