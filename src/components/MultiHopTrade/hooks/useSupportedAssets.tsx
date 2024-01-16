import { KnownChainIds } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { isSome } from 'lib/utils'
import { useGetSupportedAssetsQuery } from 'state/apis/swappers/swappersApi'
import { selectAssetsSortedByUserCurrencyBalanceAndName } from 'state/slices/common-selectors'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  // We select assets sorted by balance and name so we don't have to wait for market data to arrive.
  // This results in faster initial load times and doesn't require loading adding state for market data
  const sortedAssets = useAppSelector(selectAssetsSortedByUserCurrencyBalanceAndName)
  const assets = useAppSelector(selectAssets)
  const wallet = useWallet().state.wallet
  const isSnapInstalled = useIsSnapInstalled()

  const queryParams = useMemo(() => {
    return {
      walletSupportedChainIds: Object.values(KnownChainIds).filter(chainId =>
        walletSupportsChain({ chainId, wallet, isSnapInstalled }),
      ),
      sortedAssetIds: sortedAssets.map(asset => asset.assetId),
    }
  }, [isSnapInstalled, sortedAssets, wallet])

  const { data, isFetching } = useGetSupportedAssetsQuery(queryParams)

  const supportedSellAssets = useMemo(() => {
    if (!data) return []
    return data.supportedSellAssetIds.map(assetId => assets[assetId]).filter(isSome)
  }, [assets, data])

  const supportedBuyAssets = useMemo(() => {
    if (!data) return []
    return data.supportedBuyAssetIds.map(assetId => assets[assetId]).filter(isSome)
  }, [assets, data])

  return {
    isLoading: isFetching,
    supportedSellAssets,
    supportedBuyAssets,
  }
}
