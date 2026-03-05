import { SwapperName } from '@shapeshiftoss/swapper'
import { describe, expect, it } from 'vitest'

import { getTxLink } from './getTxLink'

describe('getTxLink - chainflip swap id handling', () => {
  const txId = '0x123'
  const defaultExplorerBaseUrl = 'https://explorer.default/tx/'

  const buildParams = (maybeChainflipSwapId?: string) => ({
    address: undefined,
    chainId: undefined,
    defaultExplorerBaseUrl,
    maybeSafeTx: undefined,
    stepSource: SwapperName.Chainflip,
    txId,
    maybeChainflipSwapId,
  })

  it('falls back to tx hash explorer when chainflip swap id is undefined', () => {
    expect(getTxLink(buildParams())).toBe(`${defaultExplorerBaseUrl}${txId}`)
  })

  it('falls back to tx hash explorer when chainflip swap id is empty or blank', () => {
    expect(getTxLink(buildParams(''))).toBe(`${defaultExplorerBaseUrl}${txId}`)
    expect(getTxLink(buildParams('   '))).toBe(`${defaultExplorerBaseUrl}${txId}`)
  })

  it('falls back to tx hash explorer when chainflip swap id is undefined/null sentinel text', () => {
    expect(getTxLink(buildParams('undefined'))).toBe(`${defaultExplorerBaseUrl}${txId}`)
    expect(getTxLink(buildParams(' null '))).toBe(`${defaultExplorerBaseUrl}${txId}`)
    expect(getTxLink(buildParams(' UNDEFINED '))).toBe(`${defaultExplorerBaseUrl}${txId}`)
  })

  it('uses chainflip explorer when chainflip swap id is valid', () => {
    expect(getTxLink(buildParams(' swap-123 '))).toBe('https://scan.chainflip.io/swaps/swap-123')
  })
})
