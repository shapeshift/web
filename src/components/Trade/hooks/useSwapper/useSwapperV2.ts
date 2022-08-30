import { type Asset } from '@shapeshiftoss/asset-service'
import {
  type ChainId,
  avalancheAssetId,
  cosmosAssetId,
  ethAssetId,
  osmosisAssetId,
} from '@shapeshiftoss/caip'
import { SwapperManager } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { filterAssetsByIds } from 'components/Trade/hooks/useSwapper/utils'
import { type TradeState } from 'components/Trade/types'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
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

  // Hooks
  const [swapperManager, setSwapperManager] = useState<SwapperManager>(() => new SwapperManager())

  // Selectors
  const flags = useSelector(selectFeatureFlags)
  const assetIds = useSelector(selectAssetIds)

  // useEffects
  useEffect(() => {
    ;(async () => {
      flags && setSwapperManager(await getSwapperManager(flags))
    })()
  }, [flags])

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

  const osmosisEnabled = useFeatureFlag('Osmosis')
  const getDefaultPair = useCallback(
    (buyAssetChainId: ChainId | undefined) => {
      const ethFoxPair = [ethAssetId, 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d']
      switch (buyAssetChainId) {
        case KnownChainIds.AvalancheMainnet:
          return [avalancheAssetId, 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab']
        case KnownChainIds.CosmosMainnet:
          return osmosisEnabled ? [cosmosAssetId, osmosisAssetId] : ethFoxPair
        case KnownChainIds.OsmosisMainnet:
          return osmosisEnabled ? [osmosisAssetId, cosmosAssetId] : ethFoxPair
        case KnownChainIds.EthereumMainnet:
        default:
          return ethFoxPair
      }
    },
    [osmosisEnabled],
  )

  return {
    getSupportedSellableAssets,
    getSupportedBuyAssetsFromSellAsset,
    swapperManager,
    getDefaultPair,
  }
}
