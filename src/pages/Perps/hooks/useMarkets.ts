import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { UnsubscribeFn } from '@/lib/hyperliquid/client'
import { fetchMetaAndAssetCtxs, subscribeToAllMids } from '@/lib/hyperliquid/client'
import {
  HYPERLIQUID_DEFAULT_MARKET,
  HYPERLIQUID_POLL_INTERVAL_MS,
  HYPERLIQUID_RECONNECT_DELAY_BASE_MS,
  HYPERLIQUID_RECONNECT_DELAY_MAX_MS,
} from '@/lib/hyperliquid/constants'
import type { AugmentedMarket, MetaAndAssetCtxs } from '@/lib/hyperliquid/types'
import {
  parseMetaToMarkets,
  searchMarkets,
  sortMarketsByName,
  sortMarketsByVolume,
} from '@/lib/hyperliquid/utils'
import { perpsSlice } from '@/state/slices/perpsSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type MarketSortBy = 'volume' | 'name' | 'priceChange'

type UseMarketsConfig = {
  autoFetch?: boolean
  autoSubscribe?: boolean
  pollingInterval?: number
  defaultMarket?: string
}

type UseMarketsResult = {
  markets: AugmentedMarket[]
  filteredMarkets: AugmentedMarket[]
  selectedMarket: AugmentedMarket | undefined
  isLoading: boolean
  isSubscribed: boolean
  error: string | undefined
  searchQuery: string
  sortBy: MarketSortBy
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: MarketSortBy) => void
  selectMarket: (coin: string) => void
  refetch: () => Promise<void>
  subscribe: () => void
  unsubscribe: () => void
}

const DEFAULT_CONFIG: Required<UseMarketsConfig> = {
  autoFetch: true,
  autoSubscribe: true,
  pollingInterval: HYPERLIQUID_POLL_INTERVAL_MS,
  defaultMarket: HYPERLIQUID_DEFAULT_MARKET,
}

const sortMarketsByPriceChange = (markets: AugmentedMarket[]): AugmentedMarket[] => {
  return [...markets].sort((a, b) => {
    const aChange = Math.abs(parseFloat(a.priceChangePercent24h) || 0)
    const bChange = Math.abs(parseFloat(b.priceChangePercent24h) || 0)
    return bChange - aChange
  })
}

