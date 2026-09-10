import { describe, expect, it, vi } from 'vitest'

// Module load validates the process environment, which a schema test has no use for
vi.mock('../../env', () => ({ env: { DEFAULT_AFFILIATE_BPS: '60' } }))

import { SwapServiceStatusSchema } from './types'

const verifiedRow = {
  status: 'SUCCESS',
  sellTxHash: '0x695ae13af71e6a3f8035be566bbe088a1246156299a3f8dc784813715288c250',
  buyTxHash: '16d03fe5c712c82afe4f37be1e027af3e37f6db418f4c34a2e490c15e2610f3a',
  statusMessage: null,
  isAffiliateVerified: true,
  affiliateVerificationDetails: {
    hasAffiliate: true,
    affiliateBps: 30,
    affiliateAddress: 'shapeshifttokenomics.sputnik-dao.near',
    verifiedSellAmountCryptoBaseUnit: '4061655937125566',
  },
}

describe('SwapServiceStatusSchema', () => {
  it('accepts a verified swap whose affiliate address is not an evm address', () => {
    expect(SwapServiceStatusSchema.safeParse(verifiedRow).success).toBe(true)
  })

  it('accepts an unverified swap with null details', () => {
    const row = { ...verifiedRow, isAffiliateVerified: null, affiliateVerificationDetails: null }
    expect(SwapServiceStatusSchema.safeParse(row).success).toBe(true)
  })
})
