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

  const chainPrefix = chainId.split(':')[0]

  switch (chainPrefix) {
    case 'eip155':
      return {
        ...baseAccount,
        nonce: graphqlAccount.evmData?.nonce ?? 0,
        tokens: (graphqlAccount.evmData?.tokens ?? graphqlAccount.tokens).map(t => ({
          assetId: t.assetId,
          balance: t.balance,
          symbol: t.symbol ?? '',
          name: t.name ?? '',
          precision: t.precision ?? 18,
        })),
      } as unknown as Account<KnownChainIds>

    case 'bip122':
      return {
        ...baseAccount,
        addresses: (graphqlAccount.utxoData?.addresses ?? []).map(a => ({
          pubkey: a.pubkey,
          balance: a.balance,
        })),
        nextChangeAddressIndex: graphqlAccount.utxoData?.nextChangeAddressIndex ?? undefined,
        nextReceiveAddressIndex: graphqlAccount.utxoData?.nextReceiveAddressIndex ?? undefined,
      } as unknown as Account<KnownChainIds>

    case 'cosmos':
      return {
        ...baseAccount,
        sequence: graphqlAccount.cosmosData?.sequence ?? undefined,
        accountNumber: graphqlAccount.cosmosData?.accountNumber ?? undefined,
        delegations: graphqlAccount.cosmosData?.delegations ?? [],
        redelegations: graphqlAccount.cosmosData?.redelegations ?? [],
        undelegations: graphqlAccount.cosmosData?.undelegations ?? [],
        rewards: graphqlAccount.cosmosData?.rewards ?? [],
      } as unknown as Account<KnownChainIds>

    case 'solana':
      return {
        ...baseAccount,
        tokens: (graphqlAccount.solanaData?.tokens ?? graphqlAccount.tokens).map(t => ({
          assetId: t.assetId,
          balance: t.balance,
          symbol: t.symbol ?? '',
          name: t.name ?? '',
          precision: t.precision ?? 9,
        })),
      } as unknown as Account<KnownChainIds>

    default:
      return {
        ...baseAccount,
        tokens: graphqlAccount.tokens.map(t => ({
          assetId: t.assetId,
          balance: t.balance,
          symbol: t.symbol ?? '',
          name: t.name ?? '',
          precision: t.precision ?? 18,
        })),
      } as unknown as Account<KnownChainIds>
  }
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
