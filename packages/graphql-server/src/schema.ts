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
  Thornode/Mayanode network selection
  """
  enum Network {
    THORCHAIN
    MAYACHAIN
  }

  """
  History timeframe for price charts
  """
  enum HistoryTimeframe {
    HOUR
    DAY
    WEEK
    MONTH
    YEAR
    ALL
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
  Result wrapper for batched price history - enables partial success
  """
  type PriceHistoryResult {
    assetId: AssetId!
    data: [PriceHistoryPoint!]!
    error: String
  }

  """
  Input for batched price history request
  """
  input PriceHistoryRequest {
    assetId: AssetId!
    coingeckoId: String!
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
    Token balances
    """
    tokens: [TokenBalance!]!

    """
    Chain-specific account details
    Use __typename to determine which type of details
    """
    details: AccountDetails
  }

  """
  Result wrapper for account data - enables partial success
  """
  type AccountResult {
    data: Account
    error: AccountError
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
  # THORNODE NAMESPACE TYPES
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
  type Pool {
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
  type PoolEdge {
    cursor: String!
    node: Pool!
  }

  """
  Paginated pool connection
  """
  type PoolConnection {
    edges: [PoolEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  """
  Borrower position
  """
  type Borrower {
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
  Saver position
  """
  type Saver {
    asset: String!
    assetAddress: String!
    lastAddHeight: Int
    units: String!
    assetDepositValue: String!
    assetRedeemValue: String!
    growthPct: String
  }

  """
  Protocol Owned Liquidity (POL) data in runepool
  """
  type RunepoolPOL {
    runeDeposited: String!
    runeWithdrawn: String!
    value: String!
    pnl: String!
    currentDeposit: String!
  }

  """
  Runepool providers aggregate data
  """
  type RunepoolProviders {
    units: String!
    pendingUnits: String!
    pendingRune: String!
    value: String!
    pnl: String!
    currentDeposit: String!
  }

  """
  Runepool reserve data
  """
  type RunepoolReserve {
    units: String!
    value: String!
    pnl: String!
    currentDeposit: String!
  }

  """
  Runepool information from THORNode
  """
  type RunepoolInformation {
    pol: RunepoolPOL!
    providers: RunepoolProviders!
    reserve: RunepoolReserve!
  }

  """
  Individual rune provider position
  """
  type RuneProvider {
    runeAddress: String!
    units: String!
    value: String!
    pnl: String!
    depositAmount: String!
    withdrawAmount: String!
    lastDepositHeight: Int!
    lastWithdrawHeight: Int!
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
  type Block {
    height: String!
    hash: String
    timestamp: DateTime
  }

  """
  Thorchain/Mayachain data access
  Use network parameter to select chain (defaults to THORCHAIN)
  """
  type Thornode {
    """
    Get single pool by asset
    """
    pool(asset: String!, network: Network = THORCHAIN): Pool

    """
    Get all pools (paginated)
    """
    pools(network: Network = THORCHAIN, first: Int = 100, after: String): PoolConnection!

    """
    Get borrowers for a specific pool
    """
    borrowers(asset: String!, network: Network = THORCHAIN): [Borrower!]!

    """
    Get borrowers for multiple pools in a single request
    """
    allBorrowers(assets: [String!]!, network: Network = THORCHAIN): [[Borrower!]!]!

    """
    Get savers for a specific pool
    """
    savers(asset: String!, network: Network = THORCHAIN): [Saver!]!

    """
    Get savers for multiple pools in a single request
    """
    allSavers(assets: [String!]!, network: Network = THORCHAIN): [[Saver!]!]!

    """
    Get mimir configuration
    """
    mimir(network: Network = THORCHAIN): JSON!

    """
    Get latest block info
    """
    block(network: Network = THORCHAIN): Block!

    """
    Get inbound addresses for all chains
    """
    inboundAddresses(network: Network = THORCHAIN): [InboundAddress!]!

    """
    Get TCY claims for addresses
    """
    tcyClaims(addresses: [String!]!, network: Network = THORCHAIN): [TcyClaim]!

    """
    Get runepool information (POL, providers, reserve)
    """
    runepoolInformation(network: Network = THORCHAIN): RunepoolInformation

    """
    Get rune provider position for a specific address
    """
    runeProvider(address: String!, network: Network = THORCHAIN): RuneProvider
  }

  # ============================================================================
  # MIDGARD NAMESPACE TYPES
  # ============================================================================

  """
  Midgard pool period for APY calculations
  """
  enum MidgardPoolPeriod {
    HOUR_1
    HOUR_24
    DAY_7
    DAY_14
    DAY_30
    DAY_90
    DAY_100
    DAY_180
    DAY_365
    ALL
  }

  """
  Midgard pool data with APY and depth info
  """
  type MidgardPool {
    asset: String!
    annualPercentageRate: String!
    assetDepth: String!
    assetPrice: String!
    assetPriceUSD: String!
    liquidityUnits: String!
    nativeDecimal: String!
    poolAPY: String!
    runeDepth: String!
    saversAPR: String!
    saversDepth: String!
    saversUnits: String!
    status: String!
    synthSupply: String!
    synthUnits: String!
    units: String!
    volume24h: String!
  }

  """
  Midgard member pool position
  """
  type MidgardMemberPool {
    assetAdded: String!
    assetAddress: String!
    assetDeposit: String!
    assetPending: String!
    assetWithdrawn: String!
    dateFirstAdded: String!
    dateLastAdded: String!
    liquidityUnits: String!
    pool: String!
    runeAdded: String!
    runeAddress: String!
    runeDeposit: String!
    runePending: String!
    runeWithdrawn: String!
  }

  """
  Midgard member with pool positions
  """
  type MidgardMember {
    pools: [MidgardMemberPool!]!
  }

  """
  Midgard runepool member position
  """
  type MidgardRunepoolMember {
    runeAddress: String!
    units: String!
    runeAdded: String!
    runeDeposit: String!
    runeWithdrawn: String!
    dateFirstAdded: String!
    dateLastAdded: String!
  }

  """
  Midgard THORChain data aggregator
  """
  type Midgard {
    """
    Get all pools with optional period for APY calculation
    """
    pools(period: MidgardPoolPeriod): [MidgardPool!]!

    """
    Get member LP positions by address
    """
    member(address: String!): MidgardMember

    """
    Get runepool member position by address
    """
    runepoolMember(address: String!): MidgardRunepoolMember
  }

  # ============================================================================
  # PORTALS NAMESPACE TYPES
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

  """
  Portals DeFi position aggregator
  """
  type Portals {
    """
    Get DeFi positions for a single account
    """
    account(chainId: ChainId!, address: String!): [PortalsToken!]!

    """
    Get DeFi positions for multiple accounts
    """
    accounts(requests: [PortalsAccountInput!]!): [[PortalsToken!]!]!

    """
    Get all supported platforms
    """
    platforms: [PortalsPlatform!]!
  }

  # ============================================================================
  # COWSWAP NAMESPACE TYPES
  # ============================================================================

  """
  CowSwap limit order
  """
  type Order {
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
    orders: [Order!]!
    timestamp: Float!
  }

  """
  CowSwap DEX limit orders
  """
  type CowSwap {
    """
    Get limit orders for accounts
    """
    orders(accountIds: [String!]!): [OrdersUpdate!]!
  }

  # ============================================================================
  # RFOX NAMESPACE TYPES
  # ============================================================================

  """
  RFOX reward distribution for a staking address
  """
  type RfoxRewardDistribution {
    """
    The amount (RUNE) distributed to the reward address
    """
    amount: String!
    """
    The rFOX staking reward units earned for the epoch
    """
    rewardUnits: String!
    """
    The total rFOX staking reward units earned across all epochs
    """
    totalRewardUnits: String!
    """
    The transaction ID (THORChain) for the reward distribution
    """
    txId: String!
    """
    The address used for the reward distribution
    """
    rewardAddress: String!
  }

  """
  RFOX epoch details for a staking contract
  """
  type RfoxEpochDetails {
    """
    The total rFOX staking reward units for this epoch
    """
    totalRewardUnits: String!
    """
    The percentage of revenue (RUNE) to be distributed as rewards
    """
    distributionRate: Float!
    """
    The spot price of asset in USD
    """
    assetPriceUsd: String
    """
    The reward distribution for each staking address (JSON map)
    """
    distributionsByStakingAddress: JSON!
  }

  """
  RFOX epoch data
  """
  type RfoxEpoch {
    """
    The epoch number
    """
    number: Int!
    """
    The IPFS hash for this epoch
    """
    ipfsHash: String!
    """
    The start timestamp for this epoch
    """
    startTimestamp: Float!
    """
    The end timestamp for this epoch
    """
    endTimestamp: Float!
    """
    The timestamp of the reward distribution
    """
    distributionTimestamp: Float
    """
    The start block for this epoch
    """
    startBlock: Int!
    """
    The end block for this epoch
    """
    endBlock: Int!
    """
    The treasury address on THORChain
    """
    treasuryAddress: String!
    """
    The total revenue (RUNE) earned for this epoch
    """
    totalRevenue: String!
    """
    The burn rate for this epoch
    """
    burnRate: Float!
    """
    The spot price of RUNE in USD
    """
    runePriceUsd: String
    """
    The status of the reward distribution
    """
    distributionStatus: String!
    """
    The details for each staking contract (JSON map)
    """
    detailsByStakingContract: JSON!
  }

  """
  RFOX current epoch metadata
  """
  type RfoxCurrentEpochMetadata {
    """
    The current epoch number
    """
    epoch: Int!
    """
    The start timestamp for the current epoch
    """
    epochStartTimestamp: Float!
    """
    The end timestamp for the current epoch
    """
    epochEndTimestamp: Float!
    """
    The treasury address on THORChain
    """
    treasuryAddress: String!
    """
    The current burn rate
    """
    burnRate: Float!
    """
    The distribution rate by staking contract (JSON map)
    """
    distributionRateByStakingContract: JSON!
    """
    The IPFS hashes for each epoch (JSON map)
    """
    ipfsHashByEpoch: JSON!
  }

  """
  RFOX unstaking request
  """
  type RfoxUnstakingRequest {
    unstakingBalance: String!
    cooldownExpiry: String!
    index: Int!
  }

  """
  RFOX unstaking requests result for an account
  """
  type RfoxUnstakingRequestsResult {
    stakingAssetAccountAddress: String!
    contractAddress: String!
    unstakingRequests: [RfoxUnstakingRequest!]!
  }

  """
  Input for batch unstaking requests query
  """
  input RfoxUnstakingRequestInput {
    stakingAssetAccountAddress: String!
    stakingAssetId: String!
  }

  """
  RFOX staking data access
  """
  type Rfox {
    """
    Get current epoch metadata
    """
    currentEpochMetadata: RfoxCurrentEpochMetadata!

    """
    Get all epoch history (batched - fetches all epochs in one request)
    """
    epochHistory: [RfoxEpoch!]!

    """
    Get a specific epoch by IPFS hash
    """
    epoch(ipfsHash: String!): RfoxEpoch

    """
    Get unstaking requests for an account
    """
    unstakingRequests(
      stakingAssetAccountAddress: String!
      stakingAssetId: String!
    ): RfoxUnstakingRequestsResult

    """
    Batch get unstaking requests for multiple accounts
    """
    batchUnstakingRequests(requests: [RfoxUnstakingRequestInput!]!): [RfoxUnstakingRequestsResult]!
  }

  # ============================================================================
  # EVM UTILITIES
  # ============================================================================

  """
  EVM chain utilities
  """
  type Evm {
    """
    Check if an address is a smart contract.
    Results are cached server-side - once true, always true.
    """
    isSmartContractAddress(address: String!, chainId: String!): Boolean!

    """
    Batch check multiple addresses for smart contract status.
    """
    batchIsSmartContractAddress(requests: [SmartContractCheckRequest!]!): [Boolean!]!
  }

  input SmartContractCheckRequest {
    address: String!
    chainId: String!
  }

  # ============================================================================
  # QUERIES
  # ============================================================================

  type Query {
    """
    Unified market data access
    """
    market: Market!

    """
    Thorchain/Mayachain data access
    """
    thornode: Thornode!

    """
    Portals DeFi position aggregator
    """
    portals: Portals!

    """
    CowSwap DEX limit orders
    """
    cowswap: CowSwap!

    """
    Midgard THORChain data aggregator
    """
    midgard: Midgard!

    """
    RFOX staking data
    """
    rfox: Rfox!

    """
    EVM chain utilities
    """
    evm: Evm!

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

    """
    Batched price history for multiple assets

    **Limits**: Maximum 100 assets per request
    **Caching**: Results cached for 5 minutes (historical data is stable)
    """
    priceHistories(
      requests: [PriceHistoryRequest!]!
      timeframe: HistoryTimeframe!
    ): [PriceHistoryResult!]!

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
    Real-time CowSwap limit order updates
    """
    cowswapOrdersUpdated(accountIds: [String!]!): OrdersUpdate!
  }
`
