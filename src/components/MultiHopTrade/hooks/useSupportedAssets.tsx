import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { lifi } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { thorchain } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { selectAssetsSortedByMarketCapFiatBalanceAndName } from 'state/slices/common-selectors'
import { selectAssetIds, selectFeatureFlags, selectSellAsset } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sellAsset = useAppSelector(selectSellAsset)
  const assetIds = useAppSelector(selectAssetIds)
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapFiatBalanceAndName)
  const { LifiSwap, ThorSwap } = useAppSelector(selectFeatureFlags)

  const enabledSwappers = useMemo(() => {
    const result = []
    if (LifiSwap) result.push(lifi)
    if (ThorSwap) result.push(thorchain)
    // TODO(woodenfurniture): add more swappers here
    return result
  }, [LifiSwap, ThorSwap])

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
