import { SwapperName } from '@shapeshiftoss/swapper'
import { describe, expect, it } from 'vitest'

import { getTxLink } from './getTxLink'

describe('getTxLink', () => {
  it('uses chainflip explorer link when chainflip swap id is present', () => {
    const txLink = getTxLink({
      stepSource: SwapperName.Chainflip,
      defaultExplorerBaseUrl: 'https://etherscan.io/tx/',
      txId: '0xabc123',
      maybeSafeTx: undefined,
      address: undefined,
      chainId: undefined,
      maybeChainflipSwapId: 'cf_swap_1',
      maybeNearIntentsDepositAddress: undefined,
    })

    expect(txLink).toBe('https://scan.chainflip.io/swaps/cf_swap_1')
  })

  it.each([undefined, '', '   ', 'undefined', 'null', 'UNDEFINED', 'NULL'])(
    'falls back to default tx link when chainflip swap id is invalid (%s)',
    maybeChainflipSwapId => {
      const txLink = getTxLink({
        stepSource: SwapperName.Chainflip,
        defaultExplorerBaseUrl: 'https://etherscan.io/tx/',
        txId: '0xabc123',
        maybeSafeTx: undefined,
        address: undefined,
        chainId: undefined,
        maybeChainflipSwapId,
        maybeNearIntentsDepositAddress: undefined,
      })

      expect(txLink).toBe('https://etherscan.io/tx/0xabc123')
    },
  )
})
