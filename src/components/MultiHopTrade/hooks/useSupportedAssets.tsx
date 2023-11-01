import { KnownChainIds } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { useGetSupportedAssetsQuery } from 'state/apis/swappers/swappersApi'
import { selectAssetsSortedByMarketCapUserCurrencyBalanceAndName } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)
  const wallet = useWallet().state.wallet
  const isSnapInstalled = useIsSnapInstalled()

  const walletSupportedChains = useMemo(() => {
    return Object.values(KnownChainIds).filter(chainId =>
      walletSupportsChain({ chainId, wallet, isSnapInstalled }),
    )
  }, [isSnapInstalled, wallet])

  const { data, isLoading } = useGetSupportedAssetsQuery(walletSupportedChains)

  const supportedSellAssets = useMemo(() => {
    if (data === undefined) return []
    return sortedAssets.filter(asset => data.supportedSellAssetIds.includes(asset.assetId))
  }, [data, sortedAssets])

  const supportedBuyAssets = useMemo(() => {
    if (data === undefined) return []
    return sortedAssets.filter(asset => data.supportedBuyAssetsIds.includes(asset.assetId))
  }, [data, sortedAssets])

  return {
    isLoading,
    supportedSellAssets,
    supportedBuyAssets,
  }
}
