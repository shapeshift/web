import type { AccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useAccountsFetchQuery } from 'context/AppProvider/hooks/useAccountsFetchQuery'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectAccountIdsByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseManualReceiveAddressIsRequiredProps = {
  shouldForceManualAddressEntry: boolean
  sellAccountId: AccountId | undefined
  buyAsset: Asset
  manualReceiveAddress: string | undefined
  walletReceiveAddress: string | undefined
}

export const useManualReceiveAddressIsRequired = ({
  shouldForceManualAddressEntry,
  sellAccountId,
  buyAsset,
  manualReceiveAddress,
  walletReceiveAddress,
}: UseManualReceiveAddressIsRequiredProps) => {
  const {
    state: { isConnected, wallet },
  } = useWallet()

  const buyAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: buyAsset.assetId }),
  )

  const { isFetching: isAccountsMetadataLoading } = useAccountsFetchQuery()
  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)

  const forceDisplayManualAddressEntry = useMemo(() => {
    if (!isConnected) return false
    if (isAccountsMetadataLoading && !sellAccountId) return false
    if (manualReceiveAddress) return false
    if (!walletReceiveAddress) return true
    if (!walletSupportsBuyAssetChain) return true
    // Ledger "supports" all chains, but may not have them connected
    if (wallet && isLedger(wallet)) return !buyAssetAccountIds.length
    // We want to display the manual address entry if the wallet doesn't support the buy asset chain
    if (shouldForceManualAddressEntry) return true

    return false
  }, [
    isConnected,
    isAccountsMetadataLoading,
    sellAccountId,
    manualReceiveAddress,
    walletReceiveAddress,
    walletSupportsBuyAssetChain,
    wallet,
    buyAssetAccountIds.length,
    shouldForceManualAddressEntry,
  ])

  return forceDisplayManualAddressEntry
}
