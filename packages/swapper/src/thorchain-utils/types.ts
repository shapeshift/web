import type BigNumber from 'bignumber.js'

import type { SwapSource, TradeQuote, TradeRate } from '../types'

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
  asset_tor_price: string
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
  chain: string
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

type ThorNodeCoinSchema = {
  asset: string
  amount: string
  decimals?: number
}

export type ThorNodeTxSchema = {
  id: string
  chain: string
  from_address: string
  to_address: string
  coins: ThorNodeCoinSchema[]
  gas: ThorNodeCoinSchema[]
  memo?: string
}

export type ThorNodePlannedTxSchema = {
  chain: string
  to_address: string
  coin: ThorNodeCoinSchema
  refund: boolean
}

export type ThorNodeStatusResponseSuccess = {
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
      final_count?: number
      pre_confirmation_count?: number
      completed: boolean
    }
    inbound_confirmation_counted?: {
      completed: boolean
      counting_start_height?: number
      chain?: string
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

export type ThorEvmTradeQuote = TradeQuote &
  ThorTradeQuoteSpecificMetadata & {
    router: string
    vault: string
    aggregator?: string
    data: string
  } & {
    receiveAddress: string
  }

export type ThorTradeUtxoOrCosmosQuote = TradeQuote & ThorTradeQuoteSpecificMetadata
export type ThorTradeQuote = ThorEvmTradeQuote | ThorTradeUtxoOrCosmosQuote

export enum ThorchainStatusMessage {
  InboundObserved = 'Inbound transaction accepted by THOR',
  InboundObservingPending = 'Inbound transaction pending',
  InboundConfirmationCounted = 'Inbound transaction confirmed',
  InboundConfirmationPending = 'Awaiting inbound transaction confirmation',
  InboundFinalized = 'Inbound transaction finalized',
  InboundFinalizationPending = 'Awaiting inbound transaction finalization',
  SwapPending = 'Swap pending',
  SwapCompleteAwaitingOutbound = 'Swap complete, awaiting outbound transaction',
  SwapCompleteAwaitingDestination = 'Swap complete, awaiting destination chain',
  OutboundDelayTimeRemaining = 'Awaiting outbound delay ({timeRemaining} remaining)',
  OutboundDelayPending = 'Awaiting outbound delay',
  OutboundSigned = 'Outbound transaction transmitted, waiting on destination chain...',
  OutboundScheduled = 'Outbound transaction scheduled, waiting on destination chain...',
}

export enum TradeType {
  LongTailToLongTail = 'LongTailToLongTail',
  LongTailToL1 = 'LongTailToL1',
  L1ToLongTail = 'L1ToLongTail',
  L1ToL1 = 'L1ToL1',
}

type ThorTradeQuoteSpecificMetadata = {
  isStreaming: boolean
  memo: string
  recommendedMinimumCryptoBaseUnit: string
  tradeType: TradeType
  expiry: number
  longtailData?: {
    longtailToL1ExpectedAmountOut?: string
    L1ToLongtailExpectedAmountOut?: string
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

export type ThorTradeRoute = {
  source: SwapSource
  quote: ThornodeQuoteResponseSuccess
  expectedAmountOutThorBaseUnit: string
  isStreaming: boolean
  affiliateBps: string
  slippageBps: BigNumber
  estimatedExecutionTimeMs: number | undefined
}
