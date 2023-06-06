import { useMemo } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { LifiSwapper } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper'
import { selectAssetsSortedByMarketCapFiatBalanceAndName } from 'state/slices/common-selectors'
import { selectAssetIds, selectSellAsset } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sellAsset = useAppSelector(selectSellAsset)
  const assetIds = useAppSelector(selectAssetIds)
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapFiatBalanceAndName)
  const isLifiEnabled = useFeatureFlag('LifiSwap')

  const enabledSwappers = useMemo(() => {
    const result = []
    if (isLifiEnabled) result.push(LifiSwapper)
    // TODO(woodenfurniture): add more swappers here
    return result
  }, [isLifiEnabled])

  const supportedSellAssets = useMemo(() => {
    let supportAssetIds = assetIds

    for (const { filterAssetIdsBySellable } of enabledSwappers) {
      // TODO(woodenfurniture): filter Asset[] instead so filtering with a set below isnt required
      supportAssetIds = filterAssetIdsBySellable(supportAssetIds)
    }

    const supportedAssetIdsSet = new Set(supportAssetIds)
    return sortedAssets.filter(asset => supportedAssetIdsSet.has(asset.assetId))
  }, [assetIds, enabledSwappers, sortedAssets])

  const supportedBuyAssets = useMemo(() => {
    let supportAssetIds = assetIds

    for (const { filterBuyAssetsBySellAssetId } of enabledSwappers) {
      // TODO(woodenfurniture): filter Asset[] instead so filtering with a set below isnt required
      supportAssetIds = filterBuyAssetsBySellAssetId({
        assetIds: supportAssetIds,
        sellAssetId: sellAsset.assetId,
      })
    }

    const supportedAssetIdsSet = new Set(supportAssetIds)
    return sortedAssets.filter(asset => supportedAssetIdsSet.has(asset.assetId))
  }, [assetIds, enabledSwappers, sellAsset.assetId, sortedAssets])

  return {
    supportedSellAssets,
    supportedBuyAssets,
  }
}
