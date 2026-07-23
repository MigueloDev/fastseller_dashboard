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
  /** Costo de compra USD; null en productos legacy sin costo. */
  purchasePriceUsd?: number | null
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
  purchasePriceUsd?: number | null
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
  saleId?: string | null
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

/** Nivel de stock: `quantity` es físico, `committed` lo reservado por ventas sin entregar. */
export interface StockLevelRow {
  productId: string
  variantId: string | null
  variantName: string | null
  minStock: number | null
  quantity: number
  committed: number
  available: number
  lowStock: boolean
  levelId: string | null
  updatedAt: string | null
}

export interface StockSummaryItem extends StockLevelRow {
  productName: string
}

export interface ProductStockDetail {
  productId: string
  productName: string
  minStock: number | null
  levels: StockLevelRow[]
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

export type WhatsAppConnectionStatus =
  | 'connecting'
  | 'waiting_qr'
  | 'connected'
  | 'disconnected'
  | 'logged_out'

export interface WhatsAppState {
  status: WhatsAppConnectionStatus
  qr: string | null
  user: { id: string | null; name: string | null } | null
  updatedAt: string
}

export type SaleStatus = 'PENDIENTE' | 'PAGADA' | 'ANULADA'

/** POR_ENTREGAR reserva stock; ENTREGADA ya descontó el físico (SALIDA en el ledger). */
export type DeliveryStatus = 'POR_ENTREGAR' | 'ENTREGADA'

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
  /** Snapshot de costo; null en ventas legacy. */
  unitCostUsd?: number | null
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
  hasReceipt: boolean
}

export interface BsRateQuote {
  rate: number
  fetchedAt: string
}

export interface Sale {
  id: string
  customerId: string
  status: SaleStatus
  deliveryStatus: DeliveryStatus
  deliveredAt: string | null
  deliveredBy: string | null
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
  /** null si falta snapshot de costo en algún ítem */
  costUsd?: number | null
  profitUsd?: number | null
  marginPct?: number | null
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
    /** Override manual; si falta, el backend elige el nivel por qty agregada. */
    unitPriceUsd?: number
  }>
  note?: string | null
}

export interface CreatePaymentPayload {
  method: PaymentMethod
  amount: number
  note?: string | null
  /** data URL or raw base64 WebP produced by the client */
  receiptBase64?: string | null
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

export interface MetricsBucket {
  count: number
  totalUsd: number
}

export interface MetricsTopProduct {
  productId: string
  productName: string
  variantId: string | null
  variantName: string | null
  unitsSold: number
  revenueUsd: number
}

export interface MetricsDayPoint {
  date: string
  totalUsd: number
}

export interface MetricsLowStock {
  productName: string
  variantName: string | null
  quantity: number
  committed: number
  available: number
  minStock: number | null
}

export interface SalesReportItem {
  id: string
  createdAt: string
  status: SaleStatus
  deliveryStatus: DeliveryStatus
  deliveredAt: string | null
  priceRef: PriceRef
  customerId: string
  customerName: string
  customerCedula: string | null
  items: Array<{
    productId: string
    productName: string
    variantId: string | null
    variantName: string | null
    quantity: number
    unitPriceUsd: number
    subtotalUsd: number
  }>
  totalUsd: number
  collectedUsd: number
  balanceUsd: number
  paymentsCount: number
  note: string | null
  agentName: string | null
}

export interface SalesReport {
  period: { from: string | null; to: string | null }
  filters: {
    status: SaleStatus | null
    delivery: DeliveryStatus | null
    customerId: string | null
  }
  totals: {
    count: number
    voidedCount: number
    totalUsd: number
    collectedUsd: number
    collectedCount: number
    balanceUsd: number
    totalBs: number | null
    collectedBs: number | null
    balanceBs: number | null
    bsRate: BsRateQuote | null
  }
  byPriceRef: { REF_USD: MetricsBucket; REF_BS: MetricsBucket }
  byDelivery: { POR_ENTREGAR: MetricsBucket; ENTREGADA: MetricsBucket }
  byProduct: MetricsTopProduct[]
  sales: SalesReportItem[]
}

export interface KardexMovement {
  id: string
  createdAt: string
  type: MovementType
  quantity: number
  delta: number
  entrada: number
  salida: number
  balance: number
  unitCost: number | null
  saleId: string | null
  note: string | null
  agentName: string | null
}

export interface KardexSection {
  variantId: string | null
  variantName: string | null
  opening: number
  closing: number
  totalIn: number
  totalOut: number
  onHand: number
  truncated: boolean
  movements: KardexMovement[]
}

export interface KardexReport {
  product: { id: string; name: string; sku: string | null }
  period: { from: string | null; to: string | null }
  sections: KardexSection[]
}

export interface ProductMovementsReportItem {
  id: string
  createdAt: string
  type: MovementType
  quantity: number
  delta: number
  entrada: number
  salida: number
  variantId: string | null
  variantName: string | null
  saleId: string | null
  note: string | null
  agentName: string | null
}

export interface ProductMovementsReport {
  product: { id: string; name: string; sku: string | null }
  period: { from: string | null; to: string | null }
  totals: { totalIn: number; totalOut: number; count: number }
  truncated: boolean
  movements: ProductMovementsReportItem[]
}

export interface MetricsSummary {
  period: { from: string | null; to: string | null }
  sold: MetricsBucket
  collected: MetricsBucket
  receivables: {
    totalUsd: number
    totalBs: number | null
    bsRate: BsRateQuote | null
  }
  byPriceRef: {
    REF_USD: MetricsBucket
    REF_BS: MetricsBucket
  }
  topProducts: MetricsTopProduct[]
  salesByDay: MetricsDayPoint[]
  lowStock: MetricsLowStock[]
}

export interface CurrencyPurchase {
  id: string
  saleId: string
  binanceRate: number
  bsSpent: number
  usdtReceived: number
  usdCollected: number
  costUsd: number | null
  profitUsd: number | null
  expectedUsdt: number | null
  note: string | null
  agentName: string | null
  purchasedAt: string
  createdAt: string
  sale?: {
    id: string
    status: SaleStatus
    totalUsd: number
    priceRef: PriceRef
    createdAt: string
    customer: { id: string; name: string; cedula: string | null } | null
  }
}

export interface CurrencyPurchaseSummary {
  count: number
  bsSpent: number
  usdtAcquired: number
  usdCollected: number
  profitUsd: number | null
}

export interface CurrencyPurchasesPage {
  items: CurrencyPurchase[]
  total: number
  limit: number
  offset: number
  summary: CurrencyPurchaseSummary
}

export interface EligibleSaleForFx {
  id: string
  status: SaleStatus
  priceRef: PriceRef
  totalUsd: number
  createdAt: string
  customer: { id: string; name: string; cedula: string | null } | null
  bsSpent: number
  usdCollected: number
  costUsd: number | null
  paymentsCount: number
}

export interface CreateCurrencyPurchasePayload {
  saleId: string
  binanceRate: number
  usdtReceived: number
  note?: string | null
}
