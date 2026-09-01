import { describe, expect, it } from 'vitest'

import { isBlacklistedAssetId, isSpammyTokenText } from './blacklist'

describe('isBlacklistedAssetId', () => {
  it('returns true for known scam tokens', () => {
    expect(isBlacklistedAssetId('eip155:1/erc20:0x66a3c2fa3e467aa586e90912f977e648589cabaf')).toBe(
      true,
    )
    expect(isBlacklistedAssetId('eip155:1/erc20:0x514b9e5467b9eb811519e316263c9099eae546ca')).toBe(
      true,
    )
  })

  it('returns false for legitimate tokens', () => {
    expect(isBlacklistedAssetId('eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')).toBe(
      false,
    )
    expect(isBlacklistedAssetId('eip155:1/slip44:60')).toBe(false)
  })

  it('catches tokens whose names look legitimate to the text heuristics', () => {
    // These are the reason the id blacklist exists - clean-looking names that pass regex checks
    expect(isSpammyTokenText('AI Chain Coin')).toBe(false)
    expect(isSpammyTokenText('Privacy Coin')).toBe(false)
  })
})
