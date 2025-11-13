import type { ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { matchSorter } from 'match-sorter'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { deriveAccountIdsAndMetadata } from '@/lib/account/account'
import { isSome } from '@/lib/utils'
import { accountManagement } from '@/react-queries/queries/accountManagement'
import { checkAccountHasActivity } from '@/state/slices/portfolioSlice/utils'

export const filterChainIdsBySearchTerm = (search: string, chainIds: ChainId[]) => {
  if (!chainIds.length) return []

  const chainAdapterManager = getChainAdapterManager()

  const chainMetadata = chainIds
    .map(chainId => {
      const adapter = chainAdapterManager.get(chainId)
      if (!adapter) return undefined

      return {
        displayName: adapter.getDisplayName(),
        chainId,
      }
    })
    .filter(isSome)

  return matchSorter(chainMetadata, search, {
    keys: ['displayName'],
    threshold: matchSorter.rankings.CONTAINS,
  }).map(({ chainId }) => chainId)
}

export const getAccountIdsWithActivityAndMetadata = async (
  accountNumber: number,
  chainId: ChainId,
  wallet: HDWallet | null,
  isSnapInstalled: boolean,
) => {
  console.log({ accountNumber, chainId, wallet })
  if (!wallet) return []
  const input = { accountNumber, chainIds: [chainId], wallet, isSnapInstalled }
  const accountIdsAndMetadata = await deriveAccountIdsAndMetadata(input)

  return Promise.all(
    Object.entries(accountIdsAndMetadata).map(async ([accountId, accountMetadata]) => {
      const account = await queryClient.fetchQuery({
        ...accountManagement.getAccount(accountId),
        staleTime: Infinity,
        // Never garbage collect me, I'm a special snowflake
        gcTime: Infinity,
      })

      const hasActivity = checkAccountHasActivity(account)

      return { accountId, accountMetadata, hasActivity }
    }),
  )
}
