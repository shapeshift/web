import { describe, expect, it } from 'vitest'

import { buildSwapMetadata } from './buildSwapMetadata'

const common = {
  stepIndex: 0 as const,
  quoteId: 'q1',
  relayerTxHash: undefined,
  relayerExplorerTxLink: undefined,
  streamingSwapMetadata: undefined,
}

describe('buildSwapMetadata', () => {
  it("layers the common fields onto the step's swapperMetadata variant", () => {
    expect(
      buildSwapMetadata(
        { swapperMetadata: { swapper: 'relay', relayId: 'r', orderId: 'o', data: '0xcd' } } as any,
        common,
      ),
    ).toEqual({ ...common, swapper: 'relay', relayId: 'r', orderId: 'o', data: '0xcd' })
  })

  it('carries a chainflip variant', () => {
    expect(
      buildSwapMetadata(
        { swapperMetadata: { swapper: 'chainflip', chainflipSwapId: 42 } } as any,
        common,
      ),
    ).toEqual({ ...common, swapper: 'chainflip', chainflipSwapId: 42 })
  })

  it('is common-only for swappers with no swapperMetadata variant', () => {
    expect(buildSwapMetadata({} as any, common)).toEqual(common)
  })
})
