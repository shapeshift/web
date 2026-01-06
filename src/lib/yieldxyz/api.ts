import type {
  ActionDto,
  ActionsResponse,
  NetworksResponse,
  ProvidersResponse,
  YieldBalancesResponse,
  YieldDto,
  YieldsResponse,
} from './types'

import { getConfig } from '@/config'

const BASE_URL = getConfig().VITE_YIELD_XYZ_BASE_URL
const API_KEY = getConfig().VITE_YIELD_XYZ_API_KEY

const headers = {
  'X-API-KEY': API_KEY,
  'Content-Type': 'application/json',
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Yield.xyz API error: ${response.status} - ${error}`)
  }
  return response.json()
}

export const yieldxyzApi = {
  // Discovery
  async getYields(params?: {
    network?: string
    provider?: string
    limit?: number
    offset?: number
  }): Promise<YieldsResponse> {
    const searchParams = new URLSearchParams()
    if (params?.network) searchParams.set('network', params.network)
    if (params?.provider) searchParams.set('provider', params.provider)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))

    const response = await fetch(`${BASE_URL}/yields?${searchParams}`, { headers })
    return handleResponse(response)
  },

  async getYield(yieldId: string): Promise<YieldDto> {
    const response = await fetch(`${BASE_URL}/yields/${yieldId}`, { headers })
    return handleResponse(response)
  },

  async getNetworks(): Promise<NetworksResponse> {
    const response = await fetch(`${BASE_URL}/networks`, { headers })
    return handleResponse(response)
  },

  async getProviders(): Promise<ProvidersResponse> {
    const response = await fetch(`${BASE_URL}/providers`, { headers })
    return handleResponse(response)
  },

  // Balances
  async getYieldBalances(yieldId: string, address: string): Promise<YieldBalancesResponse> {
    const response = await fetch(`${BASE_URL}/yields/${yieldId}/balances?address=${address}`, {
      headers,
    })
    return handleResponse(response)
  },

  async getAggregateBalances(
    queries: { address: string; network: string; yieldId?: string }[],
  ): Promise<{
    items: YieldBalancesResponse[]
    errors: { query: (typeof queries)[0]; error: string }[]
  }> {
    const response = await fetch(`${BASE_URL}/yields/balances`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ queries }),
    })
    return handleResponse(response)
  },

  // Actions
  async enterYield(
    yieldId: string,
    address: string,
    arguments_: Record<string, unknown>,
  ): Promise<ActionDto> {
    const response = await fetch(`${BASE_URL}/actions/enter`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ yieldId, address, arguments: arguments_ }),
    })
    return handleResponse(response)
  },

  async exitYield(
    yieldId: string,
    address: string,
    arguments_: Record<string, unknown>,
  ): Promise<ActionDto> {
    const response = await fetch(`${BASE_URL}/actions/exit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ yieldId, address, arguments: arguments_ }),
    })
    return handleResponse(response)
  },

  async manageYield(
    yieldId: string,
    address: string,
    action: string,
    passthrough: string,
    arguments_?: Record<string, unknown>,
  ): Promise<ActionDto> {
    const response = await fetch(`${BASE_URL}/actions/manage`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ yieldId, address, action, passthrough, arguments: arguments_ }),
    })
    return handleResponse(response)
  },

  async getActions(params: {
    address: string
    limit?: number
    offset?: number
    status?: string
    intent?: string
  }): Promise<ActionsResponse> {
    const searchParams = new URLSearchParams({ address: params.address })
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.offset) searchParams.set('offset', String(params.offset))
    if (params.status) searchParams.set('status', params.status)
    if (params.intent) searchParams.set('intent', params.intent)

    const response = await fetch(`${BASE_URL}/actions?${searchParams}`, { headers })
    return handleResponse(response)
  },

  // Transaction Submission
  async submitTransaction(transactionId: string, signedTransaction: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/transactions/${transactionId}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ signedTransaction }),
    })
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to submit transaction: ${response.status} - ${error}`)
    }
  },

  async submitTransactionHash(transactionId: string, hash: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/transactions/${transactionId}/submit-hash`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ hash }),
    })
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to submit transaction hash: ${response.status} - ${error}`)
    }
  },
}
