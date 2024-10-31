import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { ChainId } from '@shapeshiftoss/caip'
import type { CowSwapQuoteError } from '@shapeshiftoss/swapper'
import { CowSwapQuoteErrorType, getCowswapNetwork, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import type {
  CancelLimitOrdersRequest,
  CompetitionOrderStatus,
  GetOrdersRequest,
  LimitOrder,
  LimitOrderId,
  LimitOrderQuoteRequest,
  Order,
  Trade,
} from './types'

export const limitOrderApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'limitOrderApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  tagTypes: ['LimitOrder'],
  endpoints: build => ({
    quoteLimitOrder: build.query<
      LimitOrder,
      { limitOrderQuoteRequest: LimitOrderQuoteRequest; chainId: ChainId }
    >({
      queryFn: async ({ limitOrderQuoteRequest, chainId }) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()

        try {
          const result = await axios.post<LimitOrder>(
            `${baseUrl}/${network}/api/v1/quote/`,
            limitOrderQuoteRequest,
          )
          const order = result.data
          return { data: order }
        } catch (e) {
          const axiosError = e as AxiosError

          const maybeCowSwapError = axiosError.response?.data as CowSwapQuoteError | undefined

          const errorData = (() => {
            switch (maybeCowSwapError?.errorType) {
              case CowSwapQuoteErrorType.ZeroAmount:
                return TradeQuoteError.SellAmountBelowMinimum
              case CowSwapQuoteErrorType.SellAmountDoesNotCoverFee:
                return TradeQuoteError.SellAmountBelowTradeFee
              case CowSwapQuoteErrorType.UnsupportedToken:
                return TradeQuoteError.UnsupportedTradePair
              default:
                return TradeQuoteError.UnknownError
            }
          })()

          return { error: { data: errorData } }
        }
      },
    }),
    placeLimitOrder: build.mutation<LimitOrderId, { limitOrder: LimitOrder; chainId: ChainId }>({
      queryFn: async ({ limitOrder, chainId }) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const result = await axios.post<LimitOrderId>(
          `${baseUrl}/${network}/api/v1/orders/`,
          limitOrder,
        )
        const order = result.data
        return { data: order }
      },
    }),
    cancelLimitOrders: build.mutation<
      boolean,
      { payload: CancelLimitOrdersRequest; chainId: ChainId }
    >({
      queryFn: async ({ payload, chainId }) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const result = await axios.delete<void>(`${baseUrl}/${network}/api/v1/orders`, {
          data: payload,
        })
        // If the result is a 200 then the order was successfully canceled
        return { data: result.status === 200 }
      },
    }),
    getOrderStatus: build.query<
      CompetitionOrderStatus,
      { orderId: LimitOrderId; chainId: ChainId }
    >({
      queryFn: async ({ orderId, chainId }) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const result = await axios.get<CompetitionOrderStatus>(
          `${baseUrl}/${network}/api/v1/orders/${orderId}/status`,
        )
        return { data: result.data }
      },
    }),
    getTrades: build.query<Trade[], { chainId: ChainId } & { owner: string }>({
      queryFn: async ({ owner, chainId }) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const result = await axios.get<Trade[]>(
          `${baseUrl}/${network}/api/v1/trades?owner=${owner}`,
        )
        return { data: result.data }
      },
    }),
    getOrders: build.query<Order[], { payload: GetOrdersRequest }>({
      queryFn: async ({ payload }) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(payload.chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const result = await axios.post<Order[]>(
          `${baseUrl}/${network}/api/v1/account/${payload.owner}/orders`,
          { limit: payload.limit, offset: payload.offset },
        )
        return { data: result.data }
      },
    }),
  }),
})

export const { useQuoteLimitOrderQuery } = limitOrderApi
