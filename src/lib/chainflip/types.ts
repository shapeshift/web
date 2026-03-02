export type Permill = number
export type Perbill = number

export type ChainflipChain =
  | 'Bitcoin'
  | 'Ethereum'
  | 'Solana'
  | 'Polkadot'
  | 'Arbitrum'
  | 'Assethub'

export type ChainflipAssetSymbol = 'BTC' | 'ETH' | 'SOL' | 'USDC' | 'USDT' | 'FLIP' | 'DOT'

export type ChainflipAsset = {
  chain: ChainflipChain
  asset: ChainflipAssetSymbol
}

export type ChainflipInterestRateCurve = {
  interest_at_zero_utilisation: Permill
  junction_utilisation: Permill
  interest_at_junction_utilisation: Permill
  interest_at_max_utilisation: Permill
}

export type ChainflipLtvThresholds = {
  target: Permill
  topup: Permill
  soft_liquidation: Permill
  soft_liquidation_abort: Permill
  hard_liquidation: Permill
  hard_liquidation_abort: Permill
  low_ltv: Permill
}

export type ChainflipNetworkFeeContributions = {
  extra_interest: Permill
  from_origination_fee: Permill
  from_liquidation_fee: Permill
  low_ltv_penalty_max: Permill
}

export type ChainflipLendingPool = {
  asset: ChainflipAsset
  total_amount: string
  available_amount: string
  owed_to_network: string
  utilisation_rate: Perbill
  current_interest_rate: Perbill
  origination_fee: Permill
  liquidation_fee: Permill
  interest_rate_curve: ChainflipInterestRateCurve
}

export type ChainflipLendingPoolsResponse = ChainflipLendingPool[]

export type ChainflipLendingConfig = {
  ltv_thresholds: ChainflipLtvThresholds
  network_fee_contributions: ChainflipNetworkFeeContributions
  fee_swap_interval_blocks: number
  interest_payment_interval_blocks: number
  fee_swap_threshold_usd: string
  interest_collection_threshold_usd: string
  soft_liquidation_swap_chunk_size_usd: string
  hard_liquidation_swap_chunk_size_usd: string
  soft_liquidation_max_oracle_slippage: Permill
  hard_liquidation_max_oracle_slippage: Permill
  fee_swap_max_oracle_slippage: Permill
  minimum_loan_amount_usd: string
  minimum_supply_amount_usd: string
  minimum_update_loan_amount_usd: string
  minimum_update_collateral_amount_usd: string
}

export type ChainflipCollateralBalance = {
  chain: ChainflipChain
  asset: ChainflipAssetSymbol
  amount: string
}

export type ChainflipLoan = {
  loan_id: number
  asset: ChainflipAsset
  created_at: number
  principal_amount: string
}

export type ChainflipLoanAccount = {
  account: string
  collateral_topup_asset: ChainflipAsset
  ltv_ratio: string
  collateral: ChainflipCollateralBalance[]
  loans: ChainflipLoan[]
  liquidation_status: unknown
}

export type ChainflipLoanAccountsResponse = ChainflipLoanAccount[]

export type ChainflipSupplyPosition = {
  lp_id: string
  total_amount: string
}

export type ChainflipPoolSupplyBalances = {
  chain: ChainflipChain
  asset: ChainflipAssetSymbol
  positions: ChainflipSupplyPosition[]
}

export type ChainflipSupplyBalancesResponse = ChainflipPoolSupplyBalances[]

export type ChainflipOraclePrice = {
  price: string
  updated_at_oracle_timestamp: number
  updated_at_statechain_block: number
  base_asset: string
  quote_asset: string
  price_status: string
}

export type ChainflipOraclePricesResponse = ChainflipOraclePrice[]

export type ChainflipFreeBalance = {
  asset: ChainflipAsset
  balance: string
}

export type ChainflipFreeBalancesRawResponse = Record<string, Record<string, string>>

export type ChainflipFreeBalancesResponse = ChainflipFreeBalance[]

export type ChainflipLendingPoolsSafeMode = {
  borrowing: ChainflipAsset[]
  add_lender_funds: ChainflipAsset[]
  withdraw_lender_funds: ChainflipAsset[]
  add_collateral: ChainflipAsset[]
  remove_collateral: ChainflipAsset[]
  liquidations_enabled: boolean
  add_boost_funds_enabled: boolean
  stop_boosting_enabled: boolean
}

export type ChainflipSafeModeStatusesResponse = {
  lending_pools: ChainflipLendingPoolsSafeMode
  liquidity_provider: {
    deposit_enabled: boolean
    withdrawal_enabled: boolean
    internal_swaps_enabled: boolean
  }
} & Record<string, unknown>

export type ChainflipAccountInfo = {
  role: 'unregistered' | 'liquidity_provider' | 'validator' | string
  flip_balance: string
  bond: string
  refund_addresses?: Record<string, string | null> | null
  estimated_redeemable_balance: string
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

export type ChainflipMinimumDepositAmounts = Record<
  ChainflipChain,
  Partial<Record<ChainflipAssetSymbol, string>>
>

export type ChainflipEnvironmentIngressEgress = {
  minimum_deposit_amounts: ChainflipMinimumDepositAmounts
}

export type ChainflipEnvironmentResponse = {
  ingress_egress: ChainflipEnvironmentIngressEgress
} & Record<string, unknown>

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

export type ChainflipOpenDepositChannelEntry = [
  string,
  string,
  {
    chain_accounts: [Record<string, unknown>, ChainflipAsset][]
  },
]

export type ChainflipOpenDepositChannelsResponse = ChainflipOpenDepositChannelEntry[]
