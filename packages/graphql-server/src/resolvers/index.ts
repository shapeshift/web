import type DataLoader from 'dataloader'
import { GraphQLError } from 'graphql'
import { PubSub } from 'graphql-subscriptions'

import type { CoingeckoSortKey } from '../datasources/coingeckoService.js'
import {
  getMarkets,
  getPriceHistory,
  getRecentlyAdded,
  getTopMarkets,
  getTopMovers,
  getTrending,
} from '../datasources/coingeckoService.js'
import {
  getOrders,
  ORDERS_UPDATED_TOPIC,
  subscribeToOrders,
  unsubscribeFromOrders,
} from '../datasources/cowswapService.js'
import {
  getPortalsAccount,
  getPortalsAccounts,
  getPortalsPlatforms,
} from '../datasources/portalsService.js'
import type { ThornodeNetwork } from '../datasources/thornodeService.js'
import {
  getBlock,
  getInboundAddresses,
  getMimir,
  getPool,
  getPoolBorrowers,
  getPools,
  getPoolSavers,
  getTcyClaims,
} from '../datasources/thornodeService.js'
import type { Account } from '../loaders/accountLoader.js'
import type { MarketData } from '../loaders/marketLoader.js'
import type { TxHistoryResult } from '../loaders/txLoader.js'

const MAX_ASSET_IDS = 500
const MAX_ACCOUNT_IDS = 100
const MAX_TX_ACCOUNT_IDS = 50
const MAX_ORDER_ACCOUNT_IDS = 20

export const pubsub = new PubSub()

export type Context = {
  loaders: {
    marketData: DataLoader<string, MarketData | null>
    accounts: DataLoader<string, Account | null>
    transactions: DataLoader<string, TxHistoryResult>
  }
}

type MarketOrderField =
  | 'MARKET_CAP_DESC'
  | 'MARKET_CAP_ASC'
  | 'VOLUME_DESC'
  | 'VOLUME_ASC'
  | 'PRICE_CHANGE_24H_DESC'
  | 'PRICE_CHANGE_24H_ASC'

function marketOrderFieldToCoingeckoSort(field: MarketOrderField): CoingeckoSortKey {
  const mapping: Record<MarketOrderField, CoingeckoSortKey> = {
    MARKET_CAP_DESC: 'market_cap_desc',
    MARKET_CAP_ASC: 'market_cap_asc',
    VOLUME_DESC: 'volume_desc',
    VOLUME_ASC: 'volume_asc',
    PRICE_CHANGE_24H_DESC: 'price_change_percentage_24h_desc',
    PRICE_CHANGE_24H_ASC: 'price_change_percentage_24h_asc',
  }
  return mapping[field] || 'market_cap_desc'
}

