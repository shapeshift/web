import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import DataLoader from 'dataloader'
import { gql } from 'graphql-request'

import type { GraphQLAccount } from '@/lib/graphql/accountData'
import { getGraphQLClient } from '@/lib/graphql/client'

const BATCH_WINDOW_MS = 1000

const GET_ACCOUNTS = gql`
  query GetAccounts($accountIds: [String!]!) {
    accounts(accountIds: $accountIds) {
      id
      balance
      pubkey
      chainId
      assetId
      tokens {
        assetId
        balance
        name
        symbol
        precision
      }
      evmData {
        nonce
        tokens {
          assetId
          balance
          name
          symbol
          precision
        }
      }
      utxoData {
        addresses {
          pubkey
          balance
        }
        nextChangeAddressIndex
        nextReceiveAddressIndex
      }
      cosmosData {
        sequence
        accountNumber
        delegations
        redelegations
        undelegations
        rewards
      }
      solanaData {
        tokens {
          assetId
          balance
          name
          symbol
          precision
        }
      }
    }
  }
`

type GetAccountsResponse = {
  accounts: (GraphQLAccount | null)[]
}

function graphQLToChainAdapterAccount(
  graphqlAccount: GraphQLAccount,
  chainId: ChainId,
): Account<KnownChainIds> {
  const chainPrefix = chainId.split(':')[0]

  switch (chainPrefix) {
    case 'eip155':
      return {
        balance: graphqlAccount.balance,
        pubkey: graphqlAccount.pubkey,
        chainId: graphqlAccount.chainId,
        assetId: graphqlAccount.assetId,
        chain: chainId as KnownChainIds,
        chainSpecific: {
          nonce: graphqlAccount.evmData?.nonce ?? 0,
          tokens: (graphqlAccount.evmData?.tokens ?? graphqlAccount.tokens).map(t => ({
            assetId: t.assetId,
            balance: t.balance,
            symbol: t.symbol ?? '',
            name: t.name ?? '',
            precision: t.precision ?? 18,
          })),
        },
      } as Account<KnownChainIds>

    case 'bip122':
      return {
        balance: graphqlAccount.balance,
        pubkey: graphqlAccount.pubkey,
        chainId: graphqlAccount.chainId,
        assetId: graphqlAccount.assetId,
        chain: chainId as KnownChainIds,
        chainSpecific: {
          addresses: (graphqlAccount.utxoData?.addresses ?? []).map(a => ({
            pubkey: a.pubkey,
            balance: a.balance,
          })),
          nextChangeAddressIndex: graphqlAccount.utxoData?.nextChangeAddressIndex ?? 0,
          nextReceiveAddressIndex: graphqlAccount.utxoData?.nextReceiveAddressIndex ?? 0,
        },
      } as Account<KnownChainIds>

    case 'cosmos':
      return {
        balance: graphqlAccount.balance,
        pubkey: graphqlAccount.pubkey,
        chainId: graphqlAccount.chainId,
        assetId: graphqlAccount.assetId,
        chain: chainId as KnownChainIds,
        chainSpecific: {
          sequence: graphqlAccount.cosmosData?.sequence ?? '0',
          accountNumber: graphqlAccount.cosmosData?.accountNumber ?? '0',
          delegations: graphqlAccount.cosmosData?.delegations ?? [],
          redelegations: graphqlAccount.cosmosData?.redelegations ?? [],
          undelegations: graphqlAccount.cosmosData?.undelegations ?? [],
          rewards: graphqlAccount.cosmosData?.rewards ?? [],
          assets: graphqlAccount.tokens.map(t => ({
            assetId: t.assetId,
            amount: t.balance,
          })),
        },
      } as Account<KnownChainIds>

    case 'solana':
      return {
        balance: graphqlAccount.balance,
        pubkey: graphqlAccount.pubkey,
        chainId: graphqlAccount.chainId,
        assetId: graphqlAccount.assetId,
        chain: chainId as KnownChainIds,
        chainSpecific: {
          tokens: (graphqlAccount.solanaData?.tokens ?? graphqlAccount.tokens).map(t => ({
            assetId: t.assetId,
            balance: t.balance,
            symbol: t.symbol ?? '',
            name: t.name ?? '',
            precision: t.precision ?? 9,
          })),
        },
      } as Account<KnownChainIds>

    default:
      return {
        balance: graphqlAccount.balance,
        pubkey: graphqlAccount.pubkey,
        chainId: graphqlAccount.chainId,
        assetId: graphqlAccount.assetId,
        chain: chainId as KnownChainIds,
        chainSpecific: {
          tokens: graphqlAccount.tokens.map(t => ({
            assetId: t.assetId,
            balance: t.balance,
            symbol: t.symbol ?? '',
            name: t.name ?? '',
            precision: t.precision ?? 18,
          })),
        },
      } as Account<KnownChainIds>
  }
}

