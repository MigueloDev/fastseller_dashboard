import { ChatWindow } from '@/components/ChatWindow'

interface Props {
  params: Promise<{ jid: string }>
}

export default async function ChatPage({ params }: Props) {
  const { jid } = await params
  const decodedJid = decodeURIComponent(jid)
  return <ChatWindow jid={decodedJid} />
}
