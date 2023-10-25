import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useEffect, useMemo, useState } from 'react'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import type { Asset } from 'lib/asset-service'
import { getSupportedBuyAssetIds, getSupportedSellAssetIds } from 'lib/swapper/swapper'
import { getEnabledSwappers } from 'lib/swapper/utils'
import { selectAssetsSortedByMarketCapUserCurrencyBalanceAndName } from 'state/slices/common-selectors'
import { selectAssets, selectFeatureFlags, selectSellAsset } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sellAsset = useAppSelector(selectSellAsset)
  const assets = useAppSelector(selectAssets)
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)
  const featureFlags = useAppSelector(selectFeatureFlags)
  const wallet = useWallet().state.wallet

  const enabledSwappers = useMemo(() => getEnabledSwappers(featureFlags, false), [featureFlags])

  const [supportedSellAssets, setSupportedSellAssets] = useState<Asset[]>([])
  const [supportedSellAssetIds, setSupportedSellAssetIds] = useState<Set<AssetId>>(new Set())
  const [supportedBuyAssets, setSupportedBuyAssets] = useState<Asset[]>([])
  const [supportedBuyAssetsIds, setSupportedBuyAssetsIds] = useState<Set<AssetId>>(new Set())

  const isSnapInstalled = useIsSnapInstalled()
  useEffect(() => {
    ;(async () => {
      const assetIds = await getSupportedSellAssetIds(enabledSwappers, assets)
      const filteredAssetIds = new Set<AssetId>()
      assetIds.forEach(assetId => {
        const chainId = fromAssetId(assetId).chainId
        if (walletSupportsChain({ chainId, wallet, isSnapInstalled })) {
          filteredAssetIds.add(assetId)
        }
      })
      setSupportedSellAssetIds(filteredAssetIds)
    })()
  }, [assets, enabledSwappers, isSnapInstalled, sortedAssets, wallet])

  useEffect(() => {
    ;(async () => {
      const assetIds = await getSupportedBuyAssetIds(enabledSwappers, sellAsset, assets)
      setSupportedBuyAssetsIds(assetIds)
    })()
  }, [assets, enabledSwappers, sellAsset, sortedAssets])

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
