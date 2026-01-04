import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'

import type { GraphQLAccount } from '@/lib/graphql'
import { assertGetChainAdapter } from '@/lib/utils'

const getGraphQLAccountData = async (
  accountId: AccountId,
): Promise<{ isEnabled: boolean; account: GraphQLAccount | null }> => {
  const { store } = await import('@/state/store')
  const { selectFeatureFlag } = await import('@/state/slices/preferencesSlice/selectors')
  const isEnabled = selectFeatureFlag(store.getState(), 'GraphQLPoc')

  if (!isEnabled) {
    return { isEnabled: false, account: null }
  }

  const { fetchAccountsGraphQL } = await import('@/lib/graphql')
  const accounts = await fetchAccountsGraphQL([accountId])
  return { isEnabled: true, account: accounts[accountId] ?? null }
}

function graphQLAccountToChainAdapterAccount(
  graphqlAccount: GraphQLAccount,
  chainId: ChainId,
): Account<KnownChainIds> {
  const baseAccount = {
    balance: graphqlAccount.balance,
    pubkey: graphqlAccount.pubkey,
    chainId: graphqlAccount.chainId,
    assetId: graphqlAccount.assetId,
    chain: chainId as KnownChainIds,
  }

  const details = graphqlAccount.details

  const mapTokens = (
    tokens: {
      assetId: string
      balance: string
      symbol: string | null
      name: string | null
      precision: number | null
    }[],
    defaultPrecision: number,
  ) =>
    tokens.map(t => ({
      assetId: t.assetId,
      balance: t.balance,
      symbol: t.symbol ?? '',
      name: t.name ?? '',
      precision: t.precision ?? defaultPrecision,
    }))

  if (details?.__typename === 'EvmAccountDetails') {
    return {
      ...baseAccount,
      nonce: details.nonce ?? 0,
      tokens: mapTokens(details.tokens ?? graphqlAccount.tokens, 18),
    } as unknown as Account<KnownChainIds>
  }

  if (details?.__typename === 'UtxoAccountDetails') {
    return {
      ...baseAccount,
      addresses: (details.addresses ?? []).map(a => ({
        pubkey: a.pubkey,
        balance: a.balance,
      })),
      nextChangeAddressIndex: details.nextChangeAddressIndex ?? undefined,
      nextReceiveAddressIndex: details.nextReceiveAddressIndex ?? undefined,
    } as unknown as Account<KnownChainIds>
  }

  if (details?.__typename === 'CosmosAccountDetails') {
    return {
      ...baseAccount,
      sequence: details.sequence ?? undefined,
      accountNumber: details.accountNumber ?? undefined,
      delegations: details.delegations ?? [],
      redelegations: details.redelegations ?? [],
      undelegations: details.undelegations ?? [],
      rewards: details.rewards ?? [],
    } as unknown as Account<KnownChainIds>
  }

  if (details?.__typename === 'SolanaAccountDetails') {
    return {
      ...baseAccount,
      tokens: mapTokens(details.tokens ?? graphqlAccount.tokens, 9),
    } as unknown as Account<KnownChainIds>
  }

  return {
    ...baseAccount,
    tokens: mapTokens(graphqlAccount.tokens, 18),
  } as unknown as Account<KnownChainIds>
}

export const accountManagement = createQueryKeys('accountManagement', {
  getAccount: (accountId: AccountId) => ({
    queryKey: ['getAccount', accountId],
    queryFn: async () => {
      const { chainId, account: pubkey } = fromAccountId(accountId)

      try {
        const { isEnabled, account: graphqlAccount } = await getGraphQLAccountData(accountId)
        if (isEnabled && graphqlAccount) {
          return graphQLAccountToChainAdapterAccount(graphqlAccount, chainId)
        }
      } catch (error) {
        console.error('[GraphQL] Failed to fetch account, falling back to chain adapter:', error)
      }

      const adapter = assertGetChainAdapter(chainId)
      const account = await adapter.getAccount(pubkey)
      return account
    },
  }),
})
