import gql from 'graphql-tag'

// Schema aligned with @shapeshiftoss/types and chain-adapters types
export const typeDefs = gql`
  scalar AssetId
  scalar AccountId
  scalar JSON

  # Transaction status - matches chain-adapters TxStatus
  enum TxStatus {
    Confirmed
    Pending
    Failed
    Unknown
  }

  # Transfer type - matches chain-adapters TransferType
  enum TransferType {
    Send
    Receive
  }

  # Trade type - matches chain-adapters TradeType
  enum TradeType {
    Trade
    Refund
  }

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

  # UTXO address with balance
  type UtxoAddress {
    pubkey: String!
    balance: String!
  }

  # Chain-specific account data
  type EvmAccountData {
    nonce: Int!
    tokens: [TokenBalance!]!
  }

  type UtxoAccountData {
    addresses: [UtxoAddress!]!
    nextChangeAddressIndex: Int
    nextReceiveAddressIndex: Int
  }

  type CosmosAccountData {
    sequence: String
    accountNumber: String
    delegations: JSON
    redelegations: JSON
    undelegations: JSON
    rewards: JSON
  }

  type SolanaAccountData {
    tokens: [TokenBalance!]!
  }

  # Full Account with chain-specific data
  type Account {
    # Our GraphQL ID (accountId)
    id: String!
    # Native balance
    balance: String!
    pubkey: String!
    chainId: String!
    assetId: String!
    # Legacy tokens array (for backwards compatibility)
    tokens: [TokenBalance!]!
    # Chain-specific data (only one will be populated based on chainId)
    evmData: EvmAccountData
    utxoData: UtxoAccountData
    cosmosData: CosmosAccountData
    solanaData: SolanaAccountData
  }

  # Matches chain-adapters TxTransfer
  type TxTransfer {
    type: TransferType!
    assetId: String!
    value: String!
    from: [String!]!
    to: [String!]!
    # Optional trade info for swap transactions
    trade: TxTrade
  }

  # Trade information for swap transactions
  type TxTrade {
    type: TradeType!
    dexName: String
    memo: String
  }

  # Matches chain-adapters Transaction
  type Transaction {
    txid: String!
    pubkey: String!
    blockHeight: Int
    blockTime: Int
    status: TxStatus!
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

  # CoinGecko trending coin
  type CoingeckoTrendingCoin {
    id: String!
    name: String!
    symbol: String!
    marketCapRank: Int
    thumb: String
    small: String
    large: String
    score: Int
  }

  # CoinGecko mover (top gainer/loser)
  type CoingeckoMover {
    id: String!
    name: String!
    symbol: String!
    priceChangePercentage24h: Float!
    marketCap: Float
    marketCapRank: Int
    thumb: String
    small: String
    large: String
  }

  # CoinGecko top movers response
  type CoingeckoTopMovers {
    topGainers: [CoingeckoMover!]!
    topLosers: [CoingeckoMover!]!
  }

  # CoinGecko recently added coin
  type CoingeckoRecentlyAddedCoin {
    id: String!
    name: String!
    symbol: String!
    activatedAt: Int
  }

  # CoinGecko market data (used for markets endpoint)
  type CoingeckoMarketCap {
    id: String!
    symbol: String!
    name: String!
    image: String
    currentPrice: Float!
    marketCap: Float!
    marketCapRank: Int
    fullyDilutedValuation: Float
    totalVolume: Float!
    high24h: Float
    low24h: Float
    priceChange24h: Float
    priceChangePercentage24h: Float
    marketCapChange24h: Float
    marketCapChangePercentage24h: Float
    circulatingSupply: Float
    totalSupply: Float
    maxSupply: Float
    ath: Float
    athChangePercentage: Float
    athDate: String
    atl: Float
    atlChangePercentage: Float
    atlDate: String
    lastUpdated: String
  }

  # Ordering for market data
  enum CoingeckoSortKey {
    market_cap_asc
    market_cap_desc
    volume_asc
    volume_desc
    id_asc
    id_desc
    price_change_percentage_24h_desc
    price_change_percentage_24h_asc
  }

  # Thornode/Mayanode types
  enum ThornodeNetwork {
    thorchain
    mayachain
  }

  # TCY Claimer response
  type TcyClaim {
    address: String!
    amount: String!
    l1Address: String
    claimed: Boolean
  }

  # Pool data
  type ThornodePool {
    asset: String!
    status: String!
    balanceRune: String!
    balanceAsset: String!
    lpUnits: String
    synthUnits: String
    pendingInboundRune: String
    pendingInboundAsset: String
    saversDepth: String
    saversUnits: String
  }

  # Inbound address
  type InboundAddress {
    chain: String!
    address: String!
    router: String
    halted: Boolean!
    globalTradingPaused: Boolean
    chainTradingPaused: Boolean
    chainLpActionsPaused: Boolean
    gasRate: String
    gasRateUnits: String
    outboundTxSize: String
    outboundFee: String
    dustThreshold: String
  }

  # Block info
  type ThornodeBlock {
    height: String!
    hash: String
    timestamp: String
  }

  type Query {
    # Market data - batched via DataLoader
    marketData(assetIds: [String!]!): [MarketData]!

    # Account balances - batched via DataLoader
    accounts(accountIds: [String!]!): [Account]!

    # Transaction history - batched via DataLoader
    transactions(accountIds: [String!]!, limit: Int): TransactionConnection!

    # CoinGecko endpoints - consolidated for batching
    coingeckoTrending: [CoingeckoTrendingCoin!]!
    coingeckoTopMovers: CoingeckoTopMovers!
    coingeckoRecentlyAdded: [CoingeckoRecentlyAddedCoin!]!
    coingeckoMarkets(order: CoingeckoSortKey!, page: Int, perPage: Int): [CoingeckoMarketCap!]!
    # Fetches all pages of top market data in one request (for findAll batching)
    coingeckoTopMarkets(count: Int, order: CoingeckoSortKey): [CoingeckoMarketCap!]!

    # Thornode/Mayanode endpoints - consolidated for batching
    # TCY claims - batched by address (key optimization for useTcyClaims)
    tcyClaims(addresses: [String!]!, network: ThornodeNetwork): [TcyClaim]!
    # Pool data
    thornodePools(network: ThornodeNetwork): [ThornodePool!]!
    thornodePool(asset: String!, network: ThornodeNetwork): ThornodePool
    # Mimir config
    thornodeMimir(network: ThornodeNetwork): JSON!
    # Block info
    thornodeBlock(network: ThornodeNetwork): ThornodeBlock!
    # Inbound addresses
    thornodeInboundAddresses(network: ThornodeNetwork): [InboundAddress!]!

    # Health check
    health: String!
  }
`