export const resolvers = {
  AccountDetails: {
    __resolveType(obj: {
      __typename?: string
      nonce?: number
      addresses?: unknown[]
      sequence?: string
      tokens?: unknown[]
    }) {
      if (obj.__typename) return obj.__typename
      if ('nonce' in obj && typeof obj.nonce === 'number') return 'EvmAccountDetails'
      if ('addresses' in obj && Array.isArray(obj.addresses)) return 'UtxoAccountDetails'
      if ('sequence' in obj || 'delegations' in obj) return 'CosmosAccountDetails'
      if ('tokens' in obj && !('nonce' in obj)) return 'SolanaAccountDetails'
      return null
    },
  },

  Account: {
    details: (account: Account) => {
      if (account.evmData) {
        return { __typename: 'EvmAccountDetails', ...account.evmData }
      }
      if (account.utxoData) {
        return { __typename: 'UtxoAccountDetails', ...account.utxoData }
      }
      if (account.cosmosData) {
        return { __typename: 'CosmosAccountDetails', ...account.cosmosData }
      }
      if (account.solanaData) {
        return { __typename: 'SolanaAccountDetails', ...account.solanaData }
      }
      return null
    },
  },

  TrendingAsset: {
    images: (coin: { thumb?: string; small?: string; large?: string }) => ({
      thumb: coin.thumb ?? null,
      small: coin.small ?? null,
      large: coin.large ?? null,
    }),
    assetId: () => null,
  },

  MovingAsset: {
    images: (coin: { thumb?: string; small?: string; large?: string }) => ({
      thumb: coin.thumb ?? null,
      small: coin.small ?? null,
      large: coin.large ?? null,
    }),
    assetId: () => null,
  },

  RecentAsset: {
    assetId: () => null,
  },

  MarketAsset: {
    assetId: () => null,
  },

  Market: {
    trending: async (_parent: unknown, args: { limit?: number }) => {
      const limit = args.limit ?? 10
      console.log(`[Market.trending] Fetching ${limit} trending coins`)
      const coins = await getTrending()
      return coins.slice(0, limit)
    },

    movers: () => {
      console.log('[Market.movers] Fetching top movers')
      return getTopMovers()
    },

    recentlyAdded: async (_parent: unknown, args: { limit?: number }) => {
      const limit = args.limit ?? 20
      console.log(`[Market.recentlyAdded] Fetching ${limit} recently added`)
      const coins = await getRecentlyAdded()
      return coins.slice(0, limit)
    },

    topAssets: async (
      _parent: unknown,
      args: { first?: number; after?: string; orderBy?: MarketOrderField },
    ) => {
      const first = args.first ?? 100
      const orderBy = args.orderBy ?? 'MARKET_CAP_DESC'
      const sortKey = marketOrderFieldToCoingeckoSort(orderBy)

      console.log(`[Market.topAssets] Fetching ${first} assets (order=${orderBy})`)
      const allAssets = await getTopMarkets(first, sortKey)

      let startIndex = 0
      if (args.after) {
        const decoded = Buffer.from(args.after, 'base64').toString('utf8')
        startIndex = parseInt(decoded, 10) + 1
      }

      const sliced = allAssets.slice(startIndex, startIndex + first)
      const edges = sliced.map((asset, index) => ({
        cursor: Buffer.from(String(startIndex + index)).toString('base64'),
        node: asset,
      }))

      return {
        edges,
        pageInfo: {
          hasNextPage: startIndex + first < allAssets.length,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: allAssets.length,
      }
    },

    data: async (_parent: unknown, args: { assetIds: string[] }, context: Context) => {
      if (args.assetIds.length > MAX_ASSET_IDS) {
        throw new GraphQLError(`Too many assetIds requested (max ${MAX_ASSET_IDS})`, {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      console.log(`[Market.data] Requested ${args.assetIds.length} assets`)

      const results = await Promise.all(
        args.assetIds.map(async assetId => {
          try {
            const data = await context.loaders.marketData.load(assetId)
            if (!data) {
              return {
                data: null,
                error: {
                  code: 'ASSET_NOT_FOUND',
                  message: `No market data found for asset: ${assetId}`,
                  assetId,
                },
              }
            }
            return { data, error: null }
          } catch (e) {
            return {
              data: null,
              error: {
                code: 'API_ERROR',
                message: e instanceof Error ? e.message : 'Unknown error',
                assetId,
              },
            }
          }
        }),
      )

      return results
    },

    priceHistory: (_parent: unknown, args: { coingeckoId: string; from: number; to: number }) => {
      console.log(
        `[Market.priceHistory] Fetching history for ${args.coingeckoId} (${args.from}-${args.to})`,
      )
      return getPriceHistory(args.coingeckoId, args.from, args.to)
    },
  },

  Query: {
    health: () => 'OK',

    market: () => ({}),

    coingeckoTrending: () => {
      console.log('[Query.coingeckoTrending] Fetching trending coins')
      return getTrending()
    },

    coingeckoTopMovers: () => {
      console.log('[Query.coingeckoTopMovers] Fetching top movers')
      return getTopMovers()
    },

    coingeckoRecentlyAdded: () => {
      console.log('[Query.coingeckoRecentlyAdded] Fetching recently added')
      return getRecentlyAdded()
    },

    coingeckoMarkets: (
      _parent: unknown,
      args: { order: CoingeckoSortKey; page?: number; perPage?: number },
    ) => {
      const { order, page = 1, perPage = 100 } = args
      console.log(`[Query.coingeckoMarkets] Fetching markets (order=${order}, page=${page})`)
      return getMarkets(order, page, perPage)
    },

    coingeckoTopMarkets: (_parent: unknown, args: { count?: number; order?: CoingeckoSortKey }) => {
      const { count = 2500, order = 'market_cap_desc' } = args
      console.log(`[Query.coingeckoTopMarkets] Fetching top ${count} markets`)
      return getTopMarkets(count, order)
    },

    coingeckoPriceHistory: (
      _parent: unknown,
      args: { coingeckoId: string; from: number; to: number },
    ) => {
      console.log(
        `[Query.coingeckoPriceHistory] Fetching history for ${args.coingeckoId} (${args.from}-${args.to})`,
      )
      return getPriceHistory(args.coingeckoId, args.from, args.to)
    },

    marketData: async (_parent: unknown, args: { assetIds: string[] }, context: Context) => {
      if (args.assetIds.length > MAX_ASSET_IDS) {
        throw new GraphQLError(`Too many assetIds requested (max ${MAX_ASSET_IDS})`, {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      console.log(`[Query.marketData] Requested ${args.assetIds.length} assets`)

      const results = await Promise.all(
        args.assetIds.map(async assetId => {
          try {
            const data = await context.loaders.marketData.load(assetId)
            if (!data) {
              return {
                data: null,
                error: {
                  code: 'ASSET_NOT_FOUND',
                  message: `No market data found for asset: ${assetId}`,
                  assetId,
                },
              }
            }
            return { data, error: null }
          } catch (e) {
            return {
              data: null,
              error: {
                code: 'API_ERROR',
                message: e instanceof Error ? e.message : 'Unknown error',
                assetId,
              },
            }
          }
        }),
      )

      return results
    },

    accounts: async (_parent: unknown, args: { accountIds: string[] }, context: Context) => {
      if (args.accountIds.length > MAX_ACCOUNT_IDS) {
        throw new GraphQLError(`Too many accountIds requested (max ${MAX_ACCOUNT_IDS})`, {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      console.log(`[Query.accounts] Requested ${args.accountIds.length} accounts`)

      const results = await Promise.all(
        args.accountIds.map(accountId => context.loaders.accounts.load(accountId)),
      )

      return results
    },

    transactions: async (
      _parent: unknown,
      args: { accountIds: string[]; limit?: number },
      context: Context,
    ) => {
      if (args.accountIds.length > MAX_TX_ACCOUNT_IDS) {
        throw new GraphQLError(`Too many accountIds requested (max ${MAX_TX_ACCOUNT_IDS})`, {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      console.log(
        `[Query.transactions] Requested tx history for ${args.accountIds.length} accounts`,
      )

      const results = await Promise.all(
        args.accountIds.map(accountId => context.loaders.transactions.load(accountId)),
      )

      const allTransactionsWithAccountId = results.flatMap(result =>
        result.transactions.map(tx => ({
          tx,
          accountId: result.accountId,
        })),
      )

      allTransactionsWithAccountId.sort((a, b) => (b.tx.blockTime || 0) - (a.tx.blockTime || 0))

      const limit = args.limit || 50
      const limitedTransactions = allTransactionsWithAccountId.slice(0, limit)

      const edges = limitedTransactions.map(({ tx, accountId }, index) => ({
        node: tx,
        cursor: Buffer.from(`${tx.txid}:${index}`).toString('base64'),
        accountId,
      }))

      return {
        edges,
        pageInfo: {
          hasNextPage: allTransactionsWithAccountId.length > limit,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      }
    },

    tcyClaims: async (
      _parent: unknown,
      args: { addresses: string[]; network?: ThornodeNetwork },
    ) => {
      const network = args.network ?? 'thorchain'
      console.log(
        `[Query.tcyClaims] Fetching claims for ${args.addresses.length} addresses on ${network}`,
      )
      return await getTcyClaims(args.addresses, network)
    },

    thornodePools: async (
      _parent: unknown,
      args: { network?: ThornodeNetwork; first?: number; after?: string },
    ) => {
      const network = args.network ?? 'thorchain'
      const first = args.first ?? 100

      console.log(`[Query.thornodePools] Fetching pools for ${network}`)
      const allPools = await getPools(network)

      let startIndex = 0
      if (args.after) {
        const decoded = Buffer.from(args.after, 'base64').toString('utf8')
        startIndex = parseInt(decoded, 10) + 1
      }

      const sliced = allPools.slice(startIndex, startIndex + first)
      const edges = sliced.map((pool, index) => ({
        cursor: Buffer.from(String(startIndex + index)).toString('base64'),
        node: pool,
      }))

      return {
        edges,
        pageInfo: {
          hasNextPage: startIndex + first < allPools.length,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: allPools.length,
      }
    },

    thornodePoolsLegacy: (_parent: unknown, args: { network?: ThornodeNetwork }) => {
      const network = args.network ?? 'thorchain'
      console.log(`[Query.thornodePoolsLegacy] Fetching pools for ${network}`)
      return getPools(network)
    },

    thornodePool: (_parent: unknown, args: { asset: string; network?: ThornodeNetwork }) => {
      const network = args.network ?? 'thorchain'
      console.log(`[Query.thornodePool] Fetching pool ${args.asset} for ${network}`)
      return getPool(args.asset, network)
    },

    thornodeMimir: (_parent: unknown, args: { network?: ThornodeNetwork }) => {
      const network = args.network ?? 'thorchain'
      console.log(`[Query.thornodeMimir] Fetching mimir for ${network}`)
      return getMimir(network)
    },

    thornodeBlock: (_parent: unknown, args: { network?: ThornodeNetwork }) => {
      const network = args.network ?? 'thorchain'
      console.log(`[Query.thornodeBlock] Fetching block for ${network}`)
      return getBlock(network)
    },

    thornodeInboundAddresses: (_parent: unknown, args: { network?: ThornodeNetwork }) => {
      const network = args.network ?? 'thorchain'
      console.log(`[Query.thornodeInboundAddresses] Fetching inbound addresses for ${network}`)
      return getInboundAddresses(network)
    },

    thornodePoolBorrowers: (
      _parent: unknown,
      args: { asset: string; network?: ThornodeNetwork },
    ) => {
      const network = args.network ?? 'thorchain'
      console.log(
        `[Query.thornodePoolBorrowers] Fetching borrowers for ${args.asset} on ${network}`,
      )
      return getPoolBorrowers(args.asset, network)
    },

    thornodePoolSavers: (_parent: unknown, args: { asset: string; network?: ThornodeNetwork }) => {
      const network = args.network ?? 'thorchain'
      console.log(`[Query.thornodePoolSavers] Fetching savers for ${args.asset} on ${network}`)
      return getPoolSavers(args.asset, network)
    },

    portalsAccount: (_parent: unknown, args: { chainId: string; address: string }) => {
      console.log(`[Query.portalsAccount] Fetching tokens for ${args.address} on ${args.chainId}`)
      return getPortalsAccount(args.chainId, args.address)
    },

    portalsAccounts: (
      _parent: unknown,
      args: { requests: { chainId: string; address: string }[] },
    ) => {
      console.log(`[Query.portalsAccounts] Fetching tokens for ${args.requests.length} accounts`)
      return getPortalsAccounts(args.requests)
    },

    portalsPlatforms: () => {
      console.log('[Query.portalsPlatforms] Fetching platforms')
      return getPortalsPlatforms()
    },

    limitOrders: (_parent: unknown, args: { accountIds: string[] }) => {
      if (args.accountIds.length > MAX_ORDER_ACCOUNT_IDS) {
        throw new GraphQLError(`Too many accountIds requested (max ${MAX_ORDER_ACCOUNT_IDS})`, {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      console.log(`[Query.limitOrders] Fetching orders for ${args.accountIds.length} accounts`)
      return getOrders(args.accountIds)
    },
  },

  Subscription: {
    limitOrdersUpdated: {
      subscribe: (_parent: unknown, args: { accountIds: string[] }) => {
        console.log(
          `[Subscription.limitOrdersUpdated] Starting subscription for ${args.accountIds.length} accounts`,
        )

        const subscribed: { chainId: string; address: string }[] = []
        for (const accountId of args.accountIds) {
          const parts = accountId.split(':')
          if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
            const chainId = `${parts[0]}:${parts[1]}`
            const address = parts[2]
            if (subscribeToOrders(accountId, chainId, address)) {
              subscribed.push({ chainId, address })
            }
          }
        }

        const iterator = pubsub.asyncIterator([ORDERS_UPDATED_TOPIC])

        const originalReturn = iterator.return?.bind(iterator)
        iterator.return = () => {
          console.log('[Subscription.limitOrdersUpdated] Subscription ending, cleaning up')
          for (const { chainId, address } of subscribed) {
            unsubscribeFromOrders(chainId, address)
          }
          return originalReturn
            ? originalReturn()
            : Promise.resolve({ value: undefined, done: true })
        }

        return iterator
      },
    },
  },
}
