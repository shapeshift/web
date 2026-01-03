import type { AccountId } from '@shapeshiftoss/caip'
import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

export type GraphQLTransfer = {
  type: string
  assetId: string
  value: string
  from: string[]
  to: string[]
}

export type GraphQLTransaction = {
  txid: string
  pubkey: string
  blockHeight: number | null
  blockTime: number | null
  status: string
  fee: string | null
  transfers: GraphQLTransfer[]
}

export type GraphQLTransactionEdge = {
  node: GraphQLTransaction
  cursor: string
  accountId: string
}

export type GraphQLTransactionConnection = {
  edges: GraphQLTransactionEdge[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string | null
  }
}

const GET_TRANSACTIONS = gql`
  query GetTransactions($accountIds: [String!]!, $limit: Int) {
    transactions(accountIds: $accountIds, limit: $limit) {
      edges {
        node {
          txid
          pubkey
          blockHeight
          blockTime
          status
          fee
          transfers {
            type
            assetId
            value
            from
            to
          }
        }
        cursor
        accountId
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

type GetTransactionsResponse = {
  transactions: GraphQLTransactionConnection
}

/**
 * Fetch transaction history for multiple accounts via GraphQL
 *
 * This batches all accountIds into a single GraphQL request,
 * which the server then batches via DataLoader to minimize
 * upstream Unchained API calls.
 */
export async function fetchTransactionsGraphQL(
  accountIds: AccountId[],
  limit = 20,
): Promise<GraphQLTransactionConnection> {
  if (accountIds.length === 0) {
    return {
      edges: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    }
  }

  const client = getGraphQLClient()

  try {
    const response = await client.request<GetTransactionsResponse>(GET_TRANSACTIONS, {
      accountIds,
      limit,
    })

    return response.transactions
  } catch (error) {
    console.error('[GraphQL] Failed to fetch transactions:', error)
    throw error
  }
}

/**
 * Fetch transactions for accounts grouped by account
 */
export async function fetchTransactionsByAccount(
  accountIds: AccountId[],
  limit = 20,
): Promise<Record<AccountId, GraphQLTransaction[]>> {
  const connection = await fetchTransactionsGraphQL(accountIds, limit)

  const result: Record<AccountId, GraphQLTransaction[]> = {}

  for (const accountId of accountIds) {
    result[accountId as AccountId] = []
  }

  for (const edge of connection.edges) {
    const accountId = edge.accountId as AccountId
    if (!result[accountId]) {
      result[accountId] = []
    }
    result[accountId].push(edge.node)
  }

  return result
}
