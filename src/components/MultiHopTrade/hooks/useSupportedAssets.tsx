import { useEffect, useMemo, useState } from 'react'
import type { Asset } from 'lib/asset-service'
import { lifiSwapper } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { oneInchSwapper } from 'lib/swapper/swappers/OneInchSwapper/OneInchSwapper2'
import { thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { zrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper2'
import { selectAssetsSortedByMarketCapFiatBalanceAndName } from 'state/slices/common-selectors'
import { selectAssetIds, selectFeatureFlags, selectSellAsset } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sellAsset = useAppSelector(selectSellAsset)
  const assetIds = useAppSelector(selectAssetIds)
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapFiatBalanceAndName)
  const { LifiSwap, ThorSwap, ZrxSwap, OneInch } = useAppSelector(selectFeatureFlags)

  const enabledSwappers = useMemo(() => {
    const result = []
    if (LifiSwap) result.push(lifiSwapper)
    if (ThorSwap) result.push(thorchainSwapper)
    if (ZrxSwap) result.push(zrxSwapper)
    if (OneInch) result.push(oneInchSwapper)
    // TODO(woodenfurniture): add more swappers here
    return result
  }, [LifiSwap, OneInch, ThorSwap, ZrxSwap])

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
