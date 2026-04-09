import type { Message } from '@/types'
import { IntentBadge } from './IntentBadge'
import clsx from 'clsx'

interface Props {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const isOutbound = message.direction === 'outbound'
  const time = new Date(message.createdAt).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={clsx(
      'flex flex-col max-w-xs lg:max-w-md',
      isOutbound ? 'self-end items-end' : 'self-start items-start',
    )}>
      <div className={clsx(
        'px-4 py-2 rounded-2xl text-sm',
        isOutbound && message.origin === 'manual' &&
          'bg-green-600 text-white rounded-br-sm',
        isOutbound && message.origin === 'bot' &&
          'bg-green-200 text-green-900 rounded-br-sm',
        !isOutbound &&
          'bg-white text-gray-800 rounded-bl-sm shadow-sm',
      )}>
        {message.text}
      </div>
      <div className="flex items-center gap-1 mt-1 px-1">
        <span className="text-xs text-gray-400">{time}</span>
        {isOutbound && (
          <span className="text-xs text-gray-400">
            {message.origin === 'manual' ? '👤' : '🤖'}
          </span>
        )}
        <IntentBadge intent={message.intent} />
      </div>
    </div>
  )
}
