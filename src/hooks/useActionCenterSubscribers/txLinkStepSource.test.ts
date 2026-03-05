import { SwapperName, THORCHAIN_STREAM_SWAP_SOURCE } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import { getStepSourceForTxLink } from './getStepSourceForTxLink'

describe('getStepSourceForTxLink', () => {
  it('preserves chainflip routing when status is unknown and source is undefined', () => {
    expect(
      getStepSourceForTxLink({
        status: TxStatus.Unknown,
        swapperName: SwapperName.Chainflip,
        source: undefined,
      }),
    ).toBe(SwapperName.Chainflip)
  })

  it('preserves source when status is unknown and swapper is chainflip', () => {
    expect(
      getStepSourceForTxLink({
        status: TxStatus.Unknown,
        swapperName: SwapperName.Chainflip,
        source: THORCHAIN_STREAM_SWAP_SOURCE,
      }),
    ).toBe(THORCHAIN_STREAM_SWAP_SOURCE)
  })

  it('returns undefined when status is unknown and swapper is non-chainflip', () => {
    expect(
      getStepSourceForTxLink({
        status: TxStatus.Unknown,
        swapperName: SwapperName.Thorchain,
        source: THORCHAIN_STREAM_SWAP_SOURCE,
      }),
    ).toBeUndefined()
  })

  it('returns source for non-unknown statuses', () => {
    expect(
      getStepSourceForTxLink({
        status: TxStatus.Confirmed,
        swapperName: SwapperName.Thorchain,
        source: THORCHAIN_STREAM_SWAP_SOURCE,
      }),
    ).toBe(THORCHAIN_STREAM_SWAP_SOURCE)
  })

  it('returns source when status is undefined', () => {
    expect(
      getStepSourceForTxLink({
        status: undefined,
        swapperName: SwapperName.Thorchain,
        source: THORCHAIN_STREAM_SWAP_SOURCE,
      }),
    ).toBe(THORCHAIN_STREAM_SWAP_SOURCE)
  })
})
