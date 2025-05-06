import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { isRune, poolAssetIdToAssetId } from '@shapeshiftoss/swapper'
import { isUtxoChainId } from '@shapeshiftoss/utils'
import { useSuspenseQueries } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo } from 'react'

import type { Claim, TcyClaimer } from '../components/Claim/types'

import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isSome } from '@/lib/utils'
import { getThorfiFromAddresses } from '@/lib/utils/thorchain'
import { isSupportedThorchainSaversAssetId } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

export const useTCYClaims = (accountNumber: number) => {
  const {
    state: { isConnected, wallet },
  } = useWallet()

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )
  const accountIds = useMemo(
    () =>
      Object.values(accountIdsByAccountNumberAndChainId[accountNumber] || {})
        .flat()
        .filter(isSome),
    [accountNumber, accountIdsByAccountNumberAndChainId],
  )

  return useSuspenseQueries({
    queries: accountIds.map(accountId => ({
      queryKey: ['tcy-claims', accountId, isConnected],
      queryFn: async (): Promise<Claim[]> => {
        if (!isConnected) return []

        const activeAddresses = (
          await (() => {
            const chainId = fromAccountId(accountId).chainId
            const assetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
            if (!assetId) return []
            if (!isSupportedThorchainSaversAssetId(assetId)) return []
            if (isRune(assetId)) return []

            // UTXO-based chains are the odd ones, for all address-based, we can simply use the `account` caip-10 part
            if (!isUtxoChainId(fromAccountId(accountId).chainId))
              return [fromAccountId(accountId).account]

            const accountMetadata = selectPortfolioAccountMetadataByAccountId(store.getState(), {
              accountId,
            })
            if (!accountMetadata) return []
            if (!wallet) return []

            // Introspects THORChain savers to get the active address for a given xpub AccountId
            // Defaults to 0 if none found
            // We do not duplicate this for LP and Lending, as those users should all be on a 0th account_index, only savers is the exception
            // as some users may have historical non-zero account_index active address
            return getThorfiFromAddresses({
              accountId,
              assetId,
              accountMetadata,
              wallet,
            })
          })()
        ).filter(isSome)

        if (!activeAddresses) return []

        try {
          const tcyClaimers = await Promise.all(
            activeAddresses.map(address =>
              axios.get<{ tcy_claimer: TcyClaimer[] }>(
                `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/tcy_claimer/${address}`,
              ),
            ),
          )

          return tcyClaimers
            .map(response => response.data.tcy_claimer)
            .flat()
            .filter(claimer => {
              const assetId = poolAssetIdToAssetId(claimer.asset)
              if (!assetId) return false

              const chainId = fromAssetId(assetId).chainId

              if (chainId !== fromAccountId(accountId).chainId) return false

              return true
            })
            .map(claimer => ({
              ...claimer,
              accountId,
              amountThorBaseUnit: claimer.amount,
              assetId: poolAssetIdToAssetId(claimer.asset) ?? '',
            }))
        } catch (e) {
          console.error('Error fetching TCY claims', e)
          return []
        }
      },
      staleTime: 60_000,
    })),
  })
}
