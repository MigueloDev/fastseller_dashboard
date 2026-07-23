import { MessageCircle } from 'lucide-react'
import { WhatsAppConnection } from '@/components/whatsapp/WhatsAppConnection'

export default function WhatsAppPage() {
  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <MessageCircle className="h-5 w-5 text-violet-600" />
        <h1 className="text-lg font-semibold text-gray-900">WhatsApp</h1>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <WhatsAppConnection />
      </div>
    </div>
  )
}
