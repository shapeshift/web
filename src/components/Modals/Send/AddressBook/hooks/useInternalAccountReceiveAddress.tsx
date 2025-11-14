import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { Asset } from '@shapeshiftoss/types'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getReceiveAddress } from '@/components/MultiHopTrade/hooks/useReceiveAddress'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

export const useInternalAccountReceiveAddress = ({
  accountId,
  asset,
  enabled,
}: {
  accountId: AccountId | null
  asset: Asset | undefined
  enabled: boolean
}) => {
  const { wallet } = useWallet().state

  const accountMetadataFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter),
  )

  const isInitializing = useMemo(() => {
    if (!asset || !wallet || !accountId) {
      return true
    }
    return false
  }, [asset, wallet, accountId])

  const { data: receiveAddress, isLoading } = useQuery<string | null>({
    queryKey: ['internalAccountReceiveAddress', asset?.assetId, accountId],
    queryFn:
      enabled && !isInitializing && asset && wallet && accountId && accountMetadata
        ? async () => {
            if (!asset || !wallet || !accountId || !accountMetadata) {
              return null
            }

            const assetChainId = asset.chainId
            const accountChainId = fromAccountId(accountId).chainId

            if (assetChainId !== accountChainId) {
              return null
            }

            if (isUtxoAccountId(accountId) && !accountMetadata?.accountType)
              throw new Error(`Missing accountType for UTXO account ${accountId}`)

            const shouldFetchUnchainedAddress = Boolean(wallet && isLedger(wallet))
            const receiveAddress = await getReceiveAddress({
              asset,
              wallet,
              accountMetadata,
              pubKey: shouldFetchUnchainedAddress ? fromAccountId(accountId).account : undefined,
            })

            return receiveAddress ?? null
          }
        : skipToken,
    staleTime: 5 * 60 * 1000,
  })

  return {
    receiveAddress: receiveAddress ?? undefined,
    isLoading: enabled ? isLoading : false,
  }
}
