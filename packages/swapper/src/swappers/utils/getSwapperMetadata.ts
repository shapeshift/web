import type { SwapMetadata } from '../../types'

// Narrows a swap's metadata to a specific swapper's variant, throwing if it isn't that variant.
// checkTradeStatus is dispatched polymorphically (swappers[name].checkTradeStatus) with the full
// SwapperMetadata union, and the metadata is persisted/round-tripped through swap-service — so this
// runtime guard is the validation boundary for that data, not just a type convenience.
export const getSwapperMetadata = <S extends Exclude<SwapMetadata['swapper'], undefined>>(
  metadata: SwapMetadata,
  swapper: S,
): Extract<SwapMetadata, { swapper: S }> => {
  if (metadata.swapper !== swapper) throw new Error(`Expected ${swapper} swap metadata`)
  return metadata as Extract<SwapMetadata, { swapper: S }>
}
