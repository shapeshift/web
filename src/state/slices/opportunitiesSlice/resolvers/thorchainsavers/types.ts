import type { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

import type { OpportunityMetadataBase } from '../../types'

export type ThorchainSaversStakingSpecificMetadata = OpportunityMetadataBase & {
  provider: DefiProvider.ThorchainSavers
  type: DefiType.Staking
  saversSupplyIncludeAccruedFiat: string
  saversMaxSupplyFiat: string
  isFull: boolean
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
  fees: {
    affiliate: string
    asset: string
    outbound: string
  }
  inbound_address: string
  memo: string
  slippage_bps: number
  notes: string
  warning: string
}

export type ThorchainSaversCommonQuoteResponseError = {
  error: string
}

export type ThorchainSaversDepositQuoteResponseSuccess =
  ThorchainSaversCommonQuoteResponseSuccess & {
    inbound_confirmation_blocks: number
  }

export type ThorchainSaversWithdrawQuoteResponseSuccess =
  ThorchainSaversCommonQuoteResponseSuccess & {
    outbound_delay_blocks: number
    outbound_delay_seconds: number
    slippage_bps: number
  }

export type ThorchainSaversDepositQuoteResponse =
  | ThorchainSaversDepositQuoteResponseSuccess
  | ThorchainSaversCommonQuoteResponseError

export type ThorchainSaversWithdrawQuoteResponse =
  | ThorchainSaversWithdrawQuoteResponseSuccess
  | ThorchainSaversCommonQuoteResponseError
