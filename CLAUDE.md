# Dashboard UI Skills

Fuente de verdad **UI** del repo: **[PROJECT.md](./PROJECT.md)**.
Monorepo (backend + contrato): **[`docs/PROJECT_OVERVIEW.md`](../docs/PROJECT_OVERVIEW.md)**.

Este archivo solo resume convenciones de UI para agentes.

## Stack

- Next.js 15 App Router + React 19 + TypeScript
- Tailwind CSS 4 (`@theme` en `app/globals.css`)
- shadcn (`base-nova`) + `@base-ui/react`
- Fonts: Geist (`--font-sans`). Geist Mono (`--font-mono`) sigue cargada pero solo para códigos tipo SKU, nunca para números/montos.
- Auth: Clerk (`auth.protect()` en `middleware.ts`)
- Package manager: **pnpm**

## Módulos

| Ruta | Rol |
|------|-----|
| `/` | Home métricas (`components/dashboard/`) |
| `/inbox`, `/inbox/[jid]` | Inbox WhatsApp (ConversationList solo aquí) |
| `/productos` | CRUD catálogo (`components/productos/`) |
| `/ventas` | Ventas + pagos (`components/ventas/`) |
| `/entregas` | Notas de entrega + print (`components/entregas/`) |
| `/clientes` | Listado + editar (`components/clientes/`) |
| `/reportes` | Ventas + kardex + movimientos (`components/reportes/`, `lib/reports/`) |
| `/calculadora` | Calculadora de importación VE |
| `/whatsapp` | Conexión del bot vía QR (`components/whatsapp/`) |
| `/scouting` | Placeholder |
| `/conversiones` | Compra de divisas USDT |
| `/cuentas`, `/cuentas/[id]` | Caja operativa (`components/cuentas/`) |

## Layout

- Contenedor estándar: `<PageContainer>` (`components/ui/page-header.tsx`) = `max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6`
- Excepción: `/reportes` y tablas anchas (muchas columnas) usan `<PageContainer wide>` (`max-w-6xl`) si `max-w-4xl` fuerza scroll horizontal — decidir por vista, no por defecto.
- Header de página: `<PageHeader title="…" description? actions?>` (`text-2xl font-semibold tracking-tight` + acciones a la derecha)
- Excepciones de layout: `/inbox` y `/entregas/[id]/imprimir` mantienen sus layouts especiales (sin `PageContainer`).

## Tema

- Shell light: `bg-gray-50`, blanco, `border-gray-200`
- Acento: violet — `violet-500` (default) / `violet-600` (hover) / `violet-700` (active/pressed)
- Semánticos: `green-700` (positivo/pagado) / `red-600` (negativo/error/anulado) / `amber-800` (pendiente/en proceso)
- Focus visible: `ring-2 ring-violet-500 ring-offset-2` en todo elemento interactivo
- Disabled: `opacity-50 pointer-events-none`
- Superficie: cards en `bg-white border border-gray-200 rounded-lg` sobre el fondo `bg-gray-50` de la página
- Radio estándar: `rounded-lg` en cards/containers, `rounded-md` en inputs y buttons
- Dark tokens existen pero **no hay toggle** (light-only)

## Tipografía

| Rol | Clase Tailwind | Uso |
|-----|-----------------|-----|
| Display | `text-2xl font-semibold tracking-tight` | Título de página (ej. "Ventas", "Reportes") |
| Heading | `text-lg font-medium` | Título de sección o card |
| Body | `text-sm` | Texto por defecto en tablas, formularios, contenido |
| Caption | `text-xs text-gray-500` | Metadata, timestamps, texto de ayuda en inputs |
| Numérico | `tabular-nums` | Montos, cantidades, tasas — nunca `font-mono` (el 0 de Geist Mono se ve mal) |

## Datos del dominio

