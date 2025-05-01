import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { poolAssetIdToAssetId } from '@shapeshiftoss/swapper'
import { isUtxoChainId } from '@shapeshiftoss/utils'
import { useQueries } from '@tanstack/react-query'
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
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useTCYClaims = (accountNumber: number) => {
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

  return useQueries({
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

          // TODO(gomes): this may or may not become an issue depending on how TCY aggregates things across THORFi
          // We may have to introspect all THORFi bits and get positions across all of them, which *may* have different addresses for UTXOs (account-based)
          // That should be super edge-case, as most users should have their position account_index 0, but there may be a selected few unlucky which do not
          // (got into savers before we defaulted to 0th account_index addy)
          // Wait and see when this goes live
          const position = await getThorchainSaversPosition({ accountId, assetId })

          if (!position) return

          return position.asset_address
        })()

        if (!activeAddress) return []

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
      },
    })),
  })
}
