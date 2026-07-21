export type ConversationStatus = 'bot' | 'human' | 'closed'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageOrigin = 'bot' | 'manual' | 'client'
export type IntentType = 'consulta' | 'intencion' | 'saludo' | 'off_topic' | null

export type PriceRef = 'REF_USD' | 'REF_BS'

export interface ProductVariant {
  id: string
  productId: string
  name: string
  sku: string | null
  active: boolean
  createdAt: string
}

export interface ProductPrice {
  id: string
  productId: string
  ref: PriceRef
  amount: number
  minQty: number
  active: boolean
  createdAt: string
}

export interface Product {
  id: string
  sku: string | null
  name: string
  description: string | null
  brand: string | null
  active: boolean
  minStock?: number | null
  variants: ProductVariant[]
  prices: ProductPrice[]
  createdAt: string
  updatedAt: string
}

export interface ProductWritePayload {
  name: string
  sku?: string | null
  brand?: string | null
  description?: string | null
  active?: boolean
  minStock?: number | null
  variants?: Array<{
    id?: string
    name: string
    sku?: string | null
    active?: boolean
  }>
  prices?: Array<{
    id?: string
    ref: PriceRef
    amount: number
    minQty?: number
    active?: boolean
  }>
}

export type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE'

export interface StockMovement {
  id: string
  productId: string
  variantId: string | null
  type: MovementType
  quantity: number
  delta: number
  unitCost: number | null
  note: string | null
  agentName: string | null
  createdAt: string
}

export interface StockLevel {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  updatedAt: string
}

export interface StockSummaryItem {
  productId: string
  productName: string
  variantId: string | null
  variantName: string | null
  minStock: number | null
  quantity: number
  lowStock: boolean
  levelId: string | null
  updatedAt: string | null
}

export interface ProductStockDetail {
  productId: string
  productName: string
  minStock: number | null
  levels: Array<{
    productId: string
    variantId: string | null
    variantName: string | null
    minStock: number | null
    quantity: number
    lowStock: boolean
    levelId: string | null
    updatedAt: string | null
  }>
  movements: StockMovement[]
}

export type CreateMovementPayload =
  | {
      productId: string
      variantId?: string | null
      type: 'ENTRADA' | 'SALIDA'
      quantity: number
      unitCost?: number | null
      note?: string | null
    }
  | {
      productId: string
      variantId?: string | null
      type: 'AJUSTE'
      delta: number
      note: string
    }

export interface MovementResult {
  movement: StockMovement
  level: StockLevel
}

export interface MovementsPage {
  items: StockMovement[]
  total: number
  limit: number
  offset: number
}

export interface RateQuote {
  rate: number
  fetchedAt: string
}

export interface ExchangeRates {
  bcv: RateQuote | null
  binance: RateQuote | null
  gap: number | null
}

export interface Message {
  id: string
  conversationId: string
  direction: MessageDirection
  text: string
  intent: IntentType
  origin: MessageOrigin | null
  agentName?: string | null
  createdAt: string
  sending?: boolean
  failed?: boolean
}

export interface Conversation {
  id: string
  jid: string
  status: ConversationStatus
  lastMessageAt: string | null
  contactName: string | null
  createdAt: string
  messages?: Message[]
}

export interface NewMessageEvent extends Message {
  jid: string
}

export interface ConversationUpdatedEvent {
  jid: string
  lastMessage: string | null
  lastMessageAt: string
  status: ConversationStatus | null
  intent: IntentType
  updatedBy: string
}

export interface ConversationStatusChangedEvent {
  jid: string
  status: ConversationStatus
  updatedBy: string
}

export interface IntentDetectedEvent {
  jid: string
  text: string
  confidence: number
  reason: string
  timestamp: string
}

export type SaleStatus = 'PENDIENTE' | 'PAGADA' | 'ANULADA'

export type PaymentMethod =
  | 'EFECTIVO_USD'
  | 'ZELLE'
  | 'USDT'
  | 'PAGO_MOVIL'
  | 'TRANSFERENCIA'
  | 'PUNTO'
  | 'EFECTIVO_BS'

export type PaymentCurrency = 'USD' | 'BS'

export interface Customer {
  id: string
  cedula: string | null
  firstName: string
  lastName: string
  name: string
  phone: string | null
  jid: string | null
  note: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CreateCustomerPayload = {
  cedula: string
  firstName: string
  lastName: string
  phone?: string | null
  jid?: string | null
  note?: string | null
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  variantId: string | null
  quantity: number
  unitPriceUsd: number
  subtotalUsd: number
  product?: { id: string; name: string; sku: string | null; active: boolean }
  variant?: { id: string; name: string; sku: string | null; active: boolean } | null
}

export interface Payment {
  id: string
  saleId: string
  method: PaymentMethod
  currency: PaymentCurrency
  amount: number
  amountUsd: number
  rateUsed: number | null
  rateSource: 'BCV' | 'BINANCE' | null
  note: string | null
  agentName: string | null
  paidAt: string
}

export interface BsRateQuote {
  rate: number
  fetchedAt: string
}

export interface Sale {
  id: string
  customerId: string
  status: SaleStatus
  priceRef: PriceRef
  totalUsd: number
  note: string | null
  agentName: string | null
  createdAt: string
  updatedAt: string
  customer: Customer
  items: SaleItem[]
  payments: Payment[]
  balanceUsd: number
  balanceBs: number | null
  bsRate: BsRateQuote | null
  paymentMismatch: boolean
}

export interface SalesPage {
  items: Sale[]
  total: number
  limit: number
  offset: number
}

export interface CreateSalePayload {
  customerId: string
  priceRef: PriceRef
  items: Array<{
    productId: string
    variantId?: string | null
    quantity: number
  }>
  note?: string | null
}

export interface CreatePaymentPayload {
  method: PaymentMethod
  amount: number
  note?: string | null
}

export interface ReceivablesResponse {
  totalOwedUsd: number
  totalOwedBs: number | null
  bsRate: BsRateQuote | null
  customers: Array<{
    customer: Customer
    sales: Sale[]
    totalOwedUsd: number
    totalOwedBs: number | null
    oldestAt: string
  }>
}
