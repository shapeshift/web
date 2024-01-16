import { useMemo } from 'react'
import { useGetSupportedAssetsQuery } from 'state/apis/swappers/swappersApi'
import {
  selectAssetsSortedByMarketCapUserCurrencyBalanceAndName,
  selectAssetsSortedByName,
  selectWalletSupportedChainIds,
} from 'state/slices/common-selectors'
import { selectMarketDataDidLoad } from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const marketDataDidLoad = useAppSelector(selectMarketDataDidLoad)
  const sortedAssets = useMemo(() => {
    const state = store.getState()

    // if the market data has not yet loaded once, return a simplified sorting of assets
    if (!marketDataDidLoad) return selectAssetsSortedByName(state)
    else return selectAssetsSortedByMarketCapUserCurrencyBalanceAndName(state)
  }, [marketDataDidLoad])

  const walletSupportedChainIds = useAppSelector(selectWalletSupportedChainIds)

  const queryParams = useMemo(() => {
    return {
      walletSupportedChainIds,
    }
  }, [walletSupportedChainIds])

  const { data, isFetching } = useGetSupportedAssetsQuery(queryParams)

  const supportedSellAssets = useMemo(() => {
    if (!data) return []
    const assetIdsSet = new Set(data.supportedSellAssetIds)
    return sortedAssets.filter(({ assetId }) => assetIdsSet.has(assetId))
  }, [data, sortedAssets])

  const supportedBuyAssets = useMemo(() => {
    if (!data) return []
    const assetIdsSet = new Set(data.supportedBuyAssetIds)
    return sortedAssets.filter(({ assetId }) => assetIdsSet.has(assetId))
  }, [data, sortedAssets])

  return {
    isLoading: isFetching,
    supportedSellAssets,
    supportedBuyAssets,
  }
}