- **Montos en Bs:** `Bs. 1.234,56` (punto de miles, coma decimal — formato venezolano) → `formatBs` de `@/lib/ventas/money`
- **Montos en USD:** `$ 1.234,56` → `formatUsd` de `@/lib/ventas/money`
- Cuando una vista muestra ambas monedas (ventas, reportes, calculadora, conversiones), el monto principal va en `tabular-nums` y el secundario en `text-xs text-gray-500` justo debajo o al lado, nunca como tooltip oculto — el usuario necesita ver ambas sin interacción extra.
- **Fechas:** `dd/MM/yyyy`, timezone `America/Caracas` → `formatDate` / `formatDateTime` de `@/lib/format`. Si el dato viene en UTC del backend/bot, convertir antes de renderizar, nunca mostrar UTC crudo.
- **Estados de negocio** (ventas, entregas): `<StatusBadge status={…} />` (`components/ui/status-badge.tsx`) mapea al set semántico de la sección Tema — no introducir un color nuevo por módulo.

## Patrones de componentes repetidos

- **Tablas** (`/productos`, `/ventas`, `/clientes`, `/entregas`, `/reportes`): loading = `<TableSkeleton rows={n} />` (no spinner de página completa), estado vacío = `<EmptyState icon={…} title="…">` + CTA cuando aplique (ej. "Aún no hay ventas registradas — Crear venta"), acciones por fila = menú kebab (`DropdownMenu`) si hay 3+ acciones, botones inline si son 1-2.
- **Formularios**: label arriba del input (no inline), asterisco rojo en campos requeridos, error en `text-xs text-red-600` debajo del input afectado, nunca en un banner genérico arriba del form. Submit primario con `<Button variant="primary">`.
- **Modales/Dialogs** (`@base-ui/react`): ancho `sm:max-w-md` por defecto (default del `DialogContent`), `sm:max-w-lg` si el contenido lo requiere. Cierran con click afuera excepto en acciones destructivas (anular venta, eliminar cliente), donde se usa `<ConfirmDialog>` (confirmación explícita dentro del modal).
- **Toasts/notificaciones**: `notify.success/error/show` de `@/lib/toast` (dismissa la anterior: una sola visible a la vez). `ToastProvider` ya configura posición bottom-right y duración 4s.

## Iconografía

- Librería: `lucide-react`
- Tamaño estándar: `size-4` dentro de botones, `size-5` en headers de sección

## Accesibilidad y responsive

- Focus visible obligatorio en todo elemento interactivo, no solo en hover de mouse.
- Todo el dashboard es mobile-first: diseñar y probar primero en viewport angosto, luego expandir con `sm:`/`md:`/`lg:`. Tablas anchas (`/reportes`, `/productos`) deben tener una versión legible en mobile (scroll horizontal contenido o layout de cards apiladas), no solo "se ve mal pero funciona".

## Convenciones

- `'use client'` en componentes interactivos
- `cn()` de `@/lib/utils` (no `clsx` suelto salvo legado)
- Dominio calculadora namespaced: `lib/calculadora/`, `components/calculadora/`
- Dominio productos namespaced: `components/productos/`
- Dominio ventas namespaced: `components/ventas/`, `lib/ventas/`
- Dominio entregas namespaced: `components/entregas/`
- Dominio clientes namespaced: `components/clientes/`
- Dominio whatsapp namespaced: `components/whatsapp/`
- Dominio reportes namespaced: `components/reportes/`, `lib/reports/`
- Dominio cuentas namespaced: `components/cuentas/`
- No tocar inbox/socket/bot al trabajar en calculadora

## Ejemplo Do / Don't

```
✅ <Button variant="primary">Guardar cambios</Button>
❌ <button className="bg-violet-500 px-4 py-2 rounded text-white">Guardar</button>

✅ <PageContainer> + <PageHeader title="Ventas" /> en la raíz de cada página
❌ Ancho distinto por vista o header custom por módulo sin justificación

✅ <TableSkeleton rows={6} /> / <EmptyState icon={Package} title="…" />
❌ <p>Cargando…</p> o un div dashed armado a mano por vista

✅ notify.success('Venta creada')  (de @/lib/toast)
❌ toast.success(...) directo de react-hot-toast (no dismissa la anterior)

✅ <ConfirmDialog destructive … /> para anular/eliminar
❌ window.confirm(...)
```