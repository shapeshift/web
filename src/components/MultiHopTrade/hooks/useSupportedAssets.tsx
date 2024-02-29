import type { SwapperName } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { swappers } from 'lib/swapper/constants'
import { getEnabledSwappers } from 'lib/swapper/utils'
import {
  selectAssetsSortedByMarketCapUserCurrencyBalanceAndName,
  selectFeatureFlags,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSupportedAssets = () => {
  const sortedAssets = useAppSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)
  const wallet = useWallet().state.wallet
  const isSnapInstalled = useIsSnapInstalled()
  const featureFlags = useAppSelector(selectFeatureFlags)

  const supportedSellChainIds = useMemo(() => {
    const enabledSwappers = getEnabledSwappers(featureFlags, false)
    return Object.entries(enabledSwappers).flatMap(([swapperName, isEnabled]) => {
      if (!isEnabled) return []
      const swapperSupportedChainIds =
        swappers[swapperName as SwapperName]?.supportedChainIds.sell ?? []

      return swapperSupportedChainIds.filter(chainId =>
        walletSupportsChain({ chainId, wallet, isSnapInstalled }),
      )
    })
  }, [featureFlags, isSnapInstalled, wallet])

  const supportedBuyChainIds = useMemo(() => {
    const enabledSwappers = getEnabledSwappers(featureFlags, false)
    return Object.entries(enabledSwappers).flatMap(([swapperName, isEnabled]) => {
      if (!isEnabled) return []
      return swappers[swapperName as SwapperName]?.supportedChainIds.buy ?? []
    })
  }, [featureFlags])

  const supportedSellAssets = useMemo(() => {
    return sortedAssets.filter(asset => supportedSellChainIds.includes(asset.chainId))
  }, [sortedAssets, supportedSellChainIds])

  const supportedBuyAssets = useMemo(() => {
    return sortedAssets.filter(asset => supportedBuyChainIds.includes(asset.chainId))
  }, [sortedAssets, supportedBuyChainIds])

  return useMemo(
    () => ({
      supportedSellAssets,
      supportedBuyAssets,
    }),
    [supportedBuyAssets, supportedSellAssets],
  )
}
