import type { AccountId } from '@shapeshiftoss/caip'
import type { Order } from '@shapeshiftoss/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { getGraphQLClient } from '../client'

const LIMIT_ORDERS_QUERY = `
  query CowswapOrders($accountIds: [String!]!) {
    cowswap {
      orders(accountIds: $accountIds) {
        accountId
        orders {
          uid
          sellToken
          buyToken
          sellAmount
          buyAmount
          validTo
          appData
          feeAmount
          kind
          partiallyFillable
          sellTokenBalance
          buyTokenBalance
          signingScheme
          signature
          from
          receiver
          owner
          creationDate
          status
          executedSellAmount
          executedBuyAmount
          executedSellAmountBeforeFees
          executedFeeAmount
          invalidated
          fullAppData
          class
          txHash
        }
        timestamp
      }
    }
  }
`

type CowSwapOrder = {
  uid: string
  sellToken: string
  buyToken: string
  sellAmount: string
  buyAmount: string
  validTo: number
  appData: string
  feeAmount: string
  kind: string
  partiallyFillable: boolean
  sellTokenBalance: string
  buyTokenBalance: string
  signingScheme: string
  signature: string
  from: string
  receiver: string
  owner: string
  creationDate: string
  status: string
  executedSellAmount: string | null
  executedBuyAmount: string | null
  executedSellAmountBeforeFees: string | null
  executedFeeAmount: string | null
  invalidated: boolean
  fullAppData: string | null
  class: string
  txHash: string | null
}

type OrdersUpdate = {
  accountId: string
  orders: CowSwapOrder[]
  timestamp: number
}

export type OrderWithAccount = { order: Order; accountId: AccountId; txHash?: string | null }

function mapCowSwapOrderToOrder(cowOrder: CowSwapOrder): Order {
  return {
    uid: cowOrder.uid,
    sellToken: cowOrder.sellToken,
    buyToken: cowOrder.buyToken,
    sellAmount: cowOrder.sellAmount,
    buyAmount: cowOrder.buyAmount,
    validTo: cowOrder.validTo,
    appData: cowOrder.appData,
    feeAmount: cowOrder.feeAmount,
    kind: cowOrder.kind,
    partiallyFillable: cowOrder.partiallyFillable,
    sellTokenBalance: cowOrder.sellTokenBalance,
    buyTokenBalance: cowOrder.buyTokenBalance,
    signingScheme: cowOrder.signingScheme,
    signature: cowOrder.signature,
    from: cowOrder.from,
    receiver: cowOrder.receiver,
    owner: cowOrder.owner,
    creationDate: cowOrder.creationDate,
    status: cowOrder.status as Order['status'],
    executedSellAmount: cowOrder.executedSellAmount ?? '0',
    executedBuyAmount: cowOrder.executedBuyAmount ?? '0',
    executedSellAmountBeforeFees: cowOrder.executedSellAmountBeforeFees ?? '0',
    executedFeeAmount: cowOrder.executedFeeAmount ?? '0',
    invalidated: cowOrder.invalidated,
    fullAppData: cowOrder.fullAppData ?? undefined,
    class: cowOrder.class,
  } as Order
}

async function fetchLimitOrders(accountIds: AccountId[]): Promise<OrderWithAccount[]> {
  if (accountIds.length === 0) return []

  console.log('[fetchLimitOrders] Fetching orders for:', {
    accountIdsCount: accountIds.length,
    accountIds: accountIds.slice(0, 3),
  })

  const client = getGraphQLClient()
  const response = await client.request<{
    cowswap: {
      orders: OrdersUpdate[]
    }
  }>(LIMIT_ORDERS_QUERY, { accountIds })

  console.log('[fetchLimitOrders] Response received:', {
    ordersUpdatesCount: response.cowswap.orders.length,
    totalOrders: response.cowswap.orders.reduce((sum, u) => sum + u.orders.length, 0),
  })

  const result = response.cowswap.orders.flatMap(update =>
    update.orders.map(order => ({
      order: mapCowSwapOrderToOrder(order),
      accountId: update.accountId as AccountId,
      txHash: order.txHash,
    })),
  )

  console.log('[fetchLimitOrders] Mapped result:', {
    count: result.length,
    statuses: result
      .slice(0, 5)
      .map(o => ({ uid: o.order.uid.slice(0, 10), status: o.order.status })),
  })

  return result
}

export const LIMIT_ORDERS_QUERY_KEY = 'limit-orders'

export function useLimitOrdersGraphQLQuery(
  accountIds: AccountId[],
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false && accountIds.length > 0

  console.log('[useLimitOrdersGraphQLQuery] Query setup:', {
    accountIdsCount: accountIds.length,
    enabled,
  })

  return useQuery({
    queryKey: [LIMIT_ORDERS_QUERY_KEY, accountIds],
    queryFn: () => fetchLimitOrders(accountIds),
    enabled,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })
}

type OrderUpdate = { order: Order; txHash?: string | null }

export function useLimitOrdersCacheUpdater(accountIds: AccountId[]) {
  const queryClient = useQueryClient()

  const updateCache = useCallback(
    (accountId: AccountId, orders: OrderUpdate[]) => {
      console.log('[useLimitOrdersCacheUpdater] Updating cache:', {
        accountId,
        ordersCount: orders.length,
      })

      queryClient.setQueryData<OrderWithAccount[]>(
        [LIMIT_ORDERS_QUERY_KEY, accountIds],
        oldData => {
          if (!oldData) {
            console.log('[useLimitOrdersCacheUpdater] No existing data, creating new')
            return orders.map(({ order, txHash }) => ({ order, accountId, txHash }))
          }

          const otherOrders = oldData.filter(o => o.accountId !== accountId)
          const newOrders = orders.map(({ order, txHash }) => ({ order, accountId, txHash }))

          const merged = [...otherOrders, ...newOrders].sort(
            (a, b) =>
              new Date(b.order.creationDate).getTime() - new Date(a.order.creationDate).getTime(),
          )

          console.log('[useLimitOrdersCacheUpdater] Cache updated:', {
            previousCount: oldData.length,
            newCount: merged.length,
          })

          return merged
        },
      )
    },
    [queryClient, accountIds],
  )

  return { updateCache }
}
