import { type Asset } from '@shapeshiftoss/asset-service'
import { Swapper, SwapperManager } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { filterAssetsByIds } from 'components/Trade/hooks/useSwapper/utils'
import { type TradeState } from 'components/Trade/types'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetIds } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

/*
The Swapper hook is responsible for providing computed swapper state to consumers.
It does not mutate state.
*/
export const useSwapper = () => {
  // Form hooks
  const { control } = useFormContext<TradeState<KnownChainIds>>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const quote = useWatch({ control, name: 'quote' })

  // Constants
  const buyAssetId = buyTradeAsset?.asset?.assetId
  const sellAssetId = sellTradeAsset?.asset?.assetId

  // Hooks
  const [swapperManager, setSwapperManager] = useState<SwapperManager>(() => new SwapperManager())
  const [bestTradeSwapper, setBestTradeSwapper] = useState<Swapper<KnownChainIds>>()
  const {
    state: { wallet },
  } = useWallet()

  // Selectors
  const flags = useSelector(selectFeatureFlags)
  const assetIds = useSelector(selectAssetIds)

  // useEffects
  useEffect(() => {
    ;(async () => {
      flags && setSwapperManager(await getSwapperManager(flags))
    })()
  }, [flags])

  useEffect(() => {
    if (buyAssetId && sellAssetId) {
      ;(async () => {
        const swapper = await swapperManager.getBestSwapper({
          buyAssetId,
          sellAssetId,
        })
        setBestTradeSwapper(swapper)
      })()
    }
  }, [buyAssetId, sellAssetId, swapperManager])

  // Callbacks
  const getSupportedSellableAssets = useCallback(
    (assets: Asset[]) => {
      const sellableAssetIds = swapperManager.getSupportedSellableAssetIds({
        assetIds,
      })
      return filterAssetsByIds(assets, sellableAssetIds)
    },
    [assetIds, swapperManager],
  )

  const getSupportedBuyAssetsFromSellAsset = useCallback(
    (assets: Asset[]): Asset[] | undefined => {
      const sellAssetId = sellTradeAsset?.asset?.assetId
      const assetIds = assets.map(asset => asset.assetId)
      const supportedBuyAssetIds = sellAssetId
        ? swapperManager.getSupportedBuyAssetIdsFromSellId({
            assetIds,
            sellAssetId,
          })
        : undefined
      return supportedBuyAssetIds ? filterAssetsByIds(assets, supportedBuyAssetIds) : undefined
    },
    [swapperManager, sellTradeAsset],
  )

  const checkApprovalNeeded = useCallback(async (): Promise<boolean> => {
    if (!bestTradeSwapper) throw new Error('no swapper available')
    if (!wallet) throw new Error('no wallet available')
    const { approvalNeeded } = await bestTradeSwapper.approvalNeeded({ quote, wallet })
    return approvalNeeded
  }, [bestTradeSwapper, quote, wallet])

  return {
    getSupportedSellableAssets,
    getSupportedBuyAssetsFromSellAsset,
    swapperManager,
    checkApprovalNeeded,
    bestTradeSwapper,
  }
}
