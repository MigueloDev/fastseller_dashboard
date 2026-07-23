import type {
  Conversation,
  CreateCustomerPayload,
  CreateMovementPayload,
  CreatePaymentPayload,
  CreateSalePayload,
  CreateCurrencyPurchasePayload,
  CurrencyPurchasesPage,
  EligibleSaleForFx,
  Customer,
  ExchangeRates,
  Message,
  MovementResult,
  MovementsPage,
  Product,
  ProductStockDetail,
  ProductWritePayload,
  ReceivablesResponse,
  Sale,
  SalesPage,
  SalesReport,
  KardexReport,
  ProductMovementsReport,
  StockSummaryItem,
  MetricsSummary,
  WhatsAppState,
  CurrencyPurchase,
} from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_BOT_URL

async function request<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options?.headers as Record<string, string> | undefined),
  }
  // Fastify rejects empty body + application/json (DELETE/GET)
  if (options?.body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return res.json()
}

export const api = {
  getConversations: (token: string) =>
    request<Conversation[]>('/conversations', token),

  getMessages: (token: string, jid: string) =>
    request<Message[]>(
      `/conversations/${encodeURIComponent(jid)}/messages`,
      token
    ),

  updateStatus: (token: string, jid: string, status: string) =>
    request(`/conversations/${encodeURIComponent(jid)}/status`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  sendMessage: (token: string, jid: string, text: string) =>
    request('/send', token, {
      method: 'POST',
      body: JSON.stringify({ jid, text }),
    }),

  getProducts: (token: string, includeInactive = false) =>
    request<Product[]>(
      `/products${includeInactive ? '?includeInactive=true' : ''}`,
      token
    ),

  getProduct: (token: string, id: string) =>
    request<Product>(`/products/${id}`, token),

  createProduct: (token: string, data: ProductWritePayload) =>
    request<Product>('/products', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (token: string, id: string, data: ProductWritePayload) =>
    request<Product>(`/products/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteProduct: (token: string, id: string) =>
    request<Product>(`/products/${id}`, token, {
      method: 'DELETE',
    }),

  getRates: (token: string) => request<ExchangeRates>('/rates', token),

  getWhatsAppStatus: (token: string) =>
    request<WhatsAppState>('/whatsapp/status', token),

  logoutWhatsApp: (token: string) =>
    request<{ ok: boolean }>('/whatsapp/logout', token, { method: 'POST' }),

  getStock: (token: string) => request<StockSummaryItem[]>('/stock', token),

  getProductStock: (token: string, id: string, movementsLimit = 20) =>
    request<ProductStockDetail>(
      `/products/${id}/stock?movementsLimit=${movementsLimit}`,
      token
    ),

  createMovements: (token: string, movements: CreateMovementPayload[]) =>
    request<MovementResult[]>('/stock/movements', token, {
      method: 'POST',
      body: JSON.stringify({ movements }),
    }),

  getMovements: (
    token: string,
    params: {
      productId?: string
      variantId?: string
      type?: string
      from?: string
      to?: string
      limit?: number
      offset?: number
    } = {}
  ) => {
    const qs = new URLSearchParams()
    if (params.productId) qs.set('productId', params.productId)
    if (params.variantId) qs.set('variantId', params.variantId)
    if (params.type) qs.set('type', params.type)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    if (params.limit != null) qs.set('limit', String(params.limit))
    if (params.offset != null) qs.set('offset', String(params.offset))
    const query = qs.toString()
    return request<MovementsPage>(
      `/stock/movements${query ? `?${query}` : ''}`,
      token
    )
  },

  getCustomers: (token: string, q?: string) => {
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
    return request<Customer[]>(`/customers${qs}`, token)
  },

  createCustomer: (token: string, data: CreateCustomerPayload) =>
    request<Customer>('/customers', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCustomer: (
    token: string,
    id: string,
    data: Partial<{
      cedula: string
      firstName: string
      lastName: string
      phone: string | null
      jid: string | null
      note: string | null
      active: boolean
    }>
  ) =>
    request<Customer>(`/customers/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getSales: (
    token: string,
    params: {
      status?: string
      delivery?: string
      customerId?: string
      from?: string
      to?: string
      limit?: number
      offset?: number
    } = {}
  ) => {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.delivery) qs.set('delivery', params.delivery)
    if (params.customerId) qs.set('customerId', params.customerId)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    if (params.limit != null) qs.set('limit', String(params.limit))
    if (params.offset != null) qs.set('offset', String(params.offset))
    const query = qs.toString()
    return request<SalesPage>(`/sales${query ? `?${query}` : ''}`, token)
  },

  getSale: (token: string, id: string) => request<Sale>(`/sales/${id}`, token),

  createSale: (token: string, data: CreateSalePayload) =>
    request<Sale>('/sales', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSale: (token: string, saleId: string, data: CreateSalePayload) =>
    request<Sale>(`/sales/${saleId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  addPayment: (token: string, saleId: string, data: CreatePaymentPayload) =>
    request<Sale>(`/sales/${saleId}/payments`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPaymentReceiptUrl: (token: string, paymentId: string) =>
    request<{ url: string; expiresIn: number }>(
      `/payments/${paymentId}/receipt-url`,
      token,
    ),

  voidSale: (token: string, saleId: string) =>
    request<Sale>(`/sales/${saleId}/void`, token, { method: 'POST' }),

  deliverSale: (token: string, saleId: string) =>
    request<Sale>(`/sales/${saleId}/deliver`, token, { method: 'POST' }),

  undeliverSale: (token: string, saleId: string) =>
    request<Sale>(`/sales/${saleId}/undeliver`, token, { method: 'POST' }),

  getReceivables: (token: string) =>
    request<ReceivablesResponse>('/receivables', token),

  getMetricsSummary: (
    token: string,
    params: { from?: string; to?: string } = {}
  ) => {
    const qs = new URLSearchParams()
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    const query = qs.toString()
    return request<MetricsSummary>(
      `/metrics/summary${query ? `?${query}` : ''}`,
      token
    )
  },

  getSalesReport: (
    token: string,
    params: {
      from?: string
      to?: string
      status?: string
      delivery?: string
      customerId?: string
    } = {}
  ) => {
    const qs = new URLSearchParams()
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    if (params.status) qs.set('status', params.status)
    if (params.delivery) qs.set('delivery', params.delivery)
    if (params.customerId) qs.set('customerId', params.customerId)
    const query = qs.toString()
    return request<SalesReport>(
      `/reports/sales${query ? `?${query}` : ''}`,
      token
    )
  },

  getKardex: (
    token: string,
    params: {
      productId: string
      variantId?: string | null
      from?: string
      to?: string
    }
  ) => {
    const qs = new URLSearchParams()
    qs.set('productId', params.productId)
    if (params.variantId) qs.set('variantId', params.variantId)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    return request<KardexReport>(`/reports/kardex?${qs.toString()}`, token)
  },

  getProductMovementsReport: (
    token: string,
    params: {
      productId: string
      from?: string
      to?: string
    }
  ) => {
    const qs = new URLSearchParams()
    qs.set('productId', params.productId)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    return request<ProductMovementsReport>(
      `/reports/movements?${qs.toString()}`,
      token
    )
  },

  getCurrencyPurchases: (
    token: string,
    params: { limit?: number; offset?: number } = {}
  ) => {
    const qs = new URLSearchParams()
    if (params.limit != null) qs.set('limit', String(params.limit))
    if (params.offset != null) qs.set('offset', String(params.offset))
    const query = qs.toString()
    return request<CurrencyPurchasesPage>(
      `/currency-purchases${query ? `?${query}` : ''}`,
      token
    )
  },

  getEligibleSalesForFx: (token: string, limit = 50) =>
    request<{ items: EligibleSaleForFx[] }>(
      `/currency-purchases/eligible-sales?limit=${limit}`,
      token
    ),

  createCurrencyPurchase: (
    token: string,
    data: CreateCurrencyPurchasePayload
  ) =>
    request<CurrencyPurchase>('/currency-purchases', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
