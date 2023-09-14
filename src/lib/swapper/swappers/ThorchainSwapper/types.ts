import type { KnownChainIds } from '@shapeshiftoss/types'

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
  totalCollateral: string
  totalDebtTor: string
  units: string
  volume24h: string
}

export type ThornodePoolResponse = {
  LP_units: string
  asset: string
  balance_asset: string
  balance_rune: string
  pending_inbound_asset: string
  pending_inbound_rune: string
  pool_units: string
  savers_depth: string
  savers_units: string
  status: string
  synth_mint_paused: boolean
  synth_supply: string
  synth_supply_remaining: string
  synth_units: string
  derived_depth_bps: number
}

export type ThornodeQuoteResponseSuccess = {
  dust_threshold?: string
  expected_amount_out: string
  expiry: string
  fees: {
    affiliate: string
    asset: string
    liquidity: string
    outbound: string
    slippage_bps: number
    total: string
    total_bps: number
  }
  inbound_address: string
  inbound_confirmation_blocks?: number
  inbound_confirmation_seconds?: number
  max_streaming_quantity?: number
  memo?: string
  notes: string
  outbound_delay_blocks: number
  outbound_delay_seconds: number
  recommended_min_amount_in?: string
  router?: string
  streaming_swap_blocks?: number
  streaming_swap_seconds?: number
  // total number of seconds a swap is expected to take (inbound conf + streaming swap + outbound delay)
  total_swap_seconds?: number
  warning: string
}

type ThornodeQuoteResponseError = { error: string }
export type ThornodeQuoteResponse = ThornodeQuoteResponseSuccess | ThornodeQuoteResponseError

type MidgardCoins = {
  asset: string
}[]

type MidgardActionOut = {
  coins: MidgardCoins
  txID: string
}

type MidgardAction = {
  date: string
  height: string
  out: MidgardActionOut[]
  status: string
  type: string
}

export type MidgardActionsResponse = {
  actions: MidgardAction[]
}

export type InboundAddressResponse = {
  chain: string
  pub_key: string
  address: string
  halted: boolean
  gas_rate: string
  gas_rate_units: string
  router?: string
  global_trading_paused: boolean
  chain_trading_paused: boolean
  chain_lp_actions_paused: boolean
  outbound_tx_size: string
  outbound_fee: string
}

export type ThorUtxoSupportedChainId =
  | KnownChainIds.BitcoinMainnet
  | KnownChainIds.DogecoinMainnet
  | KnownChainIds.LitecoinMainnet
  | KnownChainIds.BitcoinCashMainnet

export type ThorEvmSupportedChainId = KnownChainIds.EthereumMainnet | KnownChainIds.AvalancheMainnet

export type ThorCosmosSdkSupportedChainId =
  | KnownChainIds.ThorchainMainnet
  | KnownChainIds.CosmosMainnet

export type ThorChainId =
  | ThorCosmosSdkSupportedChainId
  | ThorEvmSupportedChainId
  | ThorUtxoSupportedChainId

type ThorNodeStatusResponseSuccess = {
  // Non-exhaustive. https://thornode.ninerealms.com/thorchain/doc/ for the full response type.
  tx?: {
    id: string
    memo: string
    chain: string
    from_address: string
    to_address: string
  }
  stages: {
    inbound_observed: {
      started?: boolean
      final_count: number
      completed: boolean
    }
    inbound_confirmation_counted?: {
      completed: boolean
    }
    inbound_finalised?: {
      completed: boolean
    }
    swap_status?: {
      pending: boolean
    }
    outbound_signed?: {
      completed: boolean
    }
  }
}

export type ThornodeStatusResponse = ThorNodeStatusResponseSuccess | ThornodeQuoteResponseError
