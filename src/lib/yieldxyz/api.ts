import type { AxiosInstance } from 'axios'
import axios from 'axios'

import type {
  ActionDto,
  ActionsResponse,
  NetworksResponse,
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

// Discovery
export const getYields = (params?: {
  network?: string
  provider?: string
  limit?: number
  offset?: number
}): Promise<YieldsResponse> => {
  return instance.get<YieldsResponse>('/yields', { params }).then(res => res.data)
}

export const getYield = (yieldId: string): Promise<YieldDto> => {
  return instance.get<YieldDto>(`/yields/${yieldId}`).then(res => res.data)
}

export const getNetworks = (): Promise<NetworksResponse> => {
  return instance.get<NetworksResponse>('/networks').then(res => res.data)
}

export const getProviders = (params?: {
  limit?: number
  offset?: number
}): Promise<ProvidersResponse> => {
  return instance.get<ProvidersResponse>('/providers', { params }).then(res => res.data)
}

// Balances
export const getYieldBalances = (yieldId: string, address: string): Promise<YieldBalancesResponse> => {
  return instance
    .get<YieldBalancesResponse>(`/yields/${yieldId}/balances`, { params: { address } })
    .then(res => res.data)
}

export const getAggregateBalances = (
  queries: { address: string; network: string; yieldId?: string }[],
): Promise<{
  items: YieldBalancesResponse[]
  errors: { query: (typeof queries)[0]; error: string }[]
}> => {
  return instance.post('/yields/balances', { queries }).then(res => res.data)
}

export const getYieldValidators = (yieldId: string): Promise<YieldValidatorsResponse> => {
  return instance.get<YieldValidatorsResponse>(`/yields/${yieldId}/validators`).then(res => res.data)
}

// Actions
export const enterYield = (
  yieldId: string,
  address: string,
  arguments_: Record<string, unknown>,
): Promise<ActionDto> => {
  return instance
    .post<ActionDto>('/actions/enter', {
      yieldId,
      address,
      arguments: arguments_,
    })
    .then(res => res.data)
}

export const exitYield = (
  yieldId: string,
  address: string,
  arguments_: Record<string, unknown>,
): Promise<ActionDto> => {
  return instance
    .post<ActionDto>('/actions/exit', {
      yieldId,
      address,
      arguments: arguments_,
    })
    .then(res => res.data)
}

export const manageYield = (
  yieldId: string,
  address: string,
  action: string,
  passthrough: string,
  arguments_?: Record<string, unknown>,
): Promise<ActionDto> => {
  return instance
    .post<ActionDto>('/actions/manage', {
      yieldId,
      address,
      action,
      passthrough,
      arguments: arguments_,
    })
    .then(res => res.data)
}

export const getActions = (params: {
  address: string
  limit?: number
  offset?: number
  status?: string
  intent?: string
}): Promise<ActionsResponse> => {
  return instance.get<ActionsResponse>('/actions', { params }).then(res => res.data)
}

// Transaction Submission
export const submitTransaction = (transactionId: string, signedTransaction: string): Promise<void> => {
  return instance
    .post(`/transactions/${transactionId}/submit`, { signedTransaction })
    .then(res => res.data)
}

export const submitTransactionHash = (transactionId: string, hash: string): Promise<void> => {
  return instance
    .put(`/transactions/${transactionId}/submit-hash`, { hash })
    .then(res => res.data)
}
