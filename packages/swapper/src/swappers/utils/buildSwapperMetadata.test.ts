import { describe, expect, it } from 'vitest'

import { buildSwapperMetadata } from './buildSwapperMetadata'

const common = {
  stepIndex: 0 as const,
  quoteId: 'q1',
  relayerTxHash: undefined,
  relayerExplorerTxLink: undefined,
  streamingSwapMetadata: undefined,
}

describe('buildSwapperMetadata', () => {
  it("layers the common fields onto the step's swapperMetadata variant", () => {
    expect(
      buildSwapperMetadata(
        { swapperMetadata: { swapper: 'relay', relayId: 'r', orderId: 'o', data: '0xcd' } } as any,
        common,
      ),
    ).toEqual({ ...common, swapper: 'relay', relayId: 'r', orderId: 'o', data: '0xcd' })
  })

  it('carries a chainflip variant', () => {
    expect(
      buildSwapperMetadata(
        { swapperMetadata: { swapper: 'chainflip', chainflipSwapId: 42 } } as any,
        common,
      ),
    ).toEqual({ ...common, swapper: 'chainflip', chainflipSwapId: 42 })
  })

  it('is common-only for swappers with no swapperMetadata variant', () => {
    expect(buildSwapperMetadata({} as any, common)).toEqual(common)
  })
})
