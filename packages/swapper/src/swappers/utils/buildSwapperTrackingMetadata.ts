import { SwapperName } from '../../types'
import type { CommonTrackingMetadata, SwapperTrackingMetadata, TradeQuoteStep } from '../../types'

// Builds a swap's flat tracking metadata from its (first) step: common fields intersected with the
// swapper-specific tracking variant. Shared by the public-api quote store and the web app so the
// two stay in lockstep. Swappers with no swapper-specific tracking fall through to common-only.
export const buildSwapperTrackingMetadata = (
  step: TradeQuoteStep,
  common: CommonTrackingMetadata,
): SwapperTrackingMetadata => {
  if (step.relayTransactionMetadata) {
    const data = step.transactionData?.type === 'evm' ? step.transactionData.data : undefined

    return {
      ...common,
      swapper: 'relay',
      relayId: step.relayTransactionMetadata.relayId,
      orderId: step.relayTransactionMetadata.orderId,
      data,
    }
  }

  if (step.source === SwapperName.Debridge) {
    return {
      ...common,
      swapper: 'debridge',
      isSameChainSwap: step.sellAsset.chainId === step.buyAsset.chainId,
    }
  }

  if (step.bobSpecific) {
    return { ...common, swapper: 'bob', orderId: step.bobSpecific.orderId }
  }

  if (step.chainflipSpecific?.chainflipSwapId != null) {
    return { ...common, swapper: 'chainflip', chainflipSwapId: step.chainflipSpecific.chainflipSwapId }
  }

  if (step.nearIntentsSpecific) {
    return {
      ...common,
      swapper: 'nearIntents',
      depositAddress: step.nearIntentsSpecific.depositAddress,
      depositMemo: step.nearIntentsSpecific.depositMemo,
      timeEstimate: step.nearIntentsSpecific.timeEstimate,
      deadline: step.nearIntentsSpecific.deadline,
    }
  }

  return { ...common }
}
