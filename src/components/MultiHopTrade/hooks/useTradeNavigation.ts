import type { AssetId } from '@shapeshiftoss/caip'
import { btcAssetId, ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

interface UseTradeNavigationOptions {
  sellAssetIdOverride?: AssetId
  initialAmount?: string
}

export const useTradeNavigation = () => {
  const navigate = useNavigate()

  const navigateToTrade = useCallback(
    (buyAssetId: AssetId, options?: UseTradeNavigationOptions) => {
      if (options?.sellAssetIdOverride) {
        const initialAmount = options.initialAmount ?? '0'
        navigate(`/trade/${buyAssetId}/${options.sellAssetIdOverride}/${initialAmount}`)
        return
      }

      const nativeSellAssetId = getChainAdapterManager()
        .get(fromAssetId(buyAssetId).chainId)
        ?.getFeeAssetId()

      const sellAssetId = (() => {
        if (buyAssetId !== nativeSellAssetId) return nativeSellAssetId
        if (buyAssetId === ethAssetId) return btcAssetId
        return ethAssetId
      })()

      if (!sellAssetId) return

      const initialAmount = options?.initialAmount ?? '0'
      navigate(`/trade/${buyAssetId}/${sellAssetId}/${initialAmount}`)
    },
    [navigate],
  )

  return { navigateToTrade }
}
