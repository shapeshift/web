import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WalletClient } from 'viem'

import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  clearWallet,
  fetchClearinghouseState,
  fetchMeta,
  fetchMetaAndAssetCtxs,
  fetchOpenOrders,
  getCurrentNetwork,
  getExchangeClient,
  initializeClients,
  isWalletConnected,
  setWallet,
} from '@/lib/hyperliquid/client'
import type { ClearinghouseState, MetaAndAssetCtxs, OpenOrder, PerpsMeta } from '@/lib/hyperliquid/types'
import { perpsSlice } from '@/state/slices/perpsSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type NetworkType = 'mainnet' | 'testnet'

type UseHyperliquidConfig = {
  network?: NetworkType
  autoInitialize?: boolean
}

type UseHyperliquidResult = {
  isInitialized: boolean
  isConnecting: boolean
  isWalletConnected: boolean
  walletAddress: string | undefined
  network: NetworkType
  error: string | undefined
  initialize: () => void
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  fetchAccountData: () => Promise<void>
  refetchMeta: () => Promise<PerpsMeta | undefined>
  refetchMetaAndAssetCtxs: () => Promise<MetaAndAssetCtxs | undefined>
}

const DEFAULT_CONFIG: UseHyperliquidConfig = {
  network: 'mainnet',
  autoInitialize: true,
}

export const useHyperliquid = (config: UseHyperliquidConfig = {}): UseHyperliquidResult => {
  const { network = DEFAULT_CONFIG.network, autoInitialize = DEFAULT_CONFIG.autoInitialize } = config

  const dispatch = useAppDispatch()
  const {
    state: { wallet, isConnected: isWalletProviderConnected },
  } = useWallet()

  const storedWalletAddress = useAppSelector(perpsSlice.selectors.selectWalletAddress)
  const isWalletInitializedInStore = useAppSelector(perpsSlice.selectors.selectIsWalletInitialized)

  const [isInitialized, setIsInitialized] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const initialize = useCallback(() => {
    try {
      initializeClients({ network })
      setIsInitialized(true)
      setError(undefined)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Hyperliquid clients'
      setError(errorMessage)
      setIsInitialized(false)
    }
  }, [network])

  const connectWallet = useCallback(async () => {
    if (!wallet) {
      setError('No wallet connected')
      return
    }

    setIsConnecting(true)
    setError(undefined)

    try {
      const ethWallet = wallet as { ethGetAddress?: () => Promise<string | null> }
      const address = await ethWallet.ethGetAddress?.()

      if (!address) {
        throw new Error('Failed to get wallet address')
      }

      const viemWalletClient = (wallet as unknown as { getViemWalletClient?: () => WalletClient })
        .getViemWalletClient?.()

      if (!viemWalletClient) {
        throw new Error('Wallet does not support viem. Please use a compatible wallet.')
      }

      setWallet(viemWalletClient)
      dispatch(perpsSlice.actions.setWalletAddress(address))
      dispatch(perpsSlice.actions.setWalletInitialized(true))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet to Hyperliquid'
      setError(errorMessage)
      dispatch(perpsSlice.actions.setWalletInitialized(false))
    } finally {
      setIsConnecting(false)
    }
  }, [wallet, dispatch])

  const disconnectWallet = useCallback(() => {
    clearWallet()
    dispatch(perpsSlice.actions.clearWalletData())
    setError(undefined)
  }, [dispatch])

  const fetchAccountData = useCallback(async () => {
    const address = storedWalletAddress
    if (!address) {
      return
    }

    try {
      dispatch(perpsSlice.actions.setAccountStateLoading(true))
      dispatch(perpsSlice.actions.setPositionsLoading(true))
      dispatch(perpsSlice.actions.setOpenOrdersLoading(true))

      const [clearinghouseState, openOrders]: [ClearinghouseState, OpenOrder[]] = await Promise.all([
        fetchClearinghouseState({ user: address }),
        fetchOpenOrders({ user: address }),
      ])

      dispatch(perpsSlice.actions.setAccountState(clearinghouseState))
      dispatch(perpsSlice.actions.setOpenOrders(openOrders))

      const positions = clearinghouseState.assetPositions
        .filter(ap => parseFloat(ap.position.szi) !== 0)
        .map(ap => ({
          coin: ap.position.coin,
          side: parseFloat(ap.position.szi) > 0 ? ('long' as const) : ('short' as const),
          size: Math.abs(parseFloat(ap.position.szi)).toString(),
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
        }))

      dispatch(perpsSlice.actions.setPositions(positions))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch account data'
      dispatch(perpsSlice.actions.setAccountStateError(errorMessage))
      dispatch(perpsSlice.actions.setPositionsError(errorMessage))
      dispatch(perpsSlice.actions.setOpenOrdersError(errorMessage))
    }
  }, [storedWalletAddress, dispatch])

  const refetchMeta = useCallback(async (): Promise<PerpsMeta | undefined> => {
    try {
      return await fetchMeta()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch meta'
      setError(errorMessage)
      return undefined
    }
  }, [])

  const refetchMetaAndAssetCtxs = useCallback(async (): Promise<MetaAndAssetCtxs | undefined> => {
    try {
      return await fetchMetaAndAssetCtxs()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch meta and asset contexts'
      setError(errorMessage)
      return undefined
    }
  }, [])

  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initialize()
    }
  }, [autoInitialize, isInitialized, initialize])

  useEffect(() => {
    if (!isWalletProviderConnected && isWalletInitializedInStore) {
      disconnectWallet()
    }
  }, [isWalletProviderConnected, isWalletInitializedInStore, disconnectWallet])

  const result = useMemo(
    (): UseHyperliquidResult => ({
      isInitialized,
      isConnecting,
      isWalletConnected: isWalletConnected() && isWalletInitializedInStore,
      walletAddress: storedWalletAddress,
      network: getCurrentNetwork(),
      error,
      initialize,
      connectWallet,
      disconnectWallet,
      fetchAccountData,
      refetchMeta,
      refetchMetaAndAssetCtxs,
    }),
    [
      isInitialized,
      isConnecting,
      isWalletInitializedInStore,
      storedWalletAddress,
      error,
      initialize,
      connectWallet,
      disconnectWallet,
      fetchAccountData,
      refetchMeta,
      refetchMetaAndAssetCtxs,
    ],
  )

  return result
}

export type { UseHyperliquidConfig, UseHyperliquidResult }
