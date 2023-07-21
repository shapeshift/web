import { useEffect, useMemo, useState } from 'react'
import type { Asset } from 'lib/asset-service'
import { cowSwapper } from 'lib/swapper/swappers/CowSwapper/CowSwapper2'
import { lifiSwapper } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { oneInchSwapper } from 'lib/swapper/swappers/OneInchSwapper/OneInchSwapper2'
import { osmosisSwapper } from 'lib/swapper/swappers/OsmosisSwapper/OsmosisSwapper2'
import { thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { zrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper2'
import { selectAssetsSortedByMarketCapUserCurrencyBalanceAndName } from 'state/slices/common-selectors'
import { selectFeatureFlags, selectNonNftAssetIds, selectSellAsset } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sellAsset = useAppSelector(selectSellAsset)
  const nonNftAssetIds = useAppSelector(selectNonNftAssetIds)
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)
  const { LifiSwap, ThorSwap, ZrxSwap, OneInch, Cowswap, OsmosisSwap } =
    useAppSelector(selectFeatureFlags)
  useAppSelector(selectFeatureFlags)

  const enabledSwappers = useMemo(() => {
    const result = []
    if (LifiSwap) result.push(lifiSwapper)
    if (ThorSwap) result.push(thorchainSwapper)
    if (ZrxSwap) result.push(zrxSwapper)
    if (OneInch) result.push(oneInchSwapper)
    if (Cowswap) result.push(cowSwapper)
    if (OsmosisSwap) result.push(osmosisSwapper)
    return result
  }, [Cowswap, LifiSwap, OneInch, ThorSwap, ZrxSwap, OsmosisSwap])

  const [supportedSellAssets, setSupportedSellAssets] = useState<Asset[]>([])
  const [supportedBuyAssets, setSupportedBuyAssets] = useState<Asset[]>([])

  useEffect(() => {
    ;(async () => {
      const supportedAssetIds = await Promise.all(
        enabledSwappers.map(({ filterAssetIdsBySellable }) =>
          filterAssetIdsBySellable(nonNftAssetIds),
        ),
      )
      const supportedAssetIdsSet = new Set(supportedAssetIds.flat())
      setSupportedSellAssets(sortedAssets.filter(asset => supportedAssetIdsSet.has(asset.assetId)))
    })()
  }, [nonNftAssetIds, enabledSwappers, sortedAssets])

  useEffect(() => {
    ;(async () => {
      const supportedAssetIds = await Promise.all(
        enabledSwappers.map(({ filterBuyAssetsBySellAssetId }) =>
          filterBuyAssetsBySellAssetId({ nonNftAssetIds, sellAssetId: sellAsset.assetId }),
        ),
      )
      const supportedAssetIdsSet = new Set(supportedAssetIds.flat())
      setSupportedBuyAssets(sortedAssets.filter(asset => supportedAssetIdsSet.has(asset.assetId)))
    })()
  }, [nonNftAssetIds, enabledSwappers, sellAsset.assetId, sortedAssets])

  return {
    supportedSellAssets,
    supportedBuyAssets,
  }
}
