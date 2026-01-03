import type DataLoader from 'dataloader'
import { GraphQLError } from 'graphql'

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
  },
}