export function checkAccountHasActivity(graphqlAccount: GraphQLAccount): boolean {
  const hasBalance = graphqlAccount.balance !== '0' && graphqlAccount.balance !== ''
  const hasTokens = graphqlAccount.tokens.some(t => t.balance !== '0' && t.balance !== '')
  const hasSequence =
    graphqlAccount.cosmosData?.sequence !== undefined &&
    graphqlAccount.cosmosData.sequence !== null &&
    graphqlAccount.cosmosData.sequence !== '0'
  return hasBalance || hasTokens || hasSequence
}

export type AccountServiceResult = {
  account: Account<KnownChainIds>
  graphqlAccount: GraphQLAccount
  hasActivity: boolean
}

async function batchLoadAccounts(
  accountIds: readonly AccountId[],
): Promise<(AccountServiceResult | null)[]> {
  if (accountIds.length === 0) return []

  console.log(`[AccountService] Batching ${accountIds.length} accounts into single request`)

  const [{ store }, { portfolio }, { assets: assetSlice }, { accountToPortfolio, makeAssets }] =
    await Promise.all([
      import('@/state/store'),
      import('@/state/slices/portfolioSlice/portfolioSlice'),
      import('@/state/slices/assetsSlice/assetsSlice'),
      import('@/state/slices/portfolioSlice/utils'),
    ])

  accountIds.forEach(accountId => {
    store.dispatch(
      portfolio.actions.setIsPortfolioGetAccountLoading({ accountId, isLoading: true }),
    )
  })

  try {
    const client = getGraphQLClient()
    const response = await client.request<GetAccountsResponse>(GET_ACCOUNTS, {
      accountIds: [...accountIds],
    })

    const resultMap = new Map<string, GraphQLAccount>()
    for (const acc of response.accounts) {
      if (acc) resultMap.set(acc.id, acc)
    }

    const state = store.getState()
    const assetIds = state.assets.ids as string[]
    const results: (AccountServiceResult | null)[] = []

    for (const accountId of accountIds) {
      const graphqlAccount = resultMap.get(accountId)

      if (!graphqlAccount) {
        results.push(null)
        continue
      }

      const { chainId, account: pubkey } = fromAccountId(accountId)
      const chainAdapterAccount = graphQLToChainAdapterAccount(graphqlAccount, chainId)
      const hasActivity = checkAccountHasActivity(graphqlAccount)

      const portfolioAccounts = { [pubkey]: chainAdapterAccount }

      const newAssets = await makeAssets({
        chainId,
        pubkey,
        state,
        portfolioAccounts,
      })

      if (newAssets) {
        store.dispatch(assetSlice.actions.upsertAssets(newAssets))
      }

      const accountPortfolio = accountToPortfolio({
        portfolioAccounts,
        assetIds: assetIds.concat(newAssets?.ids ?? []),
      })

      store.dispatch(portfolio.actions.upsertPortfolio(accountPortfolio))

      results.push({
        account: chainAdapterAccount,
        graphqlAccount,
        hasActivity,
      })
    }

    return results
  } catch (error) {
    console.error('[AccountService] Batch load failed:', error)
    return accountIds.map(() => null)
  } finally {
    accountIds.forEach(accountId => {
      store.dispatch(
        portfolio.actions.setIsPortfolioGetAccountLoading({ accountId, isLoading: false }),
      )
    })
  }
}

let loader: DataLoader<AccountId, AccountServiceResult | null> | null = null

function getLoader(): DataLoader<AccountId, AccountServiceResult | null> {
  if (!loader) {
    loader = new DataLoader<AccountId, AccountServiceResult | null>(batchLoadAccounts, {
      cache: true,
      maxBatchSize: 100,
      batchScheduleFn: callback => {
        setTimeout(callback, BATCH_WINDOW_MS)
      },
    })
  }
  return loader
}

export const accountService = {
  async loadAccount(accountId: AccountId): Promise<AccountServiceResult | null> {
    const result = await getLoader().load(accountId)
    if (result instanceof Error) {
      console.error('[AccountService] Load error:', result)
      return null
    }
    return result
  },

  async loadAccounts(accountIds: AccountId[]): Promise<(AccountServiceResult | null)[]> {
    const results = await getLoader().loadMany(accountIds)
    return results.map(r => (r instanceof Error ? null : r))
  },

  clearCache(): void {
    if (loader) {
      loader.clearAll()
    }
  },

  clearAccountCache(accountId: AccountId): void {
    if (loader) {
      loader.clear(accountId)
    }
  },

  primeCache(accountId: AccountId, result: AccountServiceResult): void {
    getLoader().prime(accountId, result)
  },
}
