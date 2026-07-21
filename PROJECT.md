# fastseller_dashboard — Resumen como base de tema

Documento de referencia **UI** del dashboard. Package manager: **pnpm** (no npm). Ver `memory/feedback_package_manager.md`.

**Monorepo (backend + contrato + deudas):** [`docs/PROJECT_OVERVIEW.md`](../docs/PROJECT_OVERVIEW.md) — fuente de verdad para análisis LLM.  
Al cambiar rutas, auth, contrato inbox o env, actualizar este archivo **y** el overview (regla `.cursor/rules/keep-project-docs-updated.mdc`).

---

## Identidad

| Item | Valor |
|------|--------|
| Stack | Next.js 15 App Router + React 19 + TypeScript |
| Producto | Dashboard VictoriaLeads (inbox + productos/inventario + ventas + calculadora) |
| Features | `/inbox`, `/inbox/[jid]`, `/productos`, `/ventas`, `/calculadora` |
| Placeholders | `/scouting`, `/conversiones` |

---

## Stack y dependencias

| Paquete | Rol |
|---------|-----|
| `@clerk/nextjs` | Auth |
| `tailwindcss` ^4 + `@tailwindcss/postcss` | Estilos |
| `shadcn` + `@base-ui/react` | Primitivos UI (`base-nova`) |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Variantes + `cn()` |
| `lucide-react` | Iconos |
| `react-hot-toast` | Toasts |
| `socket.io-client` | Realtime hacia el bot |
| `tw-animate-css` | Animaciones |
| `vitest` | Tests del motor de calculadora |
| `zustand` | Declarado pero **no usado** |

Scripts: `dev`, `build`, `start`, `lint`, `test`.

---

## Tema (preservar como base)

### Capa design system

| Archivo / carpeta | Qué aporta |
|-------------------|------------|
| `app/globals.css` | Tailwind 4, tokens oklch, `@theme inline`, dark preparado pero inactivo |
| `components.json` | Config shadcn `base-nova` |
| `components/ui/*` | Primitivos shadcn (incl. Card, Alert) |
| `lib/utils.ts` | `cn()` = `twMerge(clsx(...))` |
| `app/layout.tsx` | Geist + Geist Mono, `ClerkProvider`, `ToastProvider` |
| `postcss.config.mjs` | Plugin `@tailwindcss/postcss` |

Dark mode: tokens existen; **no hay** toggle. Light only.

### Piel visual

- Shell: `bg-gray-50`, blanco, `border-gray-200`
- Acento violet: `violet-500/600/700`
- Chat: fondo `#f9fafb`; bot `#dcfce7` / `#15803d`
- Layout protegido: navbar en `(protected)/layout.tsx`; ConversationList solo en `inbox/layout.tsx`

---

## Auth y rutas

### Auth (Clerk)

- `ClerkProvider` en `app/layout.tsx`
- `middleware.ts`: `auth.protect()` en todo excepto `/sign-in(.*)` (incluye `/api/*`)
- Sign-in: `app/sign-in/[[...sign-in]]/page.tsx`

### Rutas

| Ruta | Archivo | Notas |
|------|---------|-------|
| `/` | `app/page.tsx` | Redirect → `/inbox` |
| `/sign-in` | `app/sign-in/[[...sign-in]]/page.tsx` | Pública |
| `/inbox` | `app/(protected)/inbox/page.tsx` | Lista / empty state |
| `/inbox/[jid]` | `app/(protected)/inbox/[jid]/page.tsx` | `ChatWindow` |
| `/productos` | `app/(protected)/productos/page.tsx` | CRUD catálogo + inventario (movimientos) |
| `/ventas` | `app/(protected)/ventas/page.tsx` | Lista + cuentas por cobrar |
| `/ventas/nueva` | `app/(protected)/ventas/nueva/page.tsx` | Crear venta |
| `/ventas/[id]` | `app/(protected)/ventas/[id]/page.tsx` | Detalle + pagos |
| `/calculadora` | `app/(protected)/calculadora/page.tsx` | ImportCalc VE (`GET /rates`) |
| `/scouting` | `app/(protected)/scouting/page.tsx` | Stub |
| `/conversiones` | `app/(protected)/conversiones/page.tsx` | Stub (nav deshabilitado) |

