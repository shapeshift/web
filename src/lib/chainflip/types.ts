export type Permill = number
export type Perbill = number

export type ChainflipChain = 'Bitcoin' | 'Ethereum' | 'Solana'
export type ChainflipAssetSymbol = 'BTC' | 'ETH' | 'SOL' | 'USDC' | 'USDT' | 'FLIP'

export type ChainflipAsset = {
  chain: ChainflipChain
  asset: ChainflipAssetSymbol
}

export type ChainflipInterestRateCurve = Record<string, unknown>

export type ChainflipLtvThresholds = {
  creation?: Permill
  topup?: Permill
  soft_abort?: Permill
  soft_liquidation?: Permill
  hard_abort?: Permill
  hard_liquidation?: Permill
}

export type ChainflipLendingPool = {
  asset: ChainflipAsset
  total_amount: string
  available_amount: string
  utilisation_rate: Perbill
  current_interest_rate: Perbill
  origination_fee: Permill
  liquidation_fee: Permill
  interest_rate_curve: ChainflipInterestRateCurve
}

export type ChainflipLendingPoolsResponse = ChainflipLendingPool[]

export type ChainflipLendingConfig = {
  ltv_thresholds?: ChainflipLtvThresholds
  interest_rate_curve?: ChainflipInterestRateCurve
} & Record<string, unknown>

export type ChainflipLoanAccount = {
  account_id: string
  loan_asset: ChainflipAsset
  collateral_asset: ChainflipAsset
  debt_amount: string
  collateral_amount: string
  ltv?: Perbill
} & Record<string, unknown>

export type ChainflipLoanAccountsResponse = ChainflipLoanAccount[]

export type ChainflipSupplyBalance = {
  account_id: string
  asset: ChainflipAsset
  supplied_amount: string
  share_amount: string
} & Record<string, unknown>

export type ChainflipSupplyBalancesResponse = ChainflipSupplyBalance[]

export type ChainflipOraclePrice = {
  asset: ChainflipAsset
  price: string
  timestamp?: number
} & Record<string, unknown>

export type ChainflipOraclePricesResponse = ChainflipOraclePrice[]

export type ChainflipFreeBalance = {
  asset: ChainflipAsset
  balance: string
} & Record<string, unknown>

export type ChainflipFreeBalancesResponse = ChainflipFreeBalance[]

export type ChainflipSafeModeStatusesResponse = Record<string, boolean>

export type ChainflipAccountInfo = {
  account_id: string
  nonce?: number
  balances?: ChainflipFreeBalancesResponse
} & Record<string, unknown>

export type ChainflipEip712Payload = {
  Eip712: {
    domain: Record<string, unknown>
    types: Record<string, { name: string; type: string }[]>
    message: Record<string, unknown>
    primaryType: string
  }
}

export type ChainflipTransactionMetadata = {
  nonce: number
  expiry_block: number
}

export type ChainflipRuntimeVersion = {
  specVersion: number
  transactionVersion: number
} & Record<string, unknown>

export type ChainflipNonNativeCallResult = [ChainflipEip712Payload, ChainflipTransactionMetadata]

export type ChainflipDepositChannelEvent = {
  event: 'LiquidityDepositAddressReady'
  channel_id: number
  asset: ChainflipAsset
  deposit_address: string
  account_id: string
  expiry_block: number
  boost_fee: number
  channel_opening_fee: string
} & Record<string, unknown>
