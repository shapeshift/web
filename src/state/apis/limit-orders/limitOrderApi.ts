import { createApi } from '@reduxjs/toolkit/query'
import type { ChainId } from '@shapeshiftoss/caip'
import type { SwapperConfig } from '@shapeshiftoss/swapper'
import { getCowswapNetwork } from '@shapeshiftoss/swapper'
import { cowService } from '@shapeshiftoss/swapper/src/swappers/CowSwapper/utils/cowService'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import type {
  CancelLimitOrdersRequest,
  GetOrdersRequest,
  LimitOrder,
  LimitOrderRequest,
  Order,
  OrderStatusResponse,
  Trade,
} from './types'

export const limitOrderApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'limitOrderApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  tagTypes: ['LimitOrder'],
  endpoints: build => ({
    getLimitOrder: build.mutation<
      LimitOrder,
      { payload: LimitOrderRequest; config: SwapperConfig }
    >({
      queryFn: async ({ payload, config }) => {
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(payload.chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const maybeResult = await cowService.post<LimitOrder>(
          `${baseUrl}/${network}/api/v1/orders/`,
          payload,
        )
        if (maybeResult.isErr()) throw maybeResult.unwrapErr()
        const { data: order } = maybeResult.unwrap()
        return { data: order }
      },
    }),
    cancelLimitOrders: build.mutation<
      boolean,
      { payload: CancelLimitOrdersRequest; config: SwapperConfig }
    >({
      queryFn: async ({ payload, config }) => {
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(payload.chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const maybeResult = await cowService.delete<void>(
          `${baseUrl}/${network}/api/v1/orders/cancel`,
          payload,
        )
        if (maybeResult.isErr()) throw maybeResult.unwrapErr()
        // If the result is a 200 then the order was successfully canceled
        return { data: true }
      },
    }),
    getOrderStatus: build.query<
      OrderStatusResponse,
      { orderId: string; chainId: ChainId; config: SwapperConfig }
    >({
      queryFn: async ({ orderId, chainId, config }) => {
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const maybeResult = await cowService.get<OrderStatusResponse>(
          `${baseUrl}/${network}/api/v1/orders/${orderId}/status`,
        )
        if (maybeResult.isErr()) throw maybeResult.unwrapErr()
        const { data } = maybeResult.unwrap()
        return { data }
      },
    }),
    getTrades: build.query<
      Trade[],
      { config: SwapperConfig; chainId: ChainId } & ({ owner: string } | { orderUid: string })
    >({
      queryFn: async ({ config, chainId }) => {
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const maybeResult = await cowService.get<Trade[]>(`${baseUrl}/${network}/api/v1/trades`)
        if (maybeResult.isErr()) throw maybeResult.unwrapErr()
        const { data } = maybeResult.unwrap()
        return { data }
      },
    }),
    getOrders: build.query<Order[], { payload: GetOrdersRequest; config: SwapperConfig }>({
      queryFn: async ({ payload, config }) => {
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(payload.chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const maybeResult = await cowService.post<Order[]>(
          `${baseUrl}/${network}/api/v1/account/${payload.owner}/orders`,
          { limit: payload.limit, offset: payload.offset },
        )
        if (maybeResult.isErr()) throw maybeResult.unwrapErr()
        const { data } = maybeResult.unwrap()
        return { data }
      },
    }),
  }),
})
