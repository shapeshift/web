import type { ChainId } from '@shapeshiftoss/caip'
import { bchChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { isUtxoChainId } from '@shapeshiftoss/utils'

import type { SupportedChainIds, SwapSource } from '../../types'
import { SwapperName } from '../../types'

export const THOR_PRECISION = 8

export const thorchainSellSupportedChainIds: Record<ChainId, boolean> = {
  [KnownChainIds.EthereumMainnet]: true,
  [KnownChainIds.BitcoinMainnet]: true,
  [KnownChainIds.DogecoinMainnet]: true,
  [KnownChainIds.LitecoinMainnet]: true,
  [KnownChainIds.BitcoinCashMainnet]: true,
  [KnownChainIds.CosmosMainnet]: true,
  [KnownChainIds.ThorchainMainnet]: true,
  [KnownChainIds.AvalancheMainnet]: true,
  [KnownChainIds.BnbSmartChainMainnet]: true,
  [KnownChainIds.BaseMainnet]: true,
}

export const thorchainBuySupportedChainIds: Record<ChainId, boolean> = {
  [KnownChainIds.EthereumMainnet]: true,
  [KnownChainIds.BitcoinMainnet]: true,
  [KnownChainIds.DogecoinMainnet]: true,
  [KnownChainIds.LitecoinMainnet]: true,
  [KnownChainIds.BitcoinCashMainnet]: true,
  [KnownChainIds.CosmosMainnet]: true,
  [KnownChainIds.ThorchainMainnet]: true,
  [KnownChainIds.AvalancheMainnet]: true,
  [KnownChainIds.BnbSmartChainMainnet]: true,
  [KnownChainIds.BaseMainnet]: true,
}

export const THORCHAIN_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: Object.keys(thorchainSellSupportedChainIds),
  buy: Object.keys(thorchainBuySupportedChainIds),
}

export const THORCHAIN_STREAM_SWAP_SOURCE: SwapSource = `${SwapperName.Thorchain} • Streaming`
export const THORCHAIN_LONGTAIL_SWAP_SOURCE: SwapSource = `${SwapperName.Thorchain} • Long-tail`
export const THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE: SwapSource = `${SwapperName.Thorchain} • Long-tail streaming`

export const BTC_MAXIMUM_BYTES_LENGTH = 80
export const BCH_MAXIMUM_BYTES_LENGTH = 220

export const getMaxBytesLengthByChainId = (chainId: ChainId) => {
  if (chainId === bchChainId) return BCH_MAXIMUM_BYTES_LENGTH
  if (isUtxoChainId(chainId)) return BTC_MAXIMUM_BYTES_LENGTH
  return Infinity
}

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
