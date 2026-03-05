import { SwapperName } from '@shapeshiftoss/swapper'
import { describe, expect, it } from 'vitest'

import { getTxLink } from './getTxLink'

describe('getTxLink', () => {
  it('uses trimmed chainflip swap id when valid', () => {
    expect(
      getTxLink({
        stepSource: SwapperName.Chainflip,
        defaultExplorerBaseUrl: 'https://etherscan.io/tx/',
        txId: '0xabc',
        maybeSafeTx: undefined,
        address: undefined,
        chainId: undefined,
        maybeChainflipSwapId: '  cf_swap_id  ',
      }),
    ).toBe('https://scan.chainflip.io/swaps/cf_swap_id')
  })

  it.each([undefined, '', '   ', 'undefined', 'Undefined', 'null', 'Null'])(
    'falls back to default tx link when chainflip swap id is invalid (%s)',
    maybeChainflipSwapId => {
      expect(
        getTxLink({
          stepSource: SwapperName.Chainflip,
          defaultExplorerBaseUrl: 'https://etherscan.io/tx/',
          txId: '0xabc',
          maybeSafeTx: undefined,
          address: undefined,
          chainId: undefined,
          maybeChainflipSwapId,
        }),
      ).toBe('https://etherscan.io/tx/0xabc')
    },
  )
})
