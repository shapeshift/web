import type { AccountId } from '@shapeshiftoss/caip'
import type { Order } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getGraphQLWsClient } from './client'

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
}

type OrdersUpdate = {
  accountId: string
  orders: CowSwapOrder[]
  timestamp: number
}

type LimitOrdersSubscriptionResult = {
  data: { order: Order; accountId: AccountId }[] | undefined
  isLoading: boolean
  isConnected: boolean
  error: Error | null
}

const LIMIT_ORDERS_SUBSCRIPTION = `
  subscription LimitOrdersUpdated($accountIds: [String!]!) {
    limitOrdersUpdated(accountIds: $accountIds) {
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
      }
      timestamp
    }
  }
`

const LIMIT_ORDERS_QUERY = `
  query LimitOrders($accountIds: [String!]!) {
    limitOrders(accountIds: $accountIds) {
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

export function useLimitOrdersSubscription(
  accountIds: AccountId[],
  skip = false,
): LimitOrdersSubscriptionResult {
  const [orders, setOrders] = useState<{ order: Order; accountId: AccountId }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const accountIdsKey = useMemo(() => accountIds.sort().join(','), [accountIds])

  const fetchInitialOrders = useCallback(async () => {
    if (accountIds.length === 0) {
      setOrders([])
      setIsLoading(false)
      return
    }

    try {
      const wsClient = getGraphQLWsClient()

      await new Promise<void>((resolve, reject) => {
        let result: OrdersUpdate[] = []

        wsClient.subscribe<{ limitOrders: OrdersUpdate[] }>(
          {
            query: LIMIT_ORDERS_QUERY,
            variables: { accountIds },
          },
          {
            next: data => {
              if (data.data?.limitOrders) {
                result = data.data.limitOrders
              }
            },
            error: reject,
            complete: () => {
              const mappedOrders = result.flatMap(update =>
                update.orders.map(order => ({
                  order: mapCowSwapOrderToOrder(order),
                  accountId: update.accountId as AccountId,
                })),
              )
              setOrders(mappedOrders)
              setIsLoading(false)
              resolve()
            },
          },
        )
      })
    } catch (err) {
      console.error('[useLimitOrdersSubscription] Failed to fetch initial orders:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch orders'))
      setIsLoading(false)
    }
  }, [accountIds])

  useEffect(() => {
    if (skip || accountIds.length === 0) {
      setOrders([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetchInitialOrders()

    const wsClient = getGraphQLWsClient()

    unsubscribeRef.current = wsClient.subscribe<{ limitOrdersUpdated: OrdersUpdate }>(
      {
        query: LIMIT_ORDERS_SUBSCRIPTION,
        variables: { accountIds },
      },
      {
        next: data => {
          if (data.data?.limitOrdersUpdated) {
            const update = data.data.limitOrdersUpdated
            console.log('[useLimitOrdersSubscription] Received update for', update.accountId)

            setOrders(prev => {
              const otherOrders = prev.filter(o => o.accountId !== update.accountId)
              const newOrders = update.orders.map(order => ({
                order: mapCowSwapOrderToOrder(order),
                accountId: update.accountId as AccountId,
              }))
              return [...otherOrders, ...newOrders].sort(
                (a, b) =>
                  new Date(b.order.creationDate).getTime() -
                  new Date(a.order.creationDate).getTime(),
              )
            })
          }
        },
        error: err => {
          console.error('[useLimitOrdersSubscription] Subscription error:', err)
          setError(err instanceof Error ? err : new Error('Subscription error'))
          setIsConnected(false)
        },
        complete: () => {
          console.log('[useLimitOrdersSubscription] Subscription completed')
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
  }, [accountIdsKey, skip])

  const result = useMemo(
    () => ({
      data: orders.length > 0 ? orders : undefined,
      isLoading,
      isConnected,
      error,
    }),
    [orders, isLoading, isConnected, error],
  )

  return result
}
