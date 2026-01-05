import type { AccountId } from '@shapeshiftoss/caip'
import type { Order } from '@shapeshiftoss/types'
import { useEffect, useMemo, useRef, useState } from 'react'

import { getGraphQLWsClient } from './client'
import { useLimitOrdersCacheUpdater } from './queries/useLimitOrdersQuery'

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

type SubscriptionResult = {
  isConnected: boolean
  error: Error | null
}

const LIMIT_ORDERS_SUBSCRIPTION = `
  subscription CowswapOrdersUpdated($accountIds: [String!]!) {
    cowswapOrdersUpdated(accountIds: $accountIds) {
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
`

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

/**
 * Hook that subscribes to real-time limit order updates via GraphQL subscription.
 * Updates are merged into React Query cache automatically.
 *
 * This hook does NOT fetch initial data - use useLimitOrdersGraphQLQuery for that.
 */
export function useLimitOrdersRealtimeSubscription(
  accountIds: AccountId[],
  skip = false,
): SubscriptionResult {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const { updateCache } = useLimitOrdersCacheUpdater(accountIds)

  const accountIdsKey = useMemo(() => accountIds.sort().join(','), [accountIds])

  useEffect(() => {
    if (skip || accountIds.length === 0) {
      setIsConnected(false)
      return
    }

    const wsClient = getGraphQLWsClient()

    unsubscribeRef.current = wsClient.subscribe<{ cowswapOrdersUpdated: OrdersUpdate }>(
      {
        query: LIMIT_ORDERS_SUBSCRIPTION,
        variables: { accountIds },
      },
      {
        next: data => {
          if (data.data?.cowswapOrdersUpdated) {
            const update = data.data.cowswapOrdersUpdated

            const mappedOrders = update.orders.map(cowOrder => ({
              order: mapCowSwapOrderToOrder(cowOrder),
              txHash: cowOrder.txHash,
            }))
            updateCache(update.accountId as AccountId, mappedOrders)
          }
        },
        error: err => {
          setError(err instanceof Error ? err : new Error('Subscription error'))
          setIsConnected(false)
        },
        complete: () => {
          setIsConnected(false)
        },
      },
    )

    setIsConnected(true)

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      setIsConnected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIdsKey, skip, updateCache])

  return { isConnected, error }
}
