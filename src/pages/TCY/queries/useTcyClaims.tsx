import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { poolAssetIdToAssetId } from '@shapeshiftoss/swapper'
import { isUtxoChainId } from '@shapeshiftoss/utils'
import { useSuspenseQueries } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo } from 'react'

import type { Claim, TcyClaimer } from '../components/Claim/types'

import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { isSome } from '@/lib/utils'
import {
  getThorchainSaversPosition,
  isSupportedThorchainSaversAssetId,
} from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectEnabledWalletAccountIds,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useTCYClaims = (accountNumber: number | 'all') => {
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const allAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const accountIds = useMemo(
    () =>
      accountNumber === 'all'
        ? allAccountIds
        : Object.values(accountIdsByAccountNumberAndChainId[accountNumber] || {})
            .flat()
            .filter(isSome),
    [accountNumber, allAccountIds, accountIdsByAccountNumberAndChainId],
  )

  return useSuspenseQueries({
    queries: accountIds.map(accountId => ({
      queryKey: ['tcy-claims', accountId],
      queryFn: async (): Promise<Claim[]> => {
        const activeAddress = await (async () => {
          // UTXO-based chains are the odd ones, for all address-based, we can simply use the `account` caip-10 part
          if (!isUtxoChainId(fromAccountId(accountId).chainId))
            return fromAccountId(accountId).account

          const chainId = fromAccountId(accountId).chainId
          const assetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()

          if (!assetId) return
          if (!isSupportedThorchainSaversAssetId(assetId)) return

          const position = await getThorchainSaversPosition({ accountId, assetId })

          if (!position) return

          return position.asset_address
        })()

        if (!activeAddress) return []

        try {
          const { data } = await axios.get<{ tcy_claimer: TcyClaimer[] }>(
            `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/tcy_claimer/${activeAddress}`,
          )
          return data.tcy_claimer
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