export const useMarkets = (config: UseMarketsConfig = {}): UseMarketsResult => {
  const {
    autoFetch = DEFAULT_CONFIG.autoFetch,
    autoSubscribe = DEFAULT_CONFIG.autoSubscribe,
    pollingInterval = DEFAULT_CONFIG.pollingInterval,
    defaultMarket = DEFAULT_CONFIG.defaultMarket,
  } = config

  const dispatch = useAppDispatch()

  const markets = useAppSelector(perpsSlice.selectors.selectMarkets)
  const isLoading = useAppSelector(perpsSlice.selectors.selectMarketsLoading)
  const error = useAppSelector(perpsSlice.selectors.selectMarketsError)
  const selectedMarketCoin = useAppSelector(perpsSlice.selectors.selectSelectedMarket)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<MarketSortBy>('volume')
  const [isSubscribed, setIsSubscribed] = useState(false)

  const unsubscribeRef = useRef<UnsubscribeFn | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const marketsRef = useRef<AugmentedMarket[]>([])
  const subscribeInternalRef = useRef<() => void>(() => {})

  marketsRef.current = markets

  const fetchMarketsData = useCallback(async (): Promise<void> => {
    dispatch(perpsSlice.actions.setMarketsLoading(true))

    try {
      const metaAndAssetCtxs: MetaAndAssetCtxs = await fetchMetaAndAssetCtxs()
      const parsedMarkets = parseMetaToMarkets(metaAndAssetCtxs)
      dispatch(perpsSlice.actions.setMarkets(parsedMarkets))

      if (!selectedMarketCoin && parsedMarkets.length > 0) {
        const defaultMarketExists = parsedMarkets.some(m => m.coin === defaultMarket)
        const marketToSelect = defaultMarketExists ? defaultMarket : parsedMarkets[0].coin
        dispatch(perpsSlice.actions.setSelectedMarket(marketToSelect))
      }

      reconnectAttemptRef.current = 0
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch markets data'
      dispatch(perpsSlice.actions.setMarketsError(errorMessage))
    }
  }, [dispatch, selectedMarketCoin, defaultMarket])

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
    clearReconnectTimeout()

    const delay = Math.min(
      HYPERLIQUID_RECONNECT_DELAY_BASE_MS * Math.pow(2, reconnectAttemptRef.current),
      HYPERLIQUID_RECONNECT_DELAY_MAX_MS,
    )

    reconnectAttemptRef.current += 1

    reconnectTimeoutRef.current = setTimeout(() => {
      subscribeInternalRef.current()
    }, delay)
  }, [clearReconnectTimeout])

  const handleAllMidsUpdate = useCallback(
    (data: { mids: Record<string, string> }) => {
      const currentMarkets = marketsRef.current
      if (currentMarkets.length === 0) return

      const updatedMarkets = currentMarkets.map(market => {
        const newMidPx = data.mids[market.coin]
        if (newMidPx && newMidPx !== market.midPx) {
          return { ...market, midPx: newMidPx }
        }
        return market
      })

      const hasChanges = updatedMarkets.some(
        (market, index) => market.midPx !== currentMarkets[index].midPx,
      )

      if (hasChanges) {
        dispatch(perpsSlice.actions.setMarkets(updatedMarkets))
      }

      setIsSubscribed(true)
      reconnectAttemptRef.current = 0
    },
    [dispatch],
  )

  const subscribeInternal = useCallback(async () => {
    if (unsubscribeRef.current) {
      await unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    try {
      unsubscribeRef.current = await subscribeToAllMids(handleAllMidsUpdate)
      setIsSubscribed(true)
      reconnectAttemptRef.current = 0
    } catch (err) {
      setIsSubscribed(false)
      scheduleReconnect()
    }
  }, [handleAllMidsUpdate, scheduleReconnect])

  subscribeInternalRef.current = subscribeInternal

  const subscribe = useCallback(() => {
    reconnectAttemptRef.current = 0
    subscribeInternal()
  }, [subscribeInternal])

  const unsubscribe = useCallback(async () => {
    clearReconnectTimeout()
    clearPollingInterval()

    if (unsubscribeRef.current) {
      await unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    setIsSubscribed(false)
  }, [clearReconnectTimeout, clearPollingInterval])

  const selectMarket = useCallback(
    (coin: string) => {
      dispatch(perpsSlice.actions.setSelectedMarket(coin))
    },
    [dispatch],
  )

  const selectedMarket = useMemo(() => {
    if (!selectedMarketCoin) return undefined
    return markets.find(m => m.coin === selectedMarketCoin)
  }, [markets, selectedMarketCoin])

  const filteredMarkets = useMemo(() => {
    let result = markets

    if (searchQuery) {
      result = searchMarkets(result, searchQuery)
    }

    switch (sortBy) {
      case 'volume':
        result = sortMarketsByVolume(result)
        break
      case 'name':
        result = sortMarketsByName(result)
        break
      case 'priceChange':
        result = sortMarketsByPriceChange(result)
        break
      default:
        break
    }

    return result
  }, [markets, searchQuery, sortBy])

  useEffect(() => {
    if (autoFetch) {
      fetchMarketsData()
    }
  }, [autoFetch, fetchMarketsData])

  const hasMarkets = markets.length > 0

  const startPolling = useCallback(() => {
    if (pollingInterval > 0) {
      pollingIntervalRef.current = setInterval(() => {
        void fetchMarketsData()
      }, pollingInterval)
    }
  }, [pollingInterval, fetchMarketsData])

  useEffect(() => {
    if (autoSubscribe && hasMarkets) {
      void subscribe()
      startPolling()
    }

    return () => {
      void unsubscribe()
    }
  }, [autoSubscribe, hasMarkets, subscribe, unsubscribe, startPolling])

  useEffect(() => {
    return () => {
      clearReconnectTimeout()
      clearPollingInterval()
      if (unsubscribeRef.current) {
        void unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [clearReconnectTimeout, clearPollingInterval])

  return {
    markets,
    filteredMarkets,
    selectedMarket,
    isLoading,
    isSubscribed,
    error,
    searchQuery,
    sortBy,
    setSearchQuery,
    setSortBy,
    selectMarket,
    refetch: fetchMarketsData,
    subscribe,
    unsubscribe,
  }
}

export type { MarketSortBy, UseMarketsConfig, UseMarketsResult }
