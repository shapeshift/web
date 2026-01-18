import { useCallback, useEffect, useRef, useState } from 'react'

import type { UnsubscribeFn } from '@/lib/hyperliquid/client'
import { fetchL2Book, subscribeToL2Book } from '@/lib/hyperliquid/client'
import {
  HYPERLIQUID_DEFAULT_ORDERBOOK_LEVELS,
  HYPERLIQUID_RECONNECT_DELAY_BASE_MS,
  HYPERLIQUID_RECONNECT_DELAY_MAX_MS,
} from '@/lib/hyperliquid/constants'
import type { L2BookData, ParsedOrderbook, WsSubscriptionType } from '@/lib/hyperliquid/types'
import { parseOrderbook } from '@/lib/hyperliquid/utils'
import { perpsSlice } from '@/state/slices/perpsSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const ORDERBOOK_SUBSCRIPTION_TYPE: WsSubscriptionType = 'l2Book'

type UseOrderbookConfig = {
  coin: string | null
  autoSubscribe?: boolean
  maxLevels?: number
  nSigFigs?: number
}

type UseOrderbookResult = {
  orderbook: ParsedOrderbook | null
  isLoading: boolean
  isConnected: boolean
  error: string | undefined
  subscribe: () => void
  unsubscribe: () => void
  refetch: () => Promise<void>
}

const DEFAULT_CONFIG: UseOrderbookConfig = {
  coin: null,
  autoSubscribe: true,
  maxLevels: HYPERLIQUID_DEFAULT_ORDERBOOK_LEVELS,
  nSigFigs: undefined,
}

export const useOrderbook = (config: UseOrderbookConfig): UseOrderbookResult => {
  const {
    coin,
    autoSubscribe = DEFAULT_CONFIG.autoSubscribe,
    maxLevels = DEFAULT_CONFIG.maxLevels,
    nSigFigs = DEFAULT_CONFIG.nSigFigs,
  } = config

  const dispatch = useAppDispatch()

  const orderbook = useAppSelector(perpsSlice.selectors.selectOrderbook)
  const isLoading = useAppSelector(perpsSlice.selectors.selectOrderbookLoading)
  const error = useAppSelector(perpsSlice.selectors.selectOrderbookError)

  const [isConnected, setIsConnected] = useState(false)

  const unsubscribeRef = useRef<UnsubscribeFn | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSubscribedRef = useRef(false)
  const coinRef = useRef(coin)
  const subscribeInternalRef = useRef<() => void>(() => {})

  coinRef.current = coin

  const handleL2BookUpdate = useCallback(
    (data: L2BookData) => {
      if (data.coin !== coinRef.current) return

      const parsed = parseOrderbook(data, maxLevels)
      dispatch(perpsSlice.actions.setOrderbook(parsed))
      setIsConnected(true)
      reconnectAttemptRef.current = 0
    },
    [dispatch, maxLevels],
  )

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (!isSubscribedRef.current || !coinRef.current) return

    clearReconnectTimeout()

    const delay = Math.min(
      HYPERLIQUID_RECONNECT_DELAY_BASE_MS * Math.pow(2, reconnectAttemptRef.current),
      HYPERLIQUID_RECONNECT_DELAY_MAX_MS,
    )

    reconnectAttemptRef.current += 1

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isSubscribedRef.current && coinRef.current) {
        subscribeInternalRef.current()
      }
    }, delay)
  }, [clearReconnectTimeout])

  const subscribeInternal = useCallback(() => {
    if (!coinRef.current) return

    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    try {
      dispatch(perpsSlice.actions.setOrderbookLoading(true))

      const subscriptionParams: { coin: string; nSigFigs?: number } = { coin: coinRef.current }
      if (nSigFigs !== undefined) {
        subscriptionParams.nSigFigs = nSigFigs
      }

      unsubscribeRef.current = subscribeToL2Book(subscriptionParams, handleL2BookUpdate)
      isSubscribedRef.current = true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to orderbook'
      dispatch(perpsSlice.actions.setOrderbookError(errorMessage))
      setIsConnected(false)
      scheduleReconnect()
    }
  }, [dispatch, handleL2BookUpdate, nSigFigs, scheduleReconnect])

  subscribeInternalRef.current = subscribeInternal

  const subscribe = useCallback(() => {
    if (!coin) {
      dispatch(perpsSlice.actions.setOrderbookError('No coin selected'))
      return
    }

    isSubscribedRef.current = true
    reconnectAttemptRef.current = 0
    subscribeInternal()
  }, [coin, dispatch, subscribeInternal])

  const unsubscribe = useCallback(() => {
    isSubscribedRef.current = false
    clearReconnectTimeout()

    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    setIsConnected(false)
  }, [clearReconnectTimeout])

  const refetch = useCallback(async (): Promise<void> => {
    if (!coin) return

    dispatch(perpsSlice.actions.setOrderbookLoading(true))

    try {
      const params: { coin: string; nSigFigs?: number } = { coin }
      if (nSigFigs !== undefined) {
        params.nSigFigs = nSigFigs
      }

      const data = await fetchL2Book(params)
      const parsed = parseOrderbook(data, maxLevels)
      dispatch(perpsSlice.actions.setOrderbook(parsed))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orderbook'
      dispatch(perpsSlice.actions.setOrderbookError(errorMessage))
    }
  }, [coin, dispatch, maxLevels, nSigFigs])

  useEffect(() => {
    if (autoSubscribe && coin) {
      subscribe()
    }

    return () => {
      unsubscribe()
    }
  }, [coin, autoSubscribe, subscribe, unsubscribe])

  useEffect(() => {
    return () => {
      clearReconnectTimeout()
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [clearReconnectTimeout])

  return {
    orderbook,
    isLoading,
    isConnected,
    error,
    subscribe,
    unsubscribe,
    refetch,
  }
}

export type { UseOrderbookConfig, UseOrderbookResult }
