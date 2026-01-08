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

export const fetchYields = (params?: {
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
  return instance.get<YieldsResponse>('/yields', { params: queryParams }).then(res => res.data)
}

export const fetchYield = (yieldId: string) =>
  instance.get<YieldDto>(`/yields/${yieldId}`).then(res => res.data)

export const fetchNetworks = () => instance.get<NetworksResponse>('/networks').then(res => res.data)

export const fetchProviders = (params?: { limit?: number; offset?: number }) =>
  instance.get<ProvidersResponse>('/providers', { params }).then(res => res.data)

export const fetchYieldBalances = (yieldId: string, address: string) =>
  instance
    .get<YieldBalancesResponse>(`/yields/${yieldId}/balances`, { params: { address } })
    .then(res => res.data)

export const fetchAggregateBalances = (
  queries: { address: string; network: string; yieldId?: string }[],
) =>
  instance
    .post<{
      items: YieldBalancesResponse[]
      errors: { query: (typeof queries)[0]; error: string }[]
    }>('/yields/balances', { queries })
    .then(res => res.data)

export const fetchYieldValidators = (yieldId: string) =>
  instance.get<YieldValidatorsResponse>(`/yields/${yieldId}/validators`).then(res => res.data)

export const enterYield = (yieldId: string, address: string, arguments_: Record<string, unknown>) =>
  instance
    .post<ActionDto>('/actions/enter', { yieldId, address, arguments: arguments_ })
    .then(res => res.data)

export const exitYield = (yieldId: string, address: string, arguments_: Record<string, unknown>) =>
  instance
    .post<ActionDto>('/actions/exit', { yieldId, address, arguments: arguments_ })
    .then(res => res.data)

export const manageYield = (
  yieldId: string,
  address: string,
  action: string,
  passthrough: string,
  arguments_?: Record<string, unknown>,
) =>
  instance
    .post<ActionDto>('/actions/manage', {
      yieldId,
      address,
      action,
      passthrough,
      arguments: arguments_,
    })
    .then(res => res.data)

export const fetchActions = (params: {
  address: string
  limit?: number
  offset?: number
  status?: string
  intent?: string
}) => instance.get<ActionsResponse>('/actions', { params }).then(res => res.data)

export const submitTransaction = (transactionId: string, signedTransaction: string) =>
  instance
    .post(`/transactions/${transactionId}/submit`, { signedTransaction })
    .then(res => res.data)

export const submitTransactionHash = (transactionId: string, hash: string) =>
  instance.put(`/transactions/${transactionId}/submit-hash`, { hash }).then(res => res.data)
