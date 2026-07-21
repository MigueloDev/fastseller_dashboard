# Dashboard UI Skills

Fuente de verdad **UI** del repo: **[PROJECT.md](./PROJECT.md)**.  
Monorepo (backend + contrato): **[`docs/PROJECT_OVERVIEW.md`](../docs/PROJECT_OVERVIEW.md)**.

Este archivo solo resume convenciones de UI para agentes.

## Stack

- Next.js 15 App Router + React 19 + TypeScript
- Tailwind CSS 4 (`@theme` en `app/globals.css`)
- shadcn (`base-nova`) + `@base-ui/react`
- Fonts: Geist (`--font-sans`) + Geist Mono (`--font-mono`)
- Auth: Clerk (`auth.protect()` en `middleware.ts`)
- Package manager: **pnpm**

## Módulos

| Ruta | Rol |
|------|-----|
| `/inbox`, `/inbox/[jid]` | Inbox WhatsApp (ConversationList solo aquí) |
| `/productos` | CRUD catálogo (`components/productos/`) |
| `/ventas` | Ventas + pagos (`components/ventas/`) |
| `/calculadora` | Calculadora de importación VE |
| `/scouting` | Placeholder |
| `/conversiones` | Placeholder |

## Tema

- Shell light: `bg-gray-50`, blanco, `border-gray-200`
- Acento: violet (`violet-500/600/700`)
- Semánticos: `green-700` / `red-600`
- Dark tokens existen pero **no hay toggle** (light-only)

## Convenciones

- `'use client'` en componentes interactivos
- `cn()` de `@/lib/utils` (no `clsx` suelto salvo legado)
- Dominio calculadora namespaced: `lib/calculadora/`, `components/calculadora/`
- Dominio productos namespaced: `components/productos/`
- Dominio ventas namespaced: `components/ventas/`, `lib/ventas/`
- No tocar inbox/socket/bot al trabajar en calculadora
