import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import { getUniqueAddressSubstring } from './getUniqueAddressSubstring'

const destinationAssetId = toAssetId({
  chainId: ethChainId,
  assetReference: '0x8a65ac0E23F31979db06Ec62Af62b432a6dF4741',
  assetNamespace: 'erc20',
})

const lastSixMatchAssetId = toAssetId({
  chainId: ethChainId,
  assetReference: '0xa0b86991c6218b36c1d19d4a2e9eb0ce36dF4741',
  assetNamespace: 'erc20',
})

const lastTenMatchAssetId = toAssetId({
  chainId: ethChainId,
  assetReference: '0xa0b86991c6218b36c1d19d4a2e9eb032a6dF4741',
  assetNamespace: 'erc20',
})

describe('getUniqueAddressSubstring', () => {
  it('should get unique substring with one other matching asset substring', () => {
    const substring = getUniqueAddressSubstring(destinationAssetId, [
      destinationAssetId,
      lastSixMatchAssetId,
    ])

    expect(substring).toBe('a6df4741')
  })

  it('should get unique substring with multiple other matching asset substrings', () => {
    const substring = getUniqueAddressSubstring(destinationAssetId, [
      destinationAssetId,
      lastSixMatchAssetId,
      lastTenMatchAssetId,
    ])

    expect(substring).toBe('432a6df4741')
  })
})
