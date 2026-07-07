import type { CommonSwapMetadata, SwapMetadata, TradeQuoteStep } from '../../types'

// Builds a swap's metadata from its (first) step: the swapper-specific variant it emitted
// intersected with the common fields. Shared by the public-api quote store and the web app so the
// two stay in lockstep.
export const buildSwapMetadata = (
  step: TradeQuoteStep,
  common: CommonSwapMetadata,
): SwapMetadata => ({
  ...common,
  ...step.swapperMetadata,
})
