import { useCallback, useEffect, useRef, useState } from 'react'

import type { UnsubscribeFn } from '@/lib/hyperliquid/client'
import {
  fetchClearinghouseState,
  fetchOpenOrders,
  placeOrder,
  subscribeToOrderUpdates,
  subscribeToUserFills,
} from '@/lib/hyperliquid/client'
import {
  HYPERLIQUID_RECONNECT_DELAY_BASE_MS,
  HYPERLIQUID_RECONNECT_DELAY_MAX_MS,
} from '@/lib/hyperliquid/constants'
import type { ClearinghouseState, Fill, OpenOrder, ParsedPosition } from '@/lib/hyperliquid/types'
import { PositionSide } from '@/lib/hyperliquid/types'
import { buildLimitOrderType, buildOrderRequest } from '@/lib/hyperliquid/utils'
import { perpsSlice } from '@/state/slices/perpsSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type UsePositionsConfig = {
  userAddress: string | undefined
  autoFetch?: boolean
  autoSubscribe?: boolean
  pollingInterval?: number
}

type UsePositionsResult = {
  positions: ParsedPosition[]
  openOrders: OpenOrder[]
  accountState: ClearinghouseState | null
  isLoading: boolean
  isSubscribed: boolean
  error: string | undefined
  refetch: () => Promise<void>
  closePosition: (coin: string, assetIndex: number) => Promise<void>
  subscribe: () => void
  unsubscribe: () => void
}

const DEFAULT_CONFIG: UsePositionsConfig = {
  userAddress: undefined,
  autoFetch: true,
  autoSubscribe: true,
  pollingInterval: 30000,
}

const parseClearinghouseStateToPositions = (state: ClearinghouseState): ParsedPosition[] => {
  return state.assetPositions
    .filter(ap => parseFloat(ap.position.szi) !== 0)
    .map(ap => {
      const szi = parseFloat(ap.position.szi)
      return {
        coin: ap.position.coin,
        side: szi > 0 ? PositionSide.Long : PositionSide.Short,
        size: Math.abs(szi).toString(),
        sizeUsd: ap.position.positionValue,
        entryPrice: ap.position.entryPx,
        markPrice: ap.position.entryPx,
        liquidationPrice: ap.position.liquidationPx,
        leverage: ap.position.leverage.value,
        leverageType: ap.position.leverage.type,
        unrealizedPnl: ap.position.unrealizedPnl,
        unrealizedPnlPercent: ap.position.returnOnEquity,
        marginUsed: ap.position.marginUsed,
        fundingAccrued: ap.position.cumFunding.sinceOpen,
      }
    })
}

