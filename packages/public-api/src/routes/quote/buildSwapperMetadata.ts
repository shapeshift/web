import type { SwapperTrackingMetadata, TradeQuoteStep } from '@shapeshiftoss/swapper'

export const buildSwapperMetadata = (
  step: TradeQuoteStep,
): SwapperTrackingMetadata | undefined => {
  if (!step.relayTransactionMetadata) return undefined

  const data = step.transactionData?.type === 'evm' ? step.transactionData.data : undefined

  return {
    swapper: 'relay',
    relayId: step.relayTransactionMetadata.relayId,
    orderId: step.relayTransactionMetadata.orderId,
    data,
  }
}
