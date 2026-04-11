import type { Message } from '@/types'
import { IntentBadge } from './IntentBadge'
import { formatMessageTime } from '@/lib/format'
import clsx from 'clsx'

interface Props {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const isOutbound = message.direction === 'outbound'
  const isBot = isOutbound && message.origin === 'bot'
  const isManual = isOutbound && message.origin === 'manual'
  const time = formatMessageTime(message.createdAt)

  return (
    <div className={clsx(
      'flex flex-col max-w-xs lg:max-w-md',
      isOutbound ? 'self-end items-end' : 'self-start items-start',
    )}>
      <div className={clsx(
        'px-4 py-2.5 text-[13px] leading-relaxed rounded-sm',
        !isOutbound && [
          'bg-white text-gray-900 border border-gray-200',
          'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
        ],
        isBot && [
          'bg-[#dcfce7] text-[#15803d]',
        ],
        isManual && [
          'bg-[#6c47ff] text-white',
        ],
      )}>
        {message.text}
      </div>
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <span className="text-[10px] text-gray-400">{time}</span>
        {isBot && (
          <span className="text-[10px] text-gray-400">🤖 Bot</span>
        )}
        {isManual && message.agentName && (
          <span className="text-[10px] text-gray-400">{message.agentName}</span>
        )}
        <IntentBadge intent={message.intent} size="sm" />
      </div>
    </div>
  )
}
