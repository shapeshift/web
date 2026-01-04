import gql from 'graphql-tag'

export const typeDefs = gql`
  # ============================================================================
  # CUSTOM SCALARS - Type safety for domain identifiers
  # ============================================================================

  """
  CAIP-19 asset identifier (e.g., eip155:1/slip44:60)
  """
  scalar AssetId

  """
  Internal account identifier format (opaque to clients)
  """
  scalar AccountId

  """
  CAIP-2 chain identifier (e.g., eip155:1, cosmos:cosmoshub-4)
  """
  scalar ChainId

  """
  Public key - hex for EVM, base58 for others
  """
  scalar PubKey

  """
  ISO 8601 datetime string
  """
  scalar DateTime

  """
  Arbitrary JSON data
  """
  scalar JSON

  # ============================================================================
  # ERROR HANDLING - Structured error responses
  # ============================================================================

  """
  Error codes for market data operations
  """
  enum MarketDataErrorCode {
    ASSET_NOT_FOUND
    PRICE_UNAVAILABLE
    API_ERROR
    RATE_LIMITED
    INVALID_ASSET_ID
  }

  """
  Structured error for market data operations
  """
  type MarketError {
    code: MarketDataErrorCode!
    message: String!
    assetId: AssetId
  }

  """
  Error codes for account operations
  """
  enum AccountErrorCode {
    ACCOUNT_NOT_FOUND
    CHAIN_NOT_SUPPORTED
    API_ERROR
    INVALID_ACCOUNT_ID
  }

  """
  Structured error for account operations
  """
  type AccountError {
    code: AccountErrorCode!
    message: String!
    accountId: AccountId
  }

  # ============================================================================
  # ENUMS
  # ============================================================================

  """
  Transaction status - matches chain-adapters TxStatus
  """
  enum TxStatus {
    Confirmed
    Pending
    Failed
    Unknown
  }

  """
  Transfer type - matches chain-adapters TransferType
  """
  enum TransferType {
    Send
    Receive
  }

  """
  Trade type - matches chain-adapters TradeType
  """
  enum TradeType {
    Trade
    Refund
  }

  """
  Ordering for market data
  """
  enum MarketOrderField {
    MARKET_CAP_DESC
    MARKET_CAP_ASC
    VOLUME_DESC
    VOLUME_ASC
    PRICE_CHANGE_24H_DESC
    PRICE_CHANGE_24H_ASC
  }

  """
  Legacy sort key for backwards compatibility
  """
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

  """
  Thornode/Mayanode network selection
  """
  enum ThornodeNetwork {
    thorchain
    mayachain
  }

  # ============================================================================
  # MARKET DATA TYPES
  # ============================================================================

  """
  Market data for a single asset
  Note: price/marketCap/volume are nullable - API may be unavailable
  """
  type MarketData {
    assetId: AssetId!
    price: String
    marketCap: String
    volume: String
    changePercent24Hr: Float
    supply: String
    maxSupply: String
  }

  """
  Result wrapper for market data - enables partial success
  """
  type MarketDataResult {
    data: MarketData
    error: MarketError
  }

  """
  Price history point for charts
  """
  type PriceHistoryPoint {
    date: Float!
    price: Float!
  }

  """
  Asset images in different sizes
  """
  type AssetImages {
    thumb: String
    small: String
    large: String
  }

  """
  Trending asset from CoinGecko
  """
  type TrendingAsset {
    id: String!
    assetId: AssetId
    name: String!
    symbol: String!
    marketCapRank: Int
    images: AssetImages!
    score: Int
  }

  """
  Asset with price movement data
  """
  type MovingAsset {
    id: String!
    assetId: AssetId
    name: String!
    symbol: String!
    priceChangePercentage24h: Float
    marketCap: Float
    marketCapRank: Int
    images: AssetImages!
  }

  """
  Top gainers and losers
  """
  type Movers {
    topGainers: [MovingAsset!]!
    topLosers: [MovingAsset!]!
  }

  """
  Recently added asset
  """
  type RecentAsset {
    id: String!
    assetId: AssetId
    name: String!
    symbol: String!
    activatedAt: Int
  }

  """
  Market asset with full data
  """
  type MarketAsset {
    id: String!
    assetId: AssetId
    symbol: String!
    name: String!
    image: String
    currentPrice: Float
    marketCap: Float
    marketCapRank: Int
    fullyDilutedValuation: Float
    totalVolume: Float
    high24h: Float
    low24h: Float
    priceChange24h: Float
    priceChangePercentage24h: Float
    circulatingSupply: Float
    totalSupply: Float
    maxSupply: Float
    lastUpdated: DateTime
  }

  """
  Edge for market asset pagination
  """
  type MarketAssetEdge {
    cursor: String!
    node: MarketAsset!
  }

  """
  Connection for paginated market assets
  """
  type MarketAssetConnection {
    edges: [MarketAssetEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  """
  Unified market data access point
  Groups all market-related queries under one namespace
  """
  type Market {
    """
    Get trending assets
    """
    trending(limit: Int = 10): [TrendingAsset!]!

    """
    Get top movers (gainers and losers)
    """
    movers: Movers!

    """
    Get recently added assets
    """
    recentlyAdded(limit: Int = 20): [RecentAsset!]!

    """
    Get top market assets with pagination
    """
    topAssets(
      first: Int = 100
      after: String
      orderBy: MarketOrderField = MARKET_CAP_DESC
    ): MarketAssetConnection!

    """
    Get market data for specific assets (with error handling)
    """
    data(assetIds: [AssetId!]!): [MarketDataResult!]!

    """
    Get price history for an asset
    """
    priceHistory(coingeckoId: String!, from: Int!, to: Int!): [PriceHistoryPoint!]!
  }

  # ============================================================================
  # ACCOUNT TYPES
  # ============================================================================

  """
  Token balance
  """
  type TokenBalance {
    assetId: AssetId!
    balance: String!
    name: String
    symbol: String
    precision: Int
  }

  """
  UTXO address with balance
  """
  type UtxoAddress {
    pubkey: PubKey!
    balance: String!
  }

  """
  Native asset balance
  """
  type Balance {
    value: String!
    assetId: AssetId!
  }

  """
  EVM-specific account details
  """
  type EvmAccountDetails {
    nonce: Int!
    tokens: [TokenBalance!]!
  }

  """
  UTXO-specific account details
  """
  type UtxoAccountDetails {
    addresses: [UtxoAddress!]!
    nextChangeAddressIndex: Int
    nextReceiveAddressIndex: Int
  }

  """
  Cosmos-specific account details
  """
  type CosmosAccountDetails {
    sequence: String
    accountNumber: String
    delegations: JSON
    redelegations: JSON
    undelegations: JSON
    rewards: JSON
  }

  """
  Solana-specific account details
  """
  type SolanaAccountDetails {
    tokens: [TokenBalance!]!
  }

  """
  Union of chain-specific account details - use __typename to distinguish
  """
  union AccountDetails =
      EvmAccountDetails
    | UtxoAccountDetails
    | CosmosAccountDetails
    | SolanaAccountDetails

  """
  Account with chain-specific data
  Use details field with __typename for type-safe access
  """
  type Account {
    """
    Opaque account identifier
    """
    id: AccountId!

    """
    Native asset balance
    """
    balance: String!

    """
    Account public key
    """
    pubkey: PubKey!

    """
    Chain this account belongs to
    """
    chainId: ChainId!

    """
    Native asset ID for this chain
    """
    assetId: AssetId!

    """
    Token balances (for backwards compatibility)
    """
    tokens: [TokenBalance!]!

    """
    Chain-specific account details
    Use __typename to determine which type of details
    """
    details: AccountDetails

    # Deprecated fields - use details instead
    evmData: EvmAccountData @deprecated(reason: "Use details field with __typename instead")
    utxoData: UtxoAccountData @deprecated(reason: "Use details field with __typename instead")
    cosmosData: CosmosAccountData @deprecated(reason: "Use details field with __typename instead")
    solanaData: SolanaAccountData @deprecated(reason: "Use details field with __typename instead")
  }

  """
  Result wrapper for account data - enables partial success
  """
  type AccountResult {
    data: Account
    error: AccountError
  }

  # Legacy types for backwards compatibility
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

  # ============================================================================
  # TRANSACTION TYPES
  # ============================================================================

  """
  Trade information for swap transactions
  """
  type TxTrade {
    type: TradeType!
    dexName: String
    memo: String
  }

  """
  Transfer within a transaction
  """
  type TxTransfer {
    type: TransferType!
    assetId: AssetId!
    value: String!
    from: [String!]!
    to: [String!]!
    trade: TxTrade
  }

  """
  Transaction record
  """
  type Transaction {
    txid: String!
    pubkey: PubKey!
    blockHeight: Int
    blockTime: Int
    status: TxStatus!
    fee: String
    transfers: [TxTransfer!]!
  }

  """
  Pagination info
  """
  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  """
  Transaction edge for pagination
  """
  type TransactionEdge {
    node: Transaction!
    cursor: String!
    accountId: AccountId!
  }

  """
  Paginated transaction connection
  """
  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
  }

  # ============================================================================
  # THORNODE TYPES
  # ============================================================================

  """
  TCY Claimer response
  """
  type TcyClaim {
    asset: String!
    amount: String!
    l1Address: String!
  }

  """
  Thorchain/Mayachain pool data
  """
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

  """
  Pool edge for pagination
  """
  type ThornodePoolEdge {
    cursor: String!
    node: ThornodePool!
  }

  """
  Paginated pool connection
  """
  type ThornodePoolConnection {
    edges: [ThornodePoolEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  """
  Thorchain borrower position
  """
  type ThornodeBorrower {
    owner: String!
    asset: String!
    debtIssued: String!
    debtRepaid: String!
    debtCurrent: String!
    collateralDeposited: String!
    collateralWithdrawn: String!
    collateralCurrent: String!
    lastOpenHeight: Int!
    lastRepayHeight: Int!
  }

  """
  Thorchain saver position
  """
  type ThornodeSaver {
    asset: String!
    assetAddress: String!
    lastAddHeight: Int
    units: String!
    assetDepositValue: String!
    assetRedeemValue: String!
    growthPct: String
  }

  """
  Inbound address for a chain
  """
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

  """
  Block info
  """
  type ThornodeBlock {
    height: String!
    hash: String
    timestamp: DateTime
  }

  # ============================================================================
  # PORTALS TYPES
  # ============================================================================

  """
  Portals DeFi token/position
  """
  type PortalsToken {
    key: String!
    name: String!
    decimals: Int!
    symbol: String!
    address: String!
    images: [String!]
    image: String
    price: String
    pricePerShare: String
    platform: String!
    network: String!
    liquidity: Float!
    tokens: [String!]!
    apy: String
    volumeUsd1d: String
    volumeUsd7d: String
  }

  """
  Portals platform info
  """
  type PortalsPlatform {
    platform: String!
    name: String!
    image: String!
    network: String!
  }

  """
  Input for portals account query
  """
  input PortalsAccountInput {
    chainId: ChainId!
    address: String!
  }

  # ============================================================================
  # COWSWAP TYPES
  # ============================================================================

  """
  CowSwap limit order
  """
  type CowSwapOrder {
    uid: String!
    sellToken: String!
    buyToken: String!
    sellAmount: String!
    buyAmount: String!
    validTo: Int!
    appData: String!
    feeAmount: String!
    kind: String!
    partiallyFillable: Boolean!
    sellTokenBalance: String!
    buyTokenBalance: String!
    signingScheme: String!
    signature: String!
    from: String!
    receiver: String!
    owner: String!
    creationDate: DateTime!
    status: String!
    executedSellAmount: String
    executedBuyAmount: String
    executedSellAmountBeforeFees: String
    executedFeeAmount: String
    invalidated: Boolean!
    fullAppData: String
    class: String!
  }

  """
  Orders update for subscription
  """
  type OrdersUpdate {
    accountId: AccountId!
    orders: [CowSwapOrder!]!
    timestamp: Float!
  }

  # ============================================================================
  # LEGACY COINGECKO TYPES (for backwards compatibility)
  # ============================================================================

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

  type CoingeckoTopMovers {
    topGainers: [CoingeckoMover!]!
    topLosers: [CoingeckoMover!]!
  }

  type CoingeckoRecentlyAddedCoin {
    id: String!
    name: String!
    symbol: String!
    activatedAt: Int
  }

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

  # ============================================================================
  # QUERIES
  # ============================================================================

  type Query {
    """
    Unified market data access
    Use this for all market-related queries
    """
    market: Market!

    """
    Fetches market data for specified assets

    **Limits**: Maximum 100 AssetIds per request
    **Errors**: Returns results with error field populated on failure
    **Caching**: Results cached for 60 seconds
    """
    marketData(assetIds: [String!]!): [MarketDataResult!]!

    """
    Fetches account data by ID

    **Limits**: Maximum 50 AccountIds per request
    **Note**: Use details field with __typename for chain-specific data
    """
    accounts(accountIds: [String!]!): [Account!]!

    """
    Transaction history with pagination
    """
    transactions(accountIds: [String!]!, limit: Int = 50): TransactionConnection!

    # -------------------------------------------------------------------------
    # Legacy CoinGecko queries (deprecated - use market.* instead)
    # -------------------------------------------------------------------------

    coingeckoTrending: [CoingeckoTrendingCoin!]! @deprecated(reason: "Use market.trending instead")

    coingeckoTopMovers: CoingeckoTopMovers! @deprecated(reason: "Use market.movers instead")

    coingeckoRecentlyAdded: [CoingeckoRecentlyAddedCoin!]!
      @deprecated(reason: "Use market.recentlyAdded instead")

    coingeckoMarkets(order: CoingeckoSortKey!, page: Int, perPage: Int): [CoingeckoMarketCap!]!
      @deprecated(reason: "Use market.topAssets instead")

    coingeckoTopMarkets(count: Int, order: CoingeckoSortKey): [CoingeckoMarketCap!]!
      @deprecated(reason: "Use market.topAssets instead")

    coingeckoPriceHistory(coingeckoId: String!, from: Int!, to: Int!): [PriceHistoryPoint!]!
      @deprecated(reason: "Use market.priceHistory instead")

    # -------------------------------------------------------------------------
    # Thornode/Mayanode endpoints
    # -------------------------------------------------------------------------

    """
    Get TCY claims for addresses
    """
    tcyClaims(addresses: [String!]!, network: ThornodeNetwork = thorchain): [TcyClaim]!

    """
    Get all pools (paginated)
    """
    thornodePools(
      network: ThornodeNetwork = thorchain
      first: Int = 100
      after: String
    ): ThornodePoolConnection!

    """
    Get all pools (legacy, non-paginated)
    """
    thornodePoolsLegacy(network: ThornodeNetwork = thorchain): [ThornodePool!]!
      @deprecated(reason: "Use thornodePools with pagination instead")

    """
    Get single pool by asset
    """
    thornodePool(asset: String!, network: ThornodeNetwork = thorchain): ThornodePool

    """
    Get mimir configuration
    """
    thornodeMimir(network: ThornodeNetwork = thorchain): JSON!

    """
    Get latest block info
    """
    thornodeBlock(network: ThornodeNetwork = thorchain): ThornodeBlock!

    """
    Get inbound addresses for all chains
    """
    thornodeInboundAddresses(network: ThornodeNetwork = thorchain): [InboundAddress!]!

    """
    Get borrowers for a specific pool
    """
    thornodePoolBorrowers(
      asset: String!
      network: ThornodeNetwork = thorchain
    ): [ThornodeBorrower!]!

    """
    Get savers for a specific pool
    """
    thornodePoolSavers(asset: String!, network: ThornodeNetwork = thorchain): [ThornodeSaver!]!

    # -------------------------------------------------------------------------
    # Portals endpoints
    # -------------------------------------------------------------------------

    """
    Get DeFi positions for a single account
    """
    portalsAccount(chainId: ChainId!, address: String!): [PortalsToken!]!

    """
    Get DeFi positions for multiple accounts
    """
    portalsAccounts(requests: [PortalsAccountInput!]!): [[PortalsToken!]!]!

    """
    Get all supported platforms
    """
    portalsPlatforms: [PortalsPlatform!]!

    # -------------------------------------------------------------------------
    # CowSwap endpoints
    # -------------------------------------------------------------------------

    """
    Get limit orders for accounts
    """
    limitOrders(accountIds: [String!]!): [OrdersUpdate!]!

    # -------------------------------------------------------------------------
    # Health check
    # -------------------------------------------------------------------------

    """
    API health check
    """
    health: String!
  }

  # ============================================================================
  # SUBSCRIPTIONS
  # ============================================================================

  type Subscription {
    """
    Real-time limit order updates
    """
    limitOrdersUpdated(accountIds: [String!]!): OrdersUpdate!
  }
`
