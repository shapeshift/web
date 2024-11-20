import type { KnownChainIds } from '@shapeshiftoss/types'

import type { TradeQuote, TradeRate } from '../../types'
import type { TradeType } from './utils/longTailHelpers'

export type ThornodePoolStatuses = 'Available' | 'Staged' | 'Suspended'

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
  status: 'available' | 'staged' | 'suspended'
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
  status: ThornodePoolStatuses
  synth_mint_paused: boolean
  synth_supply: string
  synth_supply_remaining: string
  synth_units: string
  derived_depth_bps: string
  loan_collateral: string
  loan_collateral_remaining: string
  loan_cr: string
}

export type ThornodeQuoteResponseSuccess = {
  dust_threshold?: string
  expected_amount_out: string
  expiry: number
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

type ThornodeResponseError = { error: string }
export type ThornodeQuoteResponse = ThornodeQuoteResponseSuccess | ThornodeResponseError

type MidgardCoins = {
  asset: string
}[]

type MidgardActionIn = {
  coins: MidgardCoins
  txID: string
}

type MidgardActionOut = {
  coins: MidgardCoins
  txID: string
}

type MidgardAction = {
  date: string
  height: string
  in: MidgardActionIn[]
  out: MidgardActionOut[]
  status: string
  type: string
}

export type MidgardActionsResponse = {
  actions: MidgardAction[]
}

export type InboundAddressResponse = {
  chain: ThorchainChain
  pub_key: string
  address: string
  halted: boolean
  gas_rate: string
  gas_rate_units: string
  router?: string
  dust_threshold?: string
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

export type ThorEvmSupportedChainId =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.AvalancheMainnet
  | KnownChainIds.BnbSmartChainMainnet

export type ThorCosmosSdkSupportedChainId =
  | KnownChainIds.ThorchainMainnet
  | KnownChainIds.CosmosMainnet

export type ThorChainId =
  | ThorCosmosSdkSupportedChainId
  | ThorEvmSupportedChainId
  | ThorUtxoSupportedChainId

type ThorNodeCoinSchema = {
  asset: string
  amount: string
  decimals?: number
}

export type ThorNodeTxSchema = {
  id: string
  chain: ThorchainChain
  from_address: string
  to_address: string
  coins: ThorNodeCoinSchema[]
  gas: ThorNodeCoinSchema[]
  memo?: string
}

export type ThorNodePlannedTxSchema = {
  chain: ThorchainChain
  to_address: string
  coin: ThorNodeCoinSchema
  refund: boolean
}

export type ThorNodeStatusResponseSuccess = {
  tx?: {
    id: string
    memo: string
    chain: ThorchainChain
    from_address: string
    to_address: string
  }
  stages: {
    inbound_observed: {
      started?: boolean
      final_count?: number
      pre_confirmation_count?: number
      completed: boolean
    }
    inbound_confirmation_counted?: {
      completed: boolean
      counting_start_height?: number
      chain?: ThorchainChain
      external_observed_height?: number
      external_confirmation_delay_height?: number
      remaining_confirmation_seconds?: number
    }
    inbound_finalised?: {
      completed: boolean
    }
    swap_status?: {
      pending: boolean
      streaming?: {
        interval: number
        quantity: number
        count: number
      }
    }
    swap_finalised?: {
      completed: boolean
    }
    outbound_delay?: {
      remaining_delay_blocks?: number
      remaining_delay_seconds?: number
      completed: boolean
    }
    outbound_signed?: {
      scheduled_outbound_height?: number
      blocks_since_scheduled?: number
      completed: boolean
    }
  }
  out_txs?: ThorNodeTxSchema[]
  planned_out_txs?: ThorNodePlannedTxSchema[]
}

export type ThorNodeTxResponseSuccess = {
  observed_tx: {
    tx: ThorNodeTxSchema
    observed_pub_key?: string
    external_observed_height?: number
    external_confirmation_delay_height?: number
    aggregator?: string
    aggregator_target?: string
    aggregator_target_limit?: string
    signers?: string[]
    keysign_ms?: number
    out_hashes?: string[]
    status?: 'done' | 'incomplete'
  }
  consensus_height?: number
  finalised_height?: number
  outbound_height?: number
  keysign_metric?: { tx_id?: string; node_tss_times: { address?: string; tss_time?: number }[] }
}

export type ThornodeStatusResponse = ThorNodeStatusResponseSuccess | ThornodeResponseError
export type ThornodeTxResponse = ThorNodeTxResponseSuccess | ThornodeResponseError

// When this is updated, also update the instance in generateTradableThorAssetMap
export enum ThorchainChain {
  BTC = 'BTC',
  DOGE = 'DOGE',
  LTC = 'LTC',
  BCH = 'BCH',
  ETH = 'ETH',
  AVAX = 'AVAX',
  BNB = 'BNB',
  GAIA = 'GAIA',
  THOR = 'THOR',
  BSC = 'BSC',
}

export type ThorEvmTradeQuote = TradeQuote &
  ThorTradeQuoteSpecificMetadata & {
    router: string
    vault: string
    aggregator?: string
    data: string
    tradeType: TradeType
  } & {
    receiveAddress: string
  }

export type ThorTradeUtxoOrCosmosQuote = TradeQuote & ThorTradeQuoteSpecificMetadata
export type ThorTradeQuote = ThorEvmTradeQuote | ThorTradeUtxoOrCosmosQuote

type ThorTradeQuoteSpecificMetadata = {
  isStreaming: boolean
  memo: string
  recommendedMinimumCryptoBaseUnit: string
  tradeType: TradeType
  expiry: number
  longtailData?: {
    longtailToL1ExpectedAmountOut?: bigint
    L1ToLongtailExpectedAmountOut?: bigint
  }
}

export type ThorEvmTradeRate = TradeRate &
  ThorTradeQuoteSpecificMetadata & {
    router: string
    vault: string
    aggregator?: string
    data: string
    tradeType: TradeType
  }

export type ThorTradeUtxoOrCosmosRate = TradeRate & ThorTradeQuoteSpecificMetadata
export type ThorTradeRate = ThorEvmTradeRate | ThorTradeUtxoOrCosmosRate
