import type { QuoteFees } from 'lib/utils/thorchain/lending/types'

import type { DefiProvider, DefiType, OpportunityMetadataBase } from '../../types'

export type ThorchainSaversStakingSpecificMetadata = OpportunityMetadataBase & {
  provider: DefiProvider.ThorchainSavers
  type: DefiType.Staking
  saversMaxSupplyFiat: string | undefined
  isFull: boolean
}

type MidgardPoolStatus = 'available' | 'staged' | 'suspended'
export type MidgardPoolPeriod =
  | '1h'
  | '24h'
  | '7d'
  | '14d'
  | '30d'
  | '90d'
  | '100d'
  | '180d'
  | '365d'
  | 'all'

export type MidgardPoolRequest = {
  status?: MidgardPoolStatus
  period?: MidgardPoolPeriod
}
export type MidgardPoolResponse = {
  annualPercentageRate: string
  asset: string
  assetDepth: string
  assetPrice: string
  assetPriceUSD: string
  liquidityUnits: string
  nativeDecimal: string
  poolAPY: string
  runeDepth: string
  saversAPR: string
  saversDepth: string
  saversUnits: string
  status: string
  synthSupply: string
  synthUnits: string
  units: string
  volume24h: string
}

export type ThorchainSaverPositionResponse = {
  asset: string
  asset_address: string
  last_add_height: number
  units: string
  asset_deposit_value: string
  asset_redeem_value: string
  growth_pct: string
}

export type ThorchainSaversCommonQuoteResponseSuccess = {
  expiry: string // TODO(gomes): guard against expired quote
  dust_threshold: string
  expected_amount_out: string
  fees: QuoteFees
  inbound_address: string
  memo: string
  notes: string
  warning: string
}

export type ThorchainSaversCommonQuoteResponseError = {
  error: string
}

export type ThorchainSaversDepositQuoteResponseSuccess =
  ThorchainSaversCommonQuoteResponseSuccess & {
    inbound_confirmation_blocks: number
    expected_amount_deposit: string
    /** @deprecated use expected_amount_deposit instead */
    expected_amount_out: string
  }

export type ThorchainSaversWithdrawQuoteResponseSuccess =
  ThorchainSaversCommonQuoteResponseSuccess & {
    outbound_delay_blocks: number
    outbound_delay_seconds: number
    dust_amount: string
  }

export type ThorchainSaversDepositQuoteResponse =
  | ThorchainSaversDepositQuoteResponseSuccess
  | ThorchainSaversCommonQuoteResponseError

export type ThorchainSaversWithdrawQuoteResponse =
  | ThorchainSaversWithdrawQuoteResponseSuccess
  | ThorchainSaversCommonQuoteResponseError
