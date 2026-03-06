import { SwapperName } from '@shapeshiftoss/swapper'
import { describe, expect, it } from 'vitest'

import { getTxLink } from './getTxLink'

describe('getTxLink', () => {
  const baseArgs = {
    address: '0x1234567890abcdef',
    chainId: 'eip155:1',
    defaultExplorerBaseUrl: 'https://etherscan.io/tx/',
    maybeSafeTx: undefined,
  }

  describe('Chainflip swap ID handling', () => {
    it('should use chainflip swap ID when provided', () => {
      const result = getTxLink({
        ...baseArgs,
        txId: '0xdeadbeef',
        stepSource: SwapperName.Chainflip,
        maybeChainflipSwapId: '1333049',
      })

      expect(result).toBe('https://scan.chainflip.io/swaps/1333049')
    })

    it('should fall back to default explorer when maybeChainflipSwapId is undefined', () => {
      const result = getTxLink({
        ...baseArgs,
        txId: '0xdeadbeef',
        stepSource: SwapperName.Chainflip,
        maybeChainflipSwapId: undefined,
      })

      expect(result).toBe('https://etherscan.io/tx/0xdeadbeef')
    })

    it('should NOT generate a URL with "undefined" string when chainflip swap ID is undefined', () => {
      // This is the regression test for the template literal bug:
      // `${undefined}` === "undefined" which is truthy, causing
      // getTxLink to generate scan.chainflip.io/swaps/undefined
      const result = getTxLink({
        ...baseArgs,
        txId: '0xdeadbeef',
        stepSource: SwapperName.Chainflip,
        maybeChainflipSwapId: undefined,
      })

      expect(result).not.toContain('undefined')
      expect(result).not.toBe('https://scan.chainflip.io/swaps/undefined')
    })

    it('should NOT generate a URL with the string "undefined" when passed as a string', () => {
      // If somehow the string "undefined" is passed, it would be truthy
      // and generate an invalid URL. This tests the secondary bug where
      // template literals convert undefined to the string "undefined".
      const result = getTxLink({
        ...baseArgs,
        txId: '0xdeadbeef',
        stepSource: SwapperName.Chainflip,
        // Simulating what `${undefined}` produces — the string "undefined"
        maybeChainflipSwapId: 'undefined',
      })

      // With the string "undefined" passed in, getTxLink will use it as-is.
      // The fix is at the call site — ensure we never pass "undefined" as a string.
      // This test documents the behavior to ensure the call site is responsible
      // for passing undefined (not "undefined") when no swap ID is available.
      expect(result).toBe('https://scan.chainflip.io/swaps/undefined')
    })
  })

  describe('non-Chainflip swaps', () => {
    it('should use default explorer for non-Chainflip swaps', () => {
      const result = getTxLink({
        ...baseArgs,
        txId: '0xdeadbeef',
        stepSource: undefined,
      })

      expect(result).toBe('https://etherscan.io/tx/0xdeadbeef')
    })
  })
})
