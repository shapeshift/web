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
      }
      timestamp
    }
  }
`

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
        }
        timestamp
      }
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
    console.log('[useLimitOrdersSubscription] fetchInitialOrders called:', {
      accountIdsCount: accountIds.length,
      accountIds: accountIds.slice(0, 3),
    })

    if (accountIds.length === 0) {
      console.log('[useLimitOrdersSubscription] No account IDs, setting empty orders')
      setOrders([])
      setIsLoading(false)
      return
    }

    try {
      const wsClient = getGraphQLWsClient()
      console.log('[useLimitOrdersSubscription] Sending initial query via WebSocket')

      await new Promise<void>((resolve, reject) => {
        let result: OrdersUpdate[] = []

        wsClient.subscribe<{ cowswap: { orders: OrdersUpdate[] } }>(
          {
            query: LIMIT_ORDERS_QUERY,
            variables: { accountIds },
          },
          {
            next: data => {
              console.log('[useLimitOrdersSubscription] Initial query next:', {
                hasData: Boolean(data.data),
                hasCowswap: Boolean(data.data?.cowswap),
                hasOrders: Boolean(data.data?.cowswap?.orders),
                ordersLength: data.data?.cowswap?.orders?.length,
              })
              if (data.data?.cowswap?.orders) {
                result = data.data.cowswap.orders
              }
            },
            error: err => {
              console.error('[useLimitOrdersSubscription] Initial query error:', err)
              reject(err)
            },
            complete: () => {
              console.log('[useLimitOrdersSubscription] Initial query complete:', {
                resultLength: result.length,
                totalOrders: result.reduce((sum, u) => sum + u.orders.length, 0),
              })
              const mappedOrders = result.flatMap(update =>
                update.orders.map(order => ({
                  order: mapCowSwapOrderToOrder(order),
                  accountId: update.accountId as AccountId,
                })),
              )
              console.log('[useLimitOrdersSubscription] Mapped orders:', {
                count: mappedOrders.length,
                statuses: mappedOrders
                  .slice(0, 5)
                  .map(o => ({ uid: o.order.uid.slice(0, 10), status: o.order.status })),
              })
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
    console.log('[useLimitOrdersSubscription] useEffect triggered:', {
      skip,
      accountIdsCount: accountIds.length,
      accountIdsKey,
    })

    if (skip || accountIds.length === 0) {
      console.log('[useLimitOrdersSubscription] Skipping - no accounts or skip=true')
      setOrders([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetchInitialOrders()

    const wsClient = getGraphQLWsClient()
    console.log('[useLimitOrdersSubscription] Starting subscription for real-time updates')

    unsubscribeRef.current = wsClient.subscribe<{ cowswapOrdersUpdated: OrdersUpdate }>(
      {
        query: LIMIT_ORDERS_SUBSCRIPTION,
        variables: { accountIds },
      },
      {
        next: data => {
          console.log('[useLimitOrdersSubscription] Subscription next received:', {
            hasData: Boolean(data.data),
            hasCowswapOrdersUpdated: Boolean(data.data?.cowswapOrdersUpdated),
          })
          if (data.data?.cowswapOrdersUpdated) {
            const update = data.data.cowswapOrdersUpdated
            console.log('[useLimitOrdersSubscription] Subscription update:', {
              accountId: update.accountId,
              ordersCount: update.orders.length,
              statuses: update.orders
                .slice(0, 5)
                .map(o => ({ uid: o.uid.slice(0, 10), status: o.status })),
            })

            setOrders(prev => {
              const otherOrders = prev.filter(o => o.accountId !== update.accountId)
              const newOrders = update.orders.map(order => ({
                order: mapCowSwapOrderToOrder(order),
                accountId: update.accountId as AccountId,
              }))
              const merged = [...otherOrders, ...newOrders].sort(
                (a, b) =>
                  new Date(b.order.creationDate).getTime() -
                  new Date(a.order.creationDate).getTime(),
              )
              console.log('[useLimitOrdersSubscription] Orders updated:', {
                previousCount: prev.length,
                newCount: merged.length,
              })
              return merged
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
    console.log('[useLimitOrdersSubscription] Subscription established, isConnected=true')

    return () => {
      console.log('[useLimitOrdersSubscription] Cleanup - unsubscribing')
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
