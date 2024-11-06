import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useAccountsFetchQuery } from 'context/AppProvider/hooks/useAccountsFetchQuery'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  useWalletSupportsChain,
  useWalletSupportsChainAtRuntime,
} from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectAccountIdsByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseIsManualReceiveAddressRequiredProps = {
  shouldForceManualAddressEntry: boolean
  sellAccountId: AccountId | undefined
  buyAsset: Asset
  manualReceiveAddress: string | undefined
  walletReceiveAddress: string | undefined
  isWalletReceiveAddressLoading: boolean
}

export const useIsManualReceiveAddressRequired = ({
  shouldForceManualAddressEntry,
  sellAccountId,
  buyAsset,
  manualReceiveAddress,
  walletReceiveAddress,
  isWalletReceiveAddressLoading,
}: UseIsManualReceiveAddressRequiredProps) => {
  const {
    state: { isConnected, wallet },
  } = useWallet()

  const buyAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: buyAsset.assetId }),
  )

  const { isFetching: isAccountsMetadataLoading } = useAccountsFetchQuery()
  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)
  const walletSupportsBuyAssetChainAtRuntime = useWalletSupportsChainAtRuntime(
    buyAsset.chainId,
    wallet,
  )

  const forceDisplayManualAddressEntry = useMemo(() => {
    if (isWalletReceiveAddressLoading) return false
    if (!isConnected) return false
    if (isAccountsMetadataLoading && !sellAccountId) return false
    if (manualReceiveAddress) return false
    if (!walletReceiveAddress) return true
    if (!walletSupportsBuyAssetChain) return true
    // If the wallet supports the chian at runtime, display the manual address entry if there are no
    // accounts connected for the buy asset
    if (walletSupportsBuyAssetChainAtRuntime) return !buyAssetAccountIds.length
    // If the parent wants to force the manual address entry to be displayed, do it
    if (shouldForceManualAddressEntry) return true

    return false
  }, [
    buyAssetAccountIds.length,
    isAccountsMetadataLoading,
    isConnected,
    isWalletReceiveAddressLoading,
    manualReceiveAddress,
    sellAccountId,
    shouldForceManualAddressEntry,
    walletReceiveAddress,
    walletSupportsBuyAssetChain,
    walletSupportsBuyAssetChainAtRuntime,
  ])

  return forceDisplayManualAddressEntry
}
