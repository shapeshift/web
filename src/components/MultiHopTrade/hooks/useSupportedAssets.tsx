import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useMemo, useState } from 'react'
import type { Asset } from 'lib/asset-service'
import { getSupportedBuyAssetIds, getSupportedSellAssetIds } from 'lib/swapper/swapper'
import { getEnabledSwappers } from 'lib/swapper/utils'
import { selectAssetsSortedByMarketCapUserCurrencyBalanceAndName } from 'state/slices/common-selectors'
import { selectFeatureFlags, selectSellAsset } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sellAsset = useAppSelector(selectSellAsset)
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)
  const featureFlags = useAppSelector(selectFeatureFlags)

  const enabledSwappers = useMemo(() => getEnabledSwappers(featureFlags, false), [featureFlags])

  const [supportedSellAssets, setSupportedSellAssets] = useState<Asset[]>([])
  const [supportedSellAssetIds, setSupportedSellAssetIds] = useState<Set<AssetId>>(new Set())
  const [supportedBuyAssets, setSupportedBuyAssets] = useState<Asset[]>([])
  const [supportedBuyAssetsIds, setSupportedBuyAssetsIds] = useState<Set<AssetId>>(new Set())

  useEffect(() => {
    ;(async () => {
      const assetIds = await getSupportedSellAssetIds(enabledSwappers)
      setSupportedSellAssetIds(assetIds)
    })()
  }, [enabledSwappers, sortedAssets])

  useEffect(() => {
    ;(async () => {
      const assetIds = await getSupportedBuyAssetIds(enabledSwappers, sellAsset)
      setSupportedBuyAssetsIds(assetIds)
    })()
  }, [enabledSwappers, sellAsset, sortedAssets])

  useEffect(() => {
    setSupportedSellAssets(sortedAssets.filter(asset => supportedSellAssetIds.has(asset.assetId)))
  }, [supportedSellAssetIds, enabledSwappers, sortedAssets])

  useEffect(() => {
    setSupportedBuyAssets(sortedAssets.filter(asset => supportedBuyAssetsIds.has(asset.assetId)))
  }, [supportedBuyAssetsIds, enabledSwappers, sortedAssets])

  return {
    supportedSellAssets,
    supportedBuyAssets,
  }
}
