# Dashboard UI Skills

## Stack de estilos
- Next.js 15 App Router
- Tailwind CSS 4
- Sin librerías de componentes externas

## Estilo visual objetivo
Dashboard profesional estilo SaaS moderno:
- Fondo: gris oscuro (#0f0f0f) o blanco roto (#fafafa)
- Tipografía: Inter o sistema
- Bordes sutiles, sin sombras pesadas
- Espaciado generoso
- Estados de hover suaves

## Componentes existentes
- ConversationList — sidebar izquierdo con lista de chats
- ChatWindow — área principal de mensajes
- MessageBubble — burbuja individual de mensaje
- IntentBadge — badge de intención de compra

## Patrones de UI a seguir
- Inbox similar a Linear o Intercom
- Burbujas de chat similares a WhatsApp Web
- Sidebar con conversaciones ordenadas por recencia
- Header con info del contacto y acciones
- Input fijo en el bottom del chat

## Convenciones
- Siempre 'use client' en componentes interactivos
- clsx para clases condicionales
- No usar useState para estilos, usar clases de Tailwind
- Mobile-first aunque el dashboard es desktop