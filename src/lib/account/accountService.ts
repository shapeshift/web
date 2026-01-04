import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import DataLoader from 'dataloader'
import { gql } from 'graphql-request'

import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
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
      details {
        __typename
        ... on EvmAccountDetails {
          nonce
          tokens {
            assetId
            balance
            name
            symbol
            precision
          }
        }
        ... on UtxoAccountDetails {
          addresses {
            pubkey
            balance
          }
          nextChangeAddressIndex
          nextReceiveAddressIndex
        }
        ... on CosmosAccountDetails {
          sequence
          accountNumber
          delegations
          redelegations
          undelegations
          rewards
        }
        ... on SolanaAccountDetails {
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
  }
`

type GetAccountsResponse = {
  accounts: (GraphQLAccount | null)[]
}

function graphQLToChainAdapterAccount(
  graphqlAccount: GraphQLAccount,
  chainId: ChainId,
): Account<KnownChainIds> {
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

  const baseAccount = {
    balance: graphqlAccount.balance,
    pubkey: graphqlAccount.pubkey,
    chainId: graphqlAccount.chainId,
    assetId: graphqlAccount.assetId,
    chain: chainId as KnownChainIds,
  }

  if (details?.__typename === 'EvmAccountDetails') {
    return {
      ...baseAccount,
      chainSpecific: {
        nonce: details.nonce ?? 0,
        tokens: mapTokens(details.tokens ?? graphqlAccount.tokens, 18),
      },
    } as Account<KnownChainIds>
  }

  if (details?.__typename === 'UtxoAccountDetails') {
    return {
      ...baseAccount,
      chainSpecific: {
        addresses: (details.addresses ?? []).map(a => ({
          pubkey: a.pubkey,
          balance: a.balance,
        })),
        nextChangeAddressIndex: details.nextChangeAddressIndex ?? 0,
        nextReceiveAddressIndex: details.nextReceiveAddressIndex ?? 0,
      },
    } as Account<KnownChainIds>
  }

  if (details?.__typename === 'CosmosAccountDetails') {
    return {
      ...baseAccount,
      chainSpecific: {
        sequence: details.sequence ?? '0',
        accountNumber: details.accountNumber ?? '0',
        delegations: details.delegations ?? [],
        redelegations: details.redelegations ?? [],
        undelegations: details.undelegations ?? [],
        rewards: details.rewards ?? [],
        assets: graphqlAccount.tokens.map(t => ({
          assetId: t.assetId,
          amount: t.balance,
        })),
      },
    } as Account<KnownChainIds>
  }

  if (details?.__typename === 'SolanaAccountDetails') {
    return {
      ...baseAccount,
      chainSpecific: {
        tokens: mapTokens(details.tokens ?? graphqlAccount.tokens, 9),
      },
    } as Account<KnownChainIds>
  }

  return {
    ...baseAccount,
    chainSpecific: {
      tokens: mapTokens(graphqlAccount.tokens, 18),
    },
  } as Account<KnownChainIds>
}

export function checkAccountHasActivity(graphqlAccount: GraphQLAccount): boolean {
  const hasBalance = graphqlAccount.balance !== '0' && graphqlAccount.balance !== ''
  const hasTokens = graphqlAccount.tokens.some(t => t.balance !== '0' && t.balance !== '')
  const details = graphqlAccount.details
  const hasSequence =
    details?.__typename === 'CosmosAccountDetails' &&
    details.sequence !== undefined &&
    details.sequence !== null &&
    details.sequence !== '0'
  return hasBalance || hasTokens || hasSequence
}

export type AccountServiceResult = {
  account: Account<KnownChainIds>
  graphqlAccount: GraphQLAccount | null
  hasActivity: boolean
}

async function batchLoadAccountsViaChainAdapters(
  accountIds: readonly AccountId[],
  store: any,
  portfolio: any,
  assetSlice: any,
  accountToPortfolio: any,
  makeAssets: any,
): Promise<(AccountServiceResult | null)[]> {
  const chainAdapters = getChainAdapterManager()
  const state = store.getState()
  const assetIds = state.assets.ids as string[]
  const results: (AccountServiceResult | null)[] = []

  for (const accountId of accountIds) {
    const { chainId, account: pubkey } = fromAccountId(accountId)
    const adapter = chainAdapters.get(chainId)

    if (!adapter) {
      results.push(null)
      continue
    }

    try {
      console.time(`[PERF] AccountService: adapter.getAccount(${accountId})`)
      const account = await adapter.getAccount(pubkey)
      console.timeEnd(`[PERF] AccountService: adapter.getAccount(${accountId})`)
      const portfolioAccounts = { [pubkey]: account }
      const hasBalance = account.balance !== '0' && account.balance !== ''

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
        account,
        graphqlAccount: null,
        hasActivity: hasBalance,
      })
    } catch (error) {
      console.error(`[AccountService] Chain adapter fetch failed for ${accountId}:`, error)
      results.push(null)
    }
  }

  return results
}

async function batchLoadAccountsViaGraphQL(
  accountIds: readonly AccountId[],
  store: any,
  portfolio: any,
  assetSlice: any,
  accountToPortfolio: any,
  makeAssets: any,
): Promise<(AccountServiceResult | null)[]> {
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
}

async function batchLoadAccounts(
  accountIds: readonly AccountId[],
): Promise<(AccountServiceResult | null)[]> {
  if (accountIds.length === 0) return []

  const isGraphQLEnabled = getConfig().VITE_FEATURE_GRAPHQL_POC

  console.log(
    `[PERF] AccountService: Batching ${accountIds.length} accounts via ${
      isGraphQLEnabled ? 'GraphQL' : 'chain adapters'
    }`,
  )
  console.time(`[PERF] AccountService: Batch load ${accountIds.length} accounts`)

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
    let results: (AccountServiceResult | null)[]
    if (isGraphQLEnabled) {
      console.time(`[PERF] AccountService: GraphQL batch for ${accountIds.length} accounts`)
      results = await batchLoadAccountsViaGraphQL(
        accountIds,
        store,
        portfolio,
        assetSlice,
        accountToPortfolio,
        makeAssets,
      )
      console.timeEnd(`[PERF] AccountService: GraphQL batch for ${accountIds.length} accounts`)
    } else {
      console.time(`[PERF] AccountService: Chain adapters batch for ${accountIds.length} accounts`)
      results = await batchLoadAccountsViaChainAdapters(
        accountIds,
        store,
        portfolio,
        assetSlice,
        accountToPortfolio,
        makeAssets,
      )
      console.timeEnd(
        `[PERF] AccountService: Chain adapters batch for ${accountIds.length} accounts`,
      )
    }
    console.timeEnd(`[PERF] AccountService: Batch load ${accountIds.length} accounts`)
    return results
  } catch (error) {
    console.error('[PERF] AccountService: Batch load failed:', error)
    console.timeEnd(`[PERF] AccountService: Batch load ${accountIds.length} accounts`)
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
