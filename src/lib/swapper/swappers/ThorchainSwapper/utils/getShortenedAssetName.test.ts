import { describe, expect, it, vi } from 'vitest'

import { getShortenedAssetName } from './getShortenedAssetName'

vi.mock('../generated/generatedTradableThorAssetMap.json', async importActual => {
  const actual: any = await importActual()

  return {
    ...actual,
    default: {
      ...actual.default,
      'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606FB48':
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606fb48',
    },
  }
})

describe('getShortenedAssetName', () => {
  it('should get shortened asset name for native asset', () => {
    const shortenedAssetName = getShortenedAssetName('ETH.ETH')
    expect(shortenedAssetName).toBe('e')
  })

  it('should get shortened asset name for token', () => {
    const shortenedAssetName = getShortenedAssetName(
      'ETH.FOX-0XC770EEFAD204B5180DF6A14EE197D99D808EE52D',
    )
    expect(shortenedAssetName).toBe('ETH.FOX')
  })

  it('should get shortened asset name for token with abbreviated address', () => {
    const shortenedAssetName = getShortenedAssetName(
      'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
    )
    expect(shortenedAssetName).toBe('ETH.USDC-EB48')
  })
})
