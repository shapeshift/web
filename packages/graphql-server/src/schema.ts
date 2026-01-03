import gql from 'graphql-tag'

// Schema aligned with @shapeshiftoss/types and chain-adapters types
export const typeDefs = gql`
  scalar AssetId
  scalar AccountId

  # Matches packages/types/src/market.ts MarketData
  type MarketData {
    assetId: String!
    price: String!
    marketCap: String!
    volume: String!
    changePercent24Hr: Float!
    supply: String
    maxSupply: String
  }

  # Token balance - matches unchained TokenBalance
  type TokenBalance {
    assetId: String!
    balance: String!
    name: String
    symbol: String
    precision: Int
  }

  # Matches chain-adapters Account type
  type Account {
    # Our GraphQL ID (accountId)
    id: String!
    # Native balance
    balance: String!
    pubkey: String!
    chainId: String!
    assetId: String!
    # Token balances (ERC20, etc.)
    tokens: [TokenBalance!]!
  }

  # Matches chain-adapters TxTransfer
  type TxTransfer {
    type: String!
    assetId: String!
    value: String!
    from: [String!]!
    to: [String!]!
  }

  # Matches chain-adapters Transaction
  type Transaction {
    txid: String!
    pubkey: String!
    blockHeight: Int
    blockTime: Int
    status: String!
    fee: String
    transfers: [TxTransfer!]!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type TransactionEdge {
    node: Transaction!
    cursor: String!
    accountId: String!
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
  }

  type Query {
    # Market data - batched via DataLoader
    marketData(assetIds: [String!]!): [MarketData]!

    # Account balances - batched via DataLoader
    accounts(accountIds: [String!]!): [Account]!

    # Transaction history - batched via DataLoader
    transactions(accountIds: [String!]!, limit: Int): TransactionConnection!

    # Health check
    health: String!
  }
`
