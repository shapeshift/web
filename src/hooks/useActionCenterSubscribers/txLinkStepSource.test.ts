import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import { getTxLinkStepSource } from './txLinkStepSource'

describe('getTxLinkStepSource', () => {
  it('returns chainflip swapper name when status is unknown and source is unavailable', () => {
    expect(
      getTxLinkStepSource({
        status: TxStatus.Unknown,
        source: undefined,
        swapperName: SwapperName.Chainflip,
      }),
    ).toBe(SwapperName.Chainflip)
  })

  it('returns source when status is unknown and source is available', () => {
    expect(
      getTxLinkStepSource({
        status: TxStatus.Unknown,
        source: SwapperName.Chainflip,
        swapperName: SwapperName.Chainflip,
      }),
    ).toBe(SwapperName.Chainflip)
  })

  it('returns undefined for non-chainflip unknown status', () => {
    expect(
      getTxLinkStepSource({
        status: TxStatus.Unknown,
        source: SwapperName.CowSwap,
        swapperName: SwapperName.CowSwap,
      }),
    ).toBeUndefined()
  })

  it('returns source when status is not unknown', () => {
    expect(
      getTxLinkStepSource({
        status: TxStatus.Pending,
        source: SwapperName.CowSwap,
        swapperName: SwapperName.CowSwap,
      }),
    ).toBe(SwapperName.CowSwap)
  })
})
