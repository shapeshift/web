import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { matchSorter } from 'match-sorter'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { deriveAccountIdsAndMetadata } from '@/lib/account/account'
import type { GraphQLAccount } from '@/lib/graphql'
import { fetchAccountsGraphQL } from '@/lib/graphql'
import { isSome } from '@/lib/utils'
import { accountManagement } from '@/react-queries/queries/accountManagement'
import { checkAccountHasActivity } from '@/state/slices/portfolioSlice/utils'
import { selectFeatureFlag } from '@/state/slices/preferencesSlice/selectors'
import { store } from '@/state/store'

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

const checkGraphQLAccountHasActivity = (account: GraphQLAccount): boolean => {
  const hasBalance = account.balance !== '0' && account.balance !== ''
  const hasTokens = account.tokens.some(t => t.balance !== '0' && t.balance !== '')
  const details = account.details
  const hasSequence =
    details?.__typename === 'CosmosAccountDetails' &&
    details.sequence !== undefined &&
    details.sequence !== null &&
    details.sequence !== '0'
  return hasBalance || hasTokens || hasSequence
}

export const getAccountIdsWithActivityAndMetadata = async (
  accountNumber: number,
  chainId: ChainId,
  wallet: HDWallet | null,
  isSnapInstalled: boolean,
) => {
  if (!wallet) return []
  const input = { accountNumber, chainIds: [chainId], wallet, isSnapInstalled }
  const accountIdsAndMetadata = await deriveAccountIdsAndMetadata(input)

  const accountIds = Object.keys(accountIdsAndMetadata) as AccountId[]

  const isGraphQLEnabled = selectFeatureFlag(store.getState(), 'GraphQLPoc')

  if (isGraphQLEnabled && accountIds.length > 0) {
    try {
      console.log(`[GraphQL] Fetching ${accountIds.length} accounts for chain ${chainId}`)
      const accounts = await fetchAccountsGraphQL(accountIds)

      return accountIds.map(accountId => {
        const account = accounts[accountId]
        const hasActivity = account ? checkGraphQLAccountHasActivity(account) : false
        return {
          accountId,
          accountMetadata: accountIdsAndMetadata[accountId],
          hasActivity,
        }
      })
    } catch (error) {
      console.error('[GraphQL] Failed to fetch accounts, falling back to legacy:', error)
    }
  }

  return Promise.all(
    Object.entries(accountIdsAndMetadata).map(async ([accountId, accountMetadata]) => {
      const account = await queryClient.fetchQuery({
        ...accountManagement.getAccount(accountId),
        staleTime: Infinity,
        gcTime: Infinity,
      })

      const hasActivity = checkAccountHasActivity(account)

      return { accountId, accountMetadata, hasActivity }
    }),
  )
}
