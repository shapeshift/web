import { useEffect, useMemo, useState } from 'react'
import type { Asset } from 'lib/asset-service'
import { lifi } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { thorchain } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { zrx } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper2'
import { selectAssetsSortedByMarketCapFiatBalanceAndName } from 'state/slices/common-selectors'
import { selectAssetIds, selectFeatureFlags, selectSellAsset } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sellAsset = useAppSelector(selectSellAsset)
  const assetIds = useAppSelector(selectAssetIds)
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapFiatBalanceAndName)
  const { LifiSwap, ThorSwap, ZrxSwap } = useAppSelector(selectFeatureFlags)

  const enabledSwappers = useMemo(() => {
    const result = []
    if (LifiSwap) result.push(lifi)
    if (ThorSwap) result.push(thorchain)
    if (ZrxSwap) result.push(zrx)
    // TODO(woodenfurniture): add more swappers here
    return result
  }, [LifiSwap, ThorSwap, ZrxSwap])

  const [supportedSellAssets, setSupportedSellAssets] = useState<Asset[]>([])
  const [supportedBuyAssets, setSupportedBuyAssets] = useState<Asset[]>([])

  useEffect(() => {
    ;(async () => {
      const supportedAssetIds = await Promise.all(
        enabledSwappers.map(({ filterAssetIdsBySellable }) => filterAssetIdsBySellable(assetIds)),
      )
      const supportedAssetIdsSet = new Set(supportedAssetIds.flat())
      setSupportedSellAssets(sortedAssets.filter(asset => supportedAssetIdsSet.has(asset.assetId)))
    })()
  }, [assetIds, enabledSwappers, sortedAssets])

  useEffect(() => {
    ;(async () => {
      const supportedAssetIds = await Promise.all(
        enabledSwappers.map(({ filterBuyAssetsBySellAssetId }) =>
          filterBuyAssetsBySellAssetId({ assetIds, sellAssetId: sellAsset.assetId }),
        ),
      )
      const supportedAssetIdsSet = new Set(supportedAssetIds.flat())
      setSupportedBuyAssets(sortedAssets.filter(asset => supportedAssetIdsSet.has(asset.assetId)))
    })()
  }, [assetIds, enabledSwappers, sellAsset.assetId, sortedAssets])

  return {
    supportedSellAssets,
    supportedBuyAssets,
  }
}
