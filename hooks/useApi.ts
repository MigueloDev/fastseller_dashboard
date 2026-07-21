'use client'

import { useCallback, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'
import type {
  CreateCustomerPayload,
  CreateMovementPayload,
  CreatePaymentPayload,
  CreateSalePayload,
  ProductWritePayload,
} from '@/types'

export function useApi() {
  const { getToken } = useAuth()

  const withToken = useCallback(async <T,>(
    fn: (token: string) => Promise<T>
  ): Promise<T> => {
    const token = await getToken()

    if (!token) {
      throw new Error('No autenticado')
    }

    return fn(token)
  }, [getToken])

  return useMemo(() => ({
    getConversations: () =>
      withToken(token => api.getConversations(token)),

    getMessages: (jid: string) =>
      withToken(token => api.getMessages(token, jid)),

    updateStatus: (jid: string, status: string) =>
      withToken(token => api.updateStatus(token, jid, status)),

    sendMessage: (jid: string, text: string) =>
      withToken(token => api.sendMessage(token, jid, text)),

    getProducts: (includeInactive = false) =>
      withToken(token => api.getProducts(token, includeInactive)),

    getProduct: (id: string) =>
      withToken(token => api.getProduct(token, id)),

    createProduct: (data: ProductWritePayload) =>
      withToken(token => api.createProduct(token, data)),

    updateProduct: (id: string, data: ProductWritePayload) =>
      withToken(token => api.updateProduct(token, id, data)),

    deleteProduct: (id: string) =>
      withToken(token => api.deleteProduct(token, id)),

    getRates: () => withToken(token => api.getRates(token)),

    getStock: () => withToken(token => api.getStock(token)),

    getProductStock: (id: string, movementsLimit = 20) =>
      withToken(token => api.getProductStock(token, id, movementsLimit)),

    createMovements: (movements: CreateMovementPayload[]) =>
      withToken(token => api.createMovements(token, movements)),

    getMovements: (params?: {
      productId?: string
      variantId?: string
      type?: string
      from?: string
      to?: string
      limit?: number
      offset?: number
    }) => withToken(token => api.getMovements(token, params)),

    getCustomers: (q?: string) =>
      withToken(token => api.getCustomers(token, q)),

    createCustomer: (data: CreateCustomerPayload) =>
      withToken(token => api.createCustomer(token, data)),

    updateCustomer: (
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
    ) => withToken(token => api.updateCustomer(token, id, data)),

    getSales: (params?: {
      status?: string
      customerId?: string
      from?: string
      to?: string
      limit?: number
      offset?: number
    }) => withToken(token => api.getSales(token, params)),

    getSale: (id: string) => withToken(token => api.getSale(token, id)),

    createSale: (data: CreateSalePayload) =>
      withToken(token => api.createSale(token, data)),

    addPayment: (saleId: string, data: CreatePaymentPayload) =>
      withToken(token => api.addPayment(token, saleId, data)),

    voidSale: (saleId: string) =>
      withToken(token => api.voidSale(token, saleId)),

    getReceivables: () => withToken(token => api.getReceivables(token)),
  }), [withToken])
}
