import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { Asset } from '@shapeshiftoss/types'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { GetReceiveAddressArgs } from 'components/MultiHopTrade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isUtxoAccountId } from 'lib/utils/utxo'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

export const getReceiveAddress = async ({
  asset,
  wallet,
  accountMetadata,
  pubKey,
}: GetReceiveAddressArgs): Promise<string | undefined> => {
  const { chainId } = fromAssetId(asset.assetId)
  const { accountType, bip44Params } = accountMetadata
  const chainAdapter = getChainAdapterManager().get(chainId)
  if (!(chainAdapter && wallet)) return
  const { accountNumber } = bip44Params
  const address = await chainAdapter.getAddress({ wallet, accountNumber, accountType, pubKey })
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
  const { wallet, deviceId } = useWallet().state
  const buyAccountMetadataFilter = useMemo(() => ({ accountId: buyAccountId }), [buyAccountId])
  const buyAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, buyAccountMetadataFilter),
  )

  // This flag is used to skip the query below and treat missing input as `isLoading` to prevent UI
  // flashing during state changes. Any of the conditions below returning true should be treated as
  // "we're not yet ready to determine if a wallet receive address is available"
  const isInitializing = useMemo(() => {
    if (!buyAsset || !wallet || !buyAccountId || !buyAccountMetadata) {
      return true
    }

    const buyAssetChainId = buyAsset.chainId
    const buyAssetAccountChainId = fromAccountId(buyAccountId).chainId

    /**
     * do NOT remove
     * super dangerous - don't use the wrong bip44 params to generate receive addresses
     */
    if (buyAssetChainId !== buyAssetAccountChainId) {
      return true
    }

    return false
  }, [buyAccountId, buyAccountMetadata, buyAsset, wallet])

  const { data: walletReceiveAddress, isLoading } = useQuery({
    queryKey: [
      'receiveAddress',
      buyAsset?.assetId,
      deviceId,
      // IMPORTANT: Required to invalidate query cache when changing wallet - different ledgers can
      // have the same deviceId.
      sellAccountId,
      buyAccountId,
    ],
    queryFn: isInitializing
      ? skipToken
      : async () => {
          // Already covered in shouldSkip, but TypeScript lyfe mang.
          if (!buyAsset || !wallet || !buyAccountId || !buyAccountMetadata) {
            return
          }

          if (isUtxoAccountId(buyAccountId) && !buyAccountMetadata?.accountType)
            throw new Error(`Missing accountType for UTXO account ${buyAccountId}`)

          const shouldFetchUnchainedAddress = Boolean(wallet && isLedger(wallet))
          const walletReceiveAddress = await getReceiveAddress({
            asset: buyAsset,
            wallet,
            accountMetadata: buyAccountMetadata,
            deviceId,
            pubKey: shouldFetchUnchainedAddress ? fromAccountId(buyAccountId).account : undefined,
          })

          return walletReceiveAddress
        },
    staleTime: Infinity,
  })

  return { walletReceiveAddress, isLoading: isInitializing || isLoading }
}
