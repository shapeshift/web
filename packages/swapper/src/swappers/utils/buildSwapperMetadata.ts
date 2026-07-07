import { SwapperName } from '../../types'
import type {
  CommonSwapMetadata,
  SwapMetadata,
  SwapperMetadata,
  TradeQuoteStep,
} from '../../types'

// Derives the swapper-specific variant from a step's legacy per-swapper fields. Transitional
// fallback for swappers that don't yet emit `step.swapperMetadata` directly — remove once all do.
const deriveLegacyStepSwapperMetadata = (step: TradeQuoteStep): SwapperMetadata => {
  if (step.relayTransactionMetadata) {
    const data = step.transactionData?.type === 'evm' ? step.transactionData.data : undefined

    return {
      swapper: 'relay',
      relayId: step.relayTransactionMetadata.relayId,
      orderId: step.relayTransactionMetadata.orderId,
      data,
    }
  }

  if (step.source === SwapperName.Debridge) {
    return { swapper: 'debridge', isSameChainSwap: step.sellAsset.chainId === step.buyAsset.chainId }
  }

  if (step.bobSpecific) return { swapper: 'bob', orderId: step.bobSpecific.orderId }

  if (step.chainflipSpecific?.chainflipSwapId != null) {
    return { swapper: 'chainflip', chainflipSwapId: step.chainflipSpecific.chainflipSwapId }
  }

  if (step.nearIntentsSpecific) {
    return {
      swapper: 'nearIntents',
      depositAddress: step.nearIntentsSpecific.depositAddress,
      depositMemo: step.nearIntentsSpecific.depositMemo,
      timeEstimate: step.nearIntentsSpecific.timeEstimate,
      deadline: step.nearIntentsSpecific.deadline,
    }
  }

  return {}
}

// Builds a swap's metadata from its (first) step: the swapper-specific variant (preferring the
// step's own `swapperMetadata`, falling back to the legacy fields) intersected with the common
// fields. Shared by the public-api quote store and the web app so the two stay in lockstep.
export const buildSwapperMetadata = (
  step: TradeQuoteStep,
  common: CommonSwapMetadata,
): SwapMetadata => ({
  ...common,
  ...(step.swapperMetadata ?? deriveLegacyStepSwapperMetadata(step)),
})
