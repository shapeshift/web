import { useMemo } from 'react'
import { useGetSupportedAssetsQuery } from 'state/apis/swapper/swapperApi'
import {
  selectAssetsSortedByMarketCapUserCurrencyBalanceAndName,
  selectAssetsSortedByName,
  selectWalletSupportedChainIds,
} from 'state/slices/common-selectors'
import { selectMarketDataDidLoad } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const marketDataDidLoad = useAppSelector(selectMarketDataDidLoad)
  const assetsSortedByName = useAppSelector(selectAssetsSortedByName)
  const assetsSortedByMarketCapUserCurrencyBalanceAndName = useAppSelector(
    selectAssetsSortedByMarketCapUserCurrencyBalanceAndName,
  )

  const sortedAssets = useMemo(() => {
    // if the market data has not yet loaded once, return a simplified sorting of assets
    if (!marketDataDidLoad) {
      return assetsSortedByName
    } else {
      return assetsSortedByMarketCapUserCurrencyBalanceAndName
    }
  }, [assetsSortedByMarketCapUserCurrencyBalanceAndName, assetsSortedByName, marketDataDidLoad])

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
