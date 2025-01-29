import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { BN } from 'lib/bignumber/bignumber'
import type { OpportunityType } from 'pages/ThorChainLP/utils'

export type ThornodeLiquidityProvider = {
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

export type MidgardMemberPool = {
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

export type MidgardMembersList = string[]

export type MidgardMember = {
  pools: MidgardMemberPool[]
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

export type MidgardInterval = {
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
export type ExtendedThornodeLiquidityProvider = ThornodeLiquidityProvider & {
  rune_redeem_value: string
  asset_redeem_value: string
  luvi_deposit_value: string
  luvi_redeem_value: string
  luvi_growth_pct: string
}

export type ThorchainLiquidityProvidersResponseSuccess = ThornodeLiquidityProvider[]

export type MidgardEarningsHistoryPoolItem = {
  pool: string
  assetLiquidityFees: string
  runeLiquidityFees: string
  totalLiquidityFeesRune: string
  saverEarning: string
  rewards: string
  earnings: string
}

type MidgardEarningsHistoryItem = {
  startTime: string
  endTime: string
  liquidityFees: string
  blockRewards: string
  earnings: string
  bondingEarnings: string
  liquidityEarnings: string
  avgNodeCount: string
  runePriceUSD: string
  pools: MidgardEarningsHistoryPoolItem[]
}

type MidgardEarningsHistoryInterval = {
  startTime: string
  endTime: string
  liquidityFees: string
  blockRewards: string
  earnings: string
  bondingEarnings: string
  liquidityEarnings: string
  avgNodeCount: string
  runePriceUSD: string
  pools: MidgardEarningsHistoryPoolItem[]
}

export type MidgardEarningsHistoryResponse = {
  meta: MidgardEarningsHistoryItem
  intervals: MidgardEarningsHistoryInterval[]
}

export type PoolShareDetail = {
  assetShareThorBaseUnit: BN
  runeShareThorBaseUnit: BN
  poolShareDecimalPercent: string
}

export type SlippageDetails = {
  decimalPercent: string
  runeAmountCryptoPrecision: string
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
  totalAmountUsd: string
  assetDepositAmountCryptoPrecision: string
  assetDepositAmountFiatUserCurrency: string
  runeDepositAmountCryptoPrecision: string
  runeDepositAmountFiatUserCurrency: string
  shareOfPoolDecimalPercent: string
  slippageFiatUserCurrency: string
  opportunityId: string
  currentAccountIdByChainId: Record<ChainId, AccountId>
  feeBps: string
  feeAmountFiatUserCurrency: string
  feeAmountUSD: string
  assetAddress?: string
  positionStatus?: PositionStatus
  // For informative purposes only at confirm step - to be recalculated before signing
  totalGasFeeFiatUserCurrency: string
  runeGasFeeFiatUserCurrency: string
  poolAssetGasFeeFiatUserCurrency: string
}

export type LpConfirmedWithdrawalQuote = {
  assetWithdrawAmountCryptoPrecision: string
  assetWithdrawAmountFiatUserCurrency: string
  runeWithdrawAmountCryptoPrecision: string
  runeWithdrawAmountFiatUserCurrency: string
  shareOfPoolDecimalPercent: string
  slippageFiatUserCurrency: string
  opportunityId: string
  withdrawSide: OpportunityType
  currentAccountIdByChainId: Record<ChainId, AccountId | undefined>
  feeBps: string
  assetAddress: string | undefined
  withdrawalBps: string
  positionStatus?: PositionStatus
  // For informative purposes only at confirm step - to be recalculated before signing
  totalGasFeeFiatUserCurrency: string
  runeGasFeeFiatUserCurrency: string
  poolAssetGasFeeFiatUserCurrency: string
}

export enum AsymSide {
  Asset = 'asset',
  Rune = 'rune',
}

export type PositionStatus = {
  isPending: boolean
  incomplete?: {
    asset: Asset
    amountCryptoPrecision: string
  }
}

export type UserLpDataPosition = {
  dateFirstAdded: string
  liquidityUnits: string
  pendingAssetAmountCryptoPrecision: string
  pendingAssetAmountFiatUserCurrency: string
  pendingRuneAmountCryptoPrecision: string
  pendingRuneAmountFiatUserCurrency: string
  underlyingAssetAmountCryptoPrecision: string
  underlyingAssetAmountFiatUserCurrency: string
  underlyingRuneAmountCryptoPrecision: string
  underlyingRuneAmountFiatUserCurrency: string
  totalValueFiatUserCurrency: string
  poolOwnershipPercentage: string
  name: string
  opportunityId: string
  poolShare: string
  asym?: {
    asset: Asset
    side: AsymSide
  }
  status: PositionStatus
  remainingLockupTime: number

  // DO NOT REMOVE these two. While it looks like this would be superfluous because we already have AccountId, that's not exactly true.
  // AccountId refers to the AccountId the position was *fetched* with/for, e.g ETH account 0 or ROON account 0.
  // However, for sym., the position will be present in both ETH and RUNE /member/<address> responses, so we need to keep track of both addresses
  // for reliable deduplication
  runeAddress: string
  assetAddress: string
  accountId: AccountId

  assetId: AssetId
}

export type Position = MidgardMemberPool & { accountId: AccountId }
