import type { AxiosInstance } from 'axios'
import axios from 'axios'

import type {
  ActionDto,
  ProvidersResponse,
  YieldBalancesResponse,
  YieldDto,
  YieldsResponse,
  YieldValidatorsResponse,
} from './types'

import { getConfig } from '@/config'

const BASE_URL = getConfig().VITE_YIELD_XYZ_BASE_URL
const API_KEY = getConfig().VITE_YIELD_XYZ_API_KEY

const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json',
  },
})

export const fetchYields = async (params?: {
  network?: string
  networks?: string[]
  provider?: string
  limit?: number
  offset?: number
}) => {
  const { networks, ...restParams } = params ?? {}
  const queryParams: Record<string, string | number | undefined> = {
    ...restParams,
    ...(networks && { networks: networks.join(',') }),
  }
  const response = await instance.get<YieldsResponse>('/yields', { params: queryParams })
  return response.data
}

export const fetchYield = async (yieldId: string) => {
  const response = await instance.get<YieldDto>(`/yields/${yieldId}`)
  return response.data
}

export const fetchProviders = async (params?: { limit?: number; offset?: number }) => {
  const response = await instance.get<ProvidersResponse>('/providers', { params })
  return response.data
}

export const fetchAggregateBalances = async (
  queries: { address: string; network: string; yieldId?: string }[],
) => {
  const response = await instance.post<{
    items: YieldBalancesResponse[]
    errors: { query: (typeof queries)[0]; error: string }[]
  }>('/yields/balances', { queries })
  return response.data
}

export const fetchYieldValidators = async (yieldId: string) => {
  const response = await instance.get<YieldValidatorsResponse>(`/yields/${yieldId}/validators`)
  return response.data
}

export const enterYield = async ({
  yieldId,
  address,
  arguments: arguments_,
}: {
  yieldId: string
  address: string
  arguments: Record<string, unknown>
}) => {
  const response = await instance.post<ActionDto>('/actions/enter', {
    yieldId,
    address,
    arguments: arguments_,
  })
  return response.data
}

export const exitYield = async ({
  yieldId,
  address,
  arguments: arguments_,
}: {
  yieldId: string
  address: string
  arguments: Record<string, unknown>
}) => {
  const response = await instance.post<ActionDto>('/actions/exit', {
    yieldId,
    address,
    arguments: arguments_,
  })
  return response.data
}

export const manageYield = async ({
  yieldId,
  address,
  action,
  passthrough,
  arguments: arguments_,
}: {
  yieldId: string
  address: string
  action: string
  passthrough: string
  arguments?: Record<string, unknown>
}) => {
  const response = await instance.post<ActionDto>('/actions/manage', {
    yieldId,
    address,
    action,
    passthrough,
    arguments: arguments_,
  })
  return response.data
}

export const fetchAction = async (actionId: string) => {
  const response = await instance.get<ActionDto>(`/actions/${actionId}`)
  return response.data
}

export const submitTransactionHash = async ({
  transactionId,
  hash,
}: {
  transactionId: string
  hash: string
}) => {
  const response = await instance.put(`/transactions/${transactionId}/submit-hash`, { hash })
  return response.data
}