export const usePositions = (config: UsePositionsConfig): UsePositionsResult => {
  const {
    userAddress,
    autoFetch = DEFAULT_CONFIG.autoFetch,
    autoSubscribe = DEFAULT_CONFIG.autoSubscribe,
    pollingInterval = DEFAULT_CONFIG.pollingInterval,
  } = config

  const dispatch = useAppDispatch()

  const positions = useAppSelector(perpsSlice.selectors.selectPositions)
  const openOrders = useAppSelector(perpsSlice.selectors.selectOpenOrders)
  const accountState = useAppSelector(perpsSlice.selectors.selectAccountState)
  const positionsLoading = useAppSelector(perpsSlice.selectors.selectPositionsLoading)
  const accountStateLoading = useAppSelector(perpsSlice.selectors.selectAccountStateLoading)
  const positionsError = useAppSelector(perpsSlice.selectors.selectPositionsError)
  const accountStateError = useAppSelector(perpsSlice.selectors.selectAccountStateError)

  const [isSubscribed, setIsSubscribed] = useState(false)

  const unsubscribeFillsRef = useRef<UnsubscribeFn | null>(null)
  const unsubscribeOrdersRef = useRef<UnsubscribeFn | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const userAddressRef = useRef(userAddress)
  const subscribeInternalRef = useRef<() => void>(() => {})

  userAddressRef.current = userAddress

  const isLoading = positionsLoading || accountStateLoading
  const error = positionsError ?? accountStateError

  const fetchPositionsData = useCallback(async (): Promise<void> => {
    const address = userAddressRef.current
    if (!address) {
      return
    }

    dispatch(perpsSlice.actions.setAccountStateLoading(true))
    dispatch(perpsSlice.actions.setPositionsLoading(true))
    dispatch(perpsSlice.actions.setOpenOrdersLoading(true))

    try {
      const [clearinghouseState, orders]: [ClearinghouseState, OpenOrder[]] = await Promise.all([
        fetchClearinghouseState({ user: address }),
        fetchOpenOrders({ user: address }),
      ])

      dispatch(perpsSlice.actions.setAccountState(clearinghouseState))
      dispatch(perpsSlice.actions.setOpenOrders(orders))

      const parsedPositions = parseClearinghouseStateToPositions(clearinghouseState)
      dispatch(perpsSlice.actions.setPositions(parsedPositions))

      reconnectAttemptRef.current = 0
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch positions data'
      dispatch(perpsSlice.actions.setAccountStateError(errorMessage))
      dispatch(perpsSlice.actions.setPositionsError(errorMessage))
      dispatch(perpsSlice.actions.setOpenOrdersError(errorMessage))
    }
  }, [dispatch])

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const clearPollingInterval = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (!userAddressRef.current) return

    clearReconnectTimeout()

    const delay = Math.min(
      HYPERLIQUID_RECONNECT_DELAY_BASE_MS * Math.pow(2, reconnectAttemptRef.current),
      HYPERLIQUID_RECONNECT_DELAY_MAX_MS,
    )

    reconnectAttemptRef.current += 1

    reconnectTimeoutRef.current = setTimeout(() => {
      if (userAddressRef.current) {
        subscribeInternalRef.current()
      }
    }, delay)
  }, [clearReconnectTimeout])

  const handleUserFill = useCallback(
    (fill: Fill) => {
      if (fill.coin) {
        fetchPositionsData()
      }
    },
    [fetchPositionsData],
  )

  const handleOrderUpdate = useCallback(
    (update: { order: OpenOrder; status: string; statusTimestamp: number }) => {
      if (update.status === 'filled' || update.status === 'canceled' || update.status === 'open') {
        fetchPositionsData()
      }
    },
    [fetchPositionsData],
  )

  const subscribeInternal = useCallback(() => {
    const address = userAddressRef.current
    if (!address) return

    if (unsubscribeFillsRef.current) {
      unsubscribeFillsRef.current()
      unsubscribeFillsRef.current = null
    }

    if (unsubscribeOrdersRef.current) {
      unsubscribeOrdersRef.current()
      unsubscribeOrdersRef.current = null
    }

    try {
      unsubscribeFillsRef.current = subscribeToUserFills({ user: address }, handleUserFill)

      unsubscribeOrdersRef.current = subscribeToOrderUpdates({ user: address }, handleOrderUpdate)

      setIsSubscribed(true)
      reconnectAttemptRef.current = 0
    } catch (err) {
      setIsSubscribed(false)
      scheduleReconnect()
    }
  }, [handleUserFill, handleOrderUpdate, scheduleReconnect])

  subscribeInternalRef.current = subscribeInternal

  const subscribe = useCallback(() => {
    if (!userAddress) {
      return
    }

    reconnectAttemptRef.current = 0
    subscribeInternal()
  }, [userAddress, subscribeInternal])

  const unsubscribe = useCallback(() => {
    clearReconnectTimeout()
    clearPollingInterval()

    if (unsubscribeFillsRef.current) {
      unsubscribeFillsRef.current()
      unsubscribeFillsRef.current = null
    }

    if (unsubscribeOrdersRef.current) {
      unsubscribeOrdersRef.current()
      unsubscribeOrdersRef.current = null
    }

    setIsSubscribed(false)
  }, [clearReconnectTimeout, clearPollingInterval])

  const closePosition = useCallback(
    async (coin: string, assetIndex: number): Promise<void> => {
      const position = positions.find(p => p.coin === coin)
      if (!position) {
        throw new Error(`Position for ${coin} not found`)
      }

      const isBuy = position.side === PositionSide.Short
      const slippage = 0.01
      const entryPrice = parseFloat(position.entryPrice)
      const price = isBuy
        ? (entryPrice * (1 + slippage)).toFixed(6)
        : (entryPrice * (1 - slippage)).toFixed(6)

      const orderRequest = buildOrderRequest({
        assetIndex,
        isBuy,
        price,
        size: position.size,
        reduceOnly: true,
        orderType: buildLimitOrderType(),
      })

      const response = await placeOrder({
        orders: [orderRequest],
        grouping: 'na',
      })

      if (response.status === 'err') {
        throw new Error('Failed to close position')
      }

      const orderStatus = response.response?.data?.statuses?.[0]
      if (orderStatus?.error) {
        throw new Error(orderStatus.error)
      }

      await fetchPositionsData()
    },
    [positions, fetchPositionsData],
  )

  useEffect(() => {
    if (autoFetch && userAddress) {
      fetchPositionsData()
    }
  }, [autoFetch, userAddress, fetchPositionsData])

  useEffect(() => {
    if (autoSubscribe && userAddress) {
      subscribe()

      if (pollingInterval > 0) {
        pollingIntervalRef.current = setInterval(() => {
          if (userAddressRef.current) {
            fetchPositionsData()
          }
        }, pollingInterval)
      }
    }

    return () => {
      unsubscribe()
    }
  }, [userAddress, autoSubscribe, pollingInterval, fetchPositionsData, subscribe, unsubscribe])

  useEffect(() => {
    return () => {
      clearReconnectTimeout()
      clearPollingInterval()
      if (unsubscribeFillsRef.current) {
        unsubscribeFillsRef.current()
        unsubscribeFillsRef.current = null
      }
      if (unsubscribeOrdersRef.current) {
        unsubscribeOrdersRef.current()
        unsubscribeOrdersRef.current = null
      }
    }
  }, [clearReconnectTimeout, clearPollingInterval])

  return {
    positions,
    openOrders,
    accountState,
    isLoading,
    isSubscribed,
    error,
    refetch: fetchPositionsData,
    closePosition,
    subscribe,
    unsubscribe,
  }
}

export type { UsePositionsConfig, UsePositionsResult }
