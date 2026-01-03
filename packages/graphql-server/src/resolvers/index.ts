import type DataLoader from 'dataloader'
import { GraphQLError } from 'graphql'

import type { CoingeckoSortKey } from '../datasources/coingeckoService.js'
import {
  getMarkets,
  getRecentlyAdded,
  getTopMarkets,
  getTopMovers,
  getTrending,
} from '../datasources/coingeckoService.js'
import type { ThornodeNetwork } from '../datasources/thornodeService.js'
import {
  getBlock,
  getInboundAddresses,
  getMimir,
  getPool,
  getPools,
  getTcyClaims,
} from '../datasources/thornodeService.js'
import type { Account } from '../loaders/accountLoader.js'
import type { MarketData } from '../loaders/marketLoader.js'
import type { TxHistoryResult } from '../loaders/txLoader.js'

const MAX_ASSET_IDS = 500
const MAX_ACCOUNT_IDS = 100
const MAX_TX_ACCOUNT_IDS = 50

export type Context = {
  loaders: {
    marketData: DataLoader<string, MarketData | null>
    accounts: DataLoader<string, Account | null>
    transactions: DataLoader<string, TxHistoryResult>
  }
}

export const resolvers = {
  Query: {
    health: () => 'OK',

    // CoinGecko endpoints
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

    marketData: async (_parent: unknown, args: { assetIds: string[] }, context: Context) => {
      if (args.assetIds.length > MAX_ASSET_IDS) {
        throw new GraphQLError(`Too many assetIds requested (max ${MAX_ASSET_IDS})`, {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      console.log(`[Query.marketData] Requested ${args.assetIds.length} assets`)

      // DataLoader will automatically batch these requests
      const results = await Promise.all(
        args.assetIds.map(assetId => context.loaders.marketData.load(assetId)),
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

      // DataLoader will automatically batch and group by chain
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

      // DataLoader will automatically batch and group by chain
      const results = await Promise.all(
        args.accountIds.map(accountId => context.loaders.transactions.load(accountId)),
      )

      // Flatten all transactions from all accounts with their accountId
      const allTransactionsWithAccountId = results.flatMap(result =>
        result.transactions.map(tx => ({
          tx,
          accountId: result.accountId,
        })),
      )

      // Sort by blockTime descending
      allTransactionsWithAccountId.sort((a, b) => (b.tx.blockTime || 0) - (a.tx.blockTime || 0))

      // Apply limit
      const limit = args.limit || 20
      const limitedTransactions = allTransactionsWithAccountId.slice(0, limit)

      // Create edges with cursors
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

    // Thornode/Mayanode resolvers
    tcyClaims: async (_parent: unknown, args: { addresses: string[]; network?: ThornodeNetwork }) => {
      const network = args.network ?? 'thorchain'
      console.log(
        `[Query.tcyClaims] Fetching claims for ${args.addresses.length} addresses on ${network}`,
      )
      return await getTcyClaims(args.addresses, network)
    },

    thornodePools: (_parent: unknown, args: { network?: ThornodeNetwork }) => {
      const network = args.network ?? 'thorchain'
      console.log(`[Query.thornodePools] Fetching pools for ${network}`)
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
  },
}