### Env (ver `.env.example`)

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client |
| `CLERK_SECRET_KEY` | Clerk server / middleware |
| `NEXT_PUBLIC_BOT_URL` | REST + Socket.IO (inbox, productos, ventas, tasas) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | p.ej. `/sign-in` |
| `NEXT_PUBLIC_CLERK_*_REDIRECT_*` | Redirects post-login |

---

## Arquitectura UI

```mermaid
flowchart TD
  root[app/layout.tsx Clerk Geist globals]
  mw[middleware.ts auth.protect]
  pub["/sign-in"]
  shell["(protected)/layout.tsx navbar"]
  inboxLayout["inbox/layout.tsx ConversationList"]
  inbox["/inbox + /inbox/jid"]
  productos["/productos"]
  calc["/calculadora"]
  stubs["/scouting /conversiones"]

  mw --> pub
  mw --> shell
  root --> mw
  shell --> inboxLayout --> inbox
  shell --> productos
  shell --> calc
  shell --> stubs
```

### Módulo productos / inventario

| Path | Rol |
|------|-----|
| `app/(protected)/productos/page.tsx` | Lista + “Llegó mercancía” + dialogs |
| `components/productos/ProductTable.tsx` | Columna stock / lowStock / expand movimientos + badge brecha |
| `components/productos/ProductFormDialog.tsx` | Crear / editar (+ `minStock`) |
| `components/productos/StockMovementDialog.tsx` | ENTRADA/SALIDA/AJUSTE batch + confirmación |
| `components/productos/MovementHistory.tsx` | Tabla historial con badges por tipo |
| `components/productos/PriceInputs.tsx` | REF_USD + REF_BS + botón Sugerir (`GET /rates`) + brecha % |
| `components/productos/VariantInputs.tsx` | Filas de variantes |
| `lib/api.ts` / `hooks/useApi.ts` | productos + stock/movements + `getRates` |
| `types/index.ts` | `Product*`, `Stock*`, `MovementType`, `PriceRef`, `ExchangeRates` |

Stock nunca se edita inline: solo vía movimientos. Sin página `/inventario` separada todavía.

### Módulo ventas

| Path | Rol |
|------|-----|
| `app/(protected)/ventas/page.tsx` | Lista + CxC |
| `app/(protected)/ventas/nueva/page.tsx` | Wrapper `SaleForm` |
| `app/(protected)/ventas/[id]/page.tsx` | Detalle + pagos + anular |
| `components/ventas/SaleForm.tsx` | Crear venta |
| `components/ventas/CustomerPicker.tsx` | Búsqueda cédula/nombre + feedback loading/vacío |
| `components/ventas/CreateCustomerDialog.tsx` | Alta: cédula, nombre, apellido, teléfono VE |
| `components/ventas/PriceModeSelector.tsx` | REF_USD / REF_BS |
| `components/ventas/SaleLineItem.tsx` | Línea producto/variante/qty |
| `components/ventas/PaymentDialog.tsx` | Registrar abono |
| `components/ventas/PaymentTimeline.tsx` | Historial pagos |
| `components/ventas/ReceivablesCard.tsx` | CxC en listado |
| `lib/ve/cedula.ts` / `lib/ve/phone.ts` | Normalización VE |
| `lib/ventas/money.ts` | Formatos + métodos de pago |

### Módulo calculadora

| Path | Rol |
|------|-----|
| `app/(protected)/calculadora/page.tsx` | UI + `useApi().getRates()` |
| `lib/calculadora/types.ts` | Tipos Inputs/Results |
| `lib/calculadora/calculations.ts` | `compute()` |
| `lib/calculadora/calculations.test.ts` | Suite Vitest (9 casos) |
| `components/calculadora/*` | CostInputs, RateDisplay, ResultsDashboard, SpreadAlert |

### Componentes inbox

| Componente | Rol |
|------------|-----|
| `ConversationList` | Lista (solo bajo `/inbox`) |
| `ChatWindow` | Mensajes |
| `MessageBubble` | Burbujas |
| `IntentBadge` / `StatusBadge` | Labels |
| `NavLink` | Nav activa |
| `ToastProvider` | react-hot-toast |

Backend bot (externo): `GET/PATCH` conversaciones, `POST /send`, `GET /rates`, socket events. Productos y calculadora usan tasas del bot vía `useApi().getRates()`.

---

## Nota sobre `CLAUDE.md`

`CLAUDE.md` redirige aquí. Este archivo es la fuente de verdad.
