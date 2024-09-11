import { knownChainIds } from 'constants/chains'
import { useMemo } from 'react'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { isSome } from 'lib/utils'
import { useGetSupportedAssetsQuery } from 'state/apis/swapper/swapperApi'
import { selectAssetsSortedByMarketCapUserCurrencyBalanceAndName } from 'state/slices/common-selectors'
import { selectAccountIdsByChainId, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)
  const assets = useAppSelector(selectAssets)
  const wallet = useWallet().state.wallet
  const { isSnapInstalled } = useIsSnapInstalled()

  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const queryParams = useMemo(() => {
    return {
      walletSupportedChainIds: knownChainIds.filter(chainId => {
        const chainAccountIds = accountIdsByChainId[chainId] ?? []
        return walletSupportsChain({
          chainId,
          wallet,
          isSnapInstalled,
          checkConnectedAccountIds: chainAccountIds,
        })
      }),
      sortedAssetIds: sortedAssets.map(asset => asset.assetId),
    }
  }, [accountIdsByChainId, isSnapInstalled, sortedAssets, wallet])

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
