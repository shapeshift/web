import type { ChainFlipStatus } from '../types'

export const getLatestChainflipStatusMessage = (status: ChainFlipStatus): string => {
  const { state, swapEgress } = status.status

  switch (state) {
    case 'waiting':
      return 'Waiting for deposit...'
    case 'receiving':
      return 'Deposit detected, waiting for confirmation...'
    case 'swapping':
      return 'Processing swap...'
    case 'sent':
      return 'Transaction sent, waiting for confirmation...'
    case 'sending':
      return swapEgress?.transactionReference
        ? 'Outbound transaction initiated...'
        : 'Preparing outbound transaction...'
    case 'completed':
      return 'Swap complete'
    case 'failed':
      return 'Swap failed'
    default:
      return 'Unknown status'
  }
}
