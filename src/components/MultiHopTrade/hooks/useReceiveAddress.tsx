import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import type { Asset } from '@shapeshiftoss/types'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { GetReceiveAddressArgs } from '@/components/MultiHopTrade/types'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

export const getReceiveAddress = async ({
  asset,
  wallet,
  accountMetadata,
  pubKey,
}: GetReceiveAddressArgs): Promise<string | undefined> => {
  const { chainId } = fromAssetId(asset.assetId)
  const { accountType, bip44Params } = accountMetadata
  const chainAdapter = getChainAdapterManager().get(chainId)
  if (!chainAdapter) return
  if (!(wallet || pubKey)) return

  const { accountNumber } = bip44Params

  const address = await chainAdapter.getAddress({
    wallet,
    accountNumber,
    accountType,
    pubKey,
  })
  return address
}

export const useReceiveAddress = ({
  sellAccountId,
  buyAccountId,
  buyAsset,
}: {
  sellAccountId: AccountId | undefined
  buyAccountId: AccountId | undefined
  buyAsset: Asset | undefined
}) => {
  const { wallet } = useWallet().state
  const buyAccountMetadataFilter = useMemo(() => ({ accountId: buyAccountId }), [buyAccountId])
  const buyAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, buyAccountMetadataFilter),
  )

  // This flag is used to skip the query below and treat missing input as `isLoading` to prevent UI
  // flashing during state changes. Any of the conditions below returning true should be treated as
  // "we're not yet ready to determine if a wallet receive address is available"
  const isInitializing = useMemo(() => {
    if (!buyAsset || !wallet) {
      return true
    }

    return false
  }, [buyAsset, wallet])

  const { data: walletReceiveAddress, isLoading } = useQuery<string | null>({
    queryKey: [
      'receiveAddress',
      buyAsset?.assetId,
      // IMPORTANT: Required to invalidate query cache when changing wallet - different ledgers can
      // have the same deviceId.
      // Note, we don't use `deviceId` here as it's not guaranteed to be present (e.g disconnected Ledger),
      // and sell/buy AccountIds are enough of discriminators
      sellAccountId,
      buyAccountId,
    ],
    queryFn:
      !isInitializing && buyAsset && wallet && buyAccountId && buyAccountMetadata
        ? async () => {
            // Already partially covered in isInitializing, but TypeScript lyfe mang.
            if (!buyAsset || !wallet || !buyAccountId || !buyAccountMetadata) {
              return null
            }

            const buyAssetChainId = buyAsset.chainId
            const buyAssetAccountChainId = buyAccountId
              ? fromAccountId(buyAccountId).chainId
              : undefined

            /**
             * do NOT remove
             * super dangerous - don't use the wrong bip44 params to generate receive addresses
             */
            if (buyAssetChainId !== buyAssetAccountChainId) {
              return null
            }

            if (isUtxoAccountId(buyAccountId) && !buyAccountMetadata?.accountType)
              throw new Error(`Missing accountType for UTXO account ${buyAccountId}`)

            const shouldFetchUnchainedAddress = Boolean(
              (wallet && isLedger(wallet)) || isTrezor(wallet),
            )
            const walletReceiveAddress = await getReceiveAddress({
              asset: buyAsset,
              wallet,
              accountMetadata: buyAccountMetadata,
              pubKey: shouldFetchUnchainedAddress ? fromAccountId(buyAccountId).account : undefined,
            })

            return walletReceiveAddress ?? null
          }
        : skipToken,
    staleTime: Infinity,
  })

  return {
    walletReceiveAddress: walletReceiveAddress ?? undefined,
    isLoading,
  }
}
