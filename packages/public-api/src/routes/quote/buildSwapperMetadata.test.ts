import { describe, expect, it } from 'vitest'

import { buildSwapperMetadata } from './buildSwapperMetadata'

describe('buildSwapperMetadata', () => {
  it('builds relay tracking with calldata for the indexer', () => {
    expect(
      buildSwapperMetadata({
        relayTransactionMetadata: { relayId: 'r', orderId: 'o' },
        transactionData: { type: 'evm', chainId: 1, to: '0x', value: '0', data: '0xcd' },
      } as any),
    ).toEqual({ swapper: 'relay', relayId: 'r', orderId: 'o', data: '0xcd' })
  })

  it('returns undefined for non-relay steps', () => {
    expect(buildSwapperMetadata({} as any)).toBeUndefined()
  })
})
