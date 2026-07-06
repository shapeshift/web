import { describe, expect, it } from 'vitest'

import { SwapperName } from '../../types'
import { buildSwapperMetadata } from './buildSwapperMetadata'

const common = {
  stepIndex: 0 as const,
  quoteId: 'q1',
  relayerTxHash: undefined,
  relayerExplorerTxLink: undefined,
  streamingSwapMetadata: undefined,
}

describe('buildSwapperMetadata', () => {
  it('builds relay tracking with calldata for the indexer', () => {
    expect(
      buildSwapperMetadata(
        {
          relayTransactionMetadata: { relayId: 'r', orderId: 'o' },
          transactionData: { type: 'evm', chainId: 1, to: '0x', value: '0', data: '0xcd' },
        } as any,
        common,
      ),
    ).toEqual({ ...common, swapper: 'relay', relayId: 'r', orderId: 'o', data: '0xcd' })
  })

  it('derives debridge isSameChainSwap from sell/buy chainId', () => {
    expect(
      buildSwapperMetadata(
        {
          source: SwapperName.Debridge,
          sellAsset: { chainId: 'eip155:1' },
          buyAsset: { chainId: 'eip155:1' },
        } as any,
        common,
      ),
    ).toEqual({ ...common, swapper: 'debridge', isSameChainSwap: true })
  })

  it('builds bob tracking from orderId', () => {
    expect(
      buildSwapperMetadata({ bobSpecific: { orderId: 'bob-1' } } as any, common),
    ).toEqual({ ...common, swapper: 'bob', orderId: 'bob-1' })
  })

  it('builds chainflip tracking from the swap id', () => {
    expect(
      buildSwapperMetadata({ chainflipSpecific: { chainflipSwapId: 42 } } as any, common),
    ).toEqual({ ...common, swapper: 'chainflip', chainflipSwapId: 42 })
  })

  it('falls through to common-only for swappers without specific tracking', () => {
    expect(buildSwapperMetadata({ source: SwapperName.Zrx } as any, common)).toEqual(common)
  })
})
