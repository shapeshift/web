import type { AssetId } from '@shapeshiftoss/caip'
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
    const supportedAssetIdsSet = new Set(
      new Array<AssetId>().concat(
        // this spread is fast, dont optimise out without benchmarks
        ...enabledSwappers.map(({ filterAssetIdsBySellable }) =>
          filterAssetIdsBySellable(assetIds),
        ),
      ),
    )
    return sortedAssets.filter(asset => supportedAssetIdsSet.has(asset.assetId))
  }, [assetIds, enabledSwappers, sortedAssets])

  const supportedBuyAssets = useMemo(() => {
    const supportedAssetIdsSet = new Set(
      new Array<AssetId>().concat(
        // this spread is fast, dont optimise out without benchmarks
        ...enabledSwappers.map(({ filterBuyAssetsBySellAssetId }) =>
          filterBuyAssetsBySellAssetId({ assetIds, sellAssetId: sellAsset.assetId }),
        ),
      ),
    )
    return sortedAssets.filter(asset => supportedAssetIdsSet.has(asset.assetId))
  }, [assetIds, enabledSwappers, sellAsset.assetId, sortedAssets])

  return {
    supportedSellAssets,
    supportedBuyAssets,
  }
}
