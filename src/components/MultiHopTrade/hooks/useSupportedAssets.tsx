import { KnownChainIds } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { isSome } from 'lib/utils'
import { useGetSupportedAssetsQuery } from 'state/apis/swapper/swapperApi'
import { selectAssetsSortedByMarketCapUserCurrencyBalanceAndName } from 'state/slices/common-selectors'
import {
  selectAccountIdsByChainIdFilter,
  selectAssets,
  selectPortfolioAccounts,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)
  const assets = useAppSelector(selectAssets)
  const wallet = useWallet().state.wallet
  const isSnapInstalled = useIsSnapInstalled()

  const portfolioAccounts = useAppSelector(selectPortfolioAccounts)
  const queryParams = useMemo(() => {
    return {
      walletSupportedChainIds: Object.values(KnownChainIds).filter(chainId => {
        const chainAccountIds = selectAccountIdsByChainIdFilter(store.getState(), { chainId })
        return walletSupportsChain({ chainId, wallet, isSnapInstalled, chainAccountIds })
      }),
      sortedAssetIds: sortedAssets.map(asset => asset.assetId),
    }
    // Since we *have* to use the non-reactive store.getState() above, this ensure the hook reruns on accounts referential invalidation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSnapInstalled, sortedAssets, portfolioAccounts, wallet])

  const { data, isLoading } = useGetSupportedAssetsQuery(queryParams)

  const supportedSellAssets = useMemo(() => {
    if (!data) return []
    return data.supportedSellAssetIds.map(assetId => assets[assetId]).filter(isSome)
  }, [assets, data])

  const supportedBuyAssets = useMemo(() => {
    if (!data) return []
    return data.supportedBuyAssetIds.map(assetId => assets[assetId]).filter(isSome)
  }, [assets, data])

  return {
    isLoading,
    supportedSellAssets,
    supportedBuyAssets,
  }
}
