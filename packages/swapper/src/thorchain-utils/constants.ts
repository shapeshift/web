import type { ChainId } from '@shapeshiftoss/caip'
import { bchChainId } from '@shapeshiftoss/caip'
import { isUtxoChainId } from '@shapeshiftoss/utils'

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
