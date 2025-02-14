import { ChainflipStatusMessage } from '../constants'
import type { ChainFlipStatus } from '../types'

export const getLatestChainflipStatusMessage = (status: ChainFlipStatus): string => {
  const { state, swapEgress } = status.status

  switch (state) {
    case 'waiting':
      return ChainflipStatusMessage.WaitingForDeposit
    case 'receiving':
      return ChainflipStatusMessage.DepositDetected
    case 'swapping':
      return ChainflipStatusMessage.ProcessingSwap
    case 'sent':
      return ChainflipStatusMessage.TransactionSent
    case 'sending':
      return swapEgress?.transactionReference
        ? ChainflipStatusMessage.OutboundTransactionInitiated
        : ChainflipStatusMessage.PreparingOutboundTransaction
    case 'completed':
      return ChainflipStatusMessage.SwapComplete
    case 'failed':
      return ChainflipStatusMessage.SwapFailed
    default:
      return 'Unknown status'
  }
}
