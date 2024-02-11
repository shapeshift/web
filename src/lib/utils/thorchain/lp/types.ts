import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { BN } from 'lib/bignumber/bignumber'

export type ThorNodeLiquidityProvider = {
  asset: string
  asset_address?: string
  rune_address?: string
  last_add_height?: number
  last_withdraw_height?: number
  pending_rune: string
  pending_asset: string
  pending_tx_id?: string
  units: string
  rune_deposit_value: string
  asset_deposit_value: string
}

export type MidgardPool = {
  assetAdded: string
  assetAddress: string
  assetDeposit: string
  assetPending: string
  assetWithdrawn: string
  dateFirstAdded: string
  dateLastAdded: string
  liquidityUnits: string
  pool: string
  runeAdded: string
  runeAddress: string
  runeDeposit: string
  runePending: string
  runeWithdrawn: string
}

export type MidgardLiquidityProvidersList = string[]
export type MidgardLiquidityProvider = {
  pools: MidgardPool[]
}

export type MidgardPoolStats = {
  addAssetLiquidityVolume: string
  addLiquidityCount: string
  addLiquidityVolume: string
  addRuneLiquidityVolume: string
  annualPercentageRate: string
  asset: string
  assetDepth: string
  assetPrice: string
  assetPriceUSD: string
  averageSlip: string
  impermanentLossProtectionPaid: string
  liquidityUnits: string
  poolAPY: string
  runeDepth: string
  status: string
  swapCount: string
  swapVolume: string
  synthSupply: string
  synthUnits: string
  toAssetAverageSlip: string
  toAssetCount: string
  toAssetFees: string
  toAssetVolume: string
  toRuneAverageSlip: string
  toRuneCount: string
  toRuneFees: string
  toRuneVolume: string
  totalFees: string
  uniqueMemberCount: string
  uniqueSwapperCount: string
  units: string
  withdrawAssetVolume: string
  withdrawCount: string
  withdrawRuneVolume: string
  withdrawVolume: string
}

type MidgardInterval = {
  averageSlip: string
  endTime: string
  runePriceUSD: string
  startTime: string
  synthMintAverageSlip: string
  synthMintCount: string
  synthMintFees: string
  synthMintVolume: string
  synthRedeemAverageSlip: string
  synthRedeemCount: string
  synthRedeemFees: string
  synthRedeemVolume: string
  toAssetAverageSlip: string
  toAssetCount: string
  toAssetFees: string
  toAssetVolume: string
  toRuneAverageSlip: string
  toRuneCount: string
  toRuneFees: string
  toRuneVolume: string
  totalCount: string
  totalFees: string
  totalVolume: string
}

export type MidgardSwapHistoryResponse = {
  intervals: MidgardInterval[]
  meta: MidgardInterval
}

// TODO(gomes): This is the LP provider type from /liquidity_provider/<address>, which contains more data then the one from /liquidity_providers/
// use this instead of the /liquidity_providers/ endpoint when applicable, and perhaps consume those fields if useful?
// We're not using this anywhere just yet, but most likely should.
export type ExtendedThorNodeLiquidityProvider = ThorNodeLiquidityProvider & {
  rune_redeem_value: string
  asset_redeem_value: string
  luvi_deposit_value: string
  luvi_redeem_value: string
  luvi_growth_pct: string
}

export type ThorchainLiquidityProvidersResponseSuccess = ThorNodeLiquidityProvider[]

type ThorchainEarningsHistoryPoolItem = {
  pool: string
  assetLiquidityFees: string
  runeLiquidityFees: string
  totalLiquidityFeesRune: string
  saverEarning: string
  rewards: string
  earnings: string
}

type ThorchainEarningsHistoryItem = {
  startTime: string
  endTime: string
  liquidityFees: string
  blockRewards: string
  earnings: string
  bondingEarnings: string
  liquidityEarnings: string
  avgNodeCount: string
  runePriceUSD: string
  pools: ThorchainEarningsHistoryPoolItem[]
}

type ThorchainEarningsHistoryInterval = {
  startTime: string
  endTime: string
  liquidityFees: string
  blockRewards: string
  earnings: string
  bondingEarnings: string
  liquidityEarnings: string
  avgNodeCount: string
  runePriceUSD: string
  pools: ThorchainEarningsHistoryPoolItem[]
}

export type ThorchainEarningsHistoryResponse = {
  meta: ThorchainEarningsHistoryItem
  intervals: ThorchainEarningsHistoryInterval[]
}

export type PoolShareDetail = {
  assetShare: BN
  runeShare: BN
  poolShareDecimalPercent: string
}

export type PoolDepth = {
  pool: string
  totalDepth: string
}

export type MidgardTvlHistoryItem = {
  startTime: string
  endTime: string
  totalValuePooled: string
  poolsDepth: PoolDepth[]
  totalValueBonded: string
  totalValueLocked: string
  runePriceUSD: string
}

export type MidgardTvlHistoryResponse = {
  meta: MidgardTvlHistoryItem
  intervals: MidgardTvlHistoryItem[]
}

export type LpConfirmedDepositQuote = {
  totalAmountFiat: string
  assetCryptoLiquidityAmount: string
  assetFiatLiquidityAmount: string
  runeCryptoLiquidityAmount: string
  runeFiatLiquidityAmount: string
  shareOfPoolDecimalPercent: string
  slippageRune: string
  opportunityId: string
  accountIdsByChainId: Record<ChainId, AccountId>
  feeBps: string
  feeAmountFiat: string
  assetAddress?: string
  quoteInboundAddress: string
  // For informative purposes only at confirm step - to be recalculated before signing
  totalGasFeeFiat: string
  runeGasFeeFiat: string
  poolAssetGasFeeFiat: string
}

export type LpConfirmedWithdrawalQuote = {
  repaymentAmountCryptoPrecision: string
  totalAmountFiat: string
  assetCryptoLiquidityAmount: string
  assetFiatLiquidityAmount: string
  runeCryptoLiquidityAmount: string
  runeFiatLiquidityAmount: string
  shareOfPoolDecimalPercent: string
  slippageRune: string
  opportunityId: string
  accountIdsByChainId: Record<ChainId, AccountId>
  // feeBps: string
  // feeAmountFiat: string
  assetAddress?: string
  quoteInboundAddress: string
  // For informative purposes only at confirm step - to be recalculated before signing
  totalGasFeeFiat: string
  runeGasFeeFiat: string
  poolAssetGasFeeFiat: string
}

export enum AsymSide {
  Asset = 'asset',
  Rune = 'rune',
}

export type UserLpDataPosition = {
  dateFirstAdded: string
  liquidityUnits: string
  underlyingAssetAmountCryptoPrecision: string
  underlyingRuneAmountCryptoPrecision: string
  isAsymmetric: boolean
  asymSide: AsymSide | null
  underlyingAssetValueFiatUserCurrency: string
  underlyingRuneValueFiatUserCurrency: string
  totalValueFiatUserCurrency: string
  poolOwnershipPercentage: string
  opportunityId: string
  poolShare: string

  // DO NOT REMOVE these two. While it looks like this would be superfluous because we already have AccountId, that's not exactly true.
  // AccountId refers to the AccountId the position was *fetched* with/for, e.g ETH account 0 or ROON account 0.
  // However, for sym., the position will be present in both ETH and RUNE /member/<address> responses, so we need to keep track of both addresses
  // for reliable deduplication
  runeAddress: string
  assetAddress: string
  accountId: AccountId

  assetId: AssetId
}
