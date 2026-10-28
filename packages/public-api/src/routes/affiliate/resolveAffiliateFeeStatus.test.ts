import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { resolveAffiliateFeeStatus } from './resolveAffiliateFeeStatus'
import type { SwapServiceAffiliateSwap } from './types'

const ETH = { assetId: 'eip155:1/slip44:60', symbol: 'ETH', precision: 18 } as Asset

// a settled, verified, attributed swap with no payable fee yet
const makeSwap = (overrides: Partial<SwapServiceAffiliateSwap> = {}): SwapServiceAffiliateSwap => ({
  swapId: 'swap-1',
  status: 'SUCCESS',
  sellAsset: ETH,
  buyAsset: ETH,
  sellAmountCryptoBaseUnit: '1000000000000000000',
  sellAssetUsd: '2000',
  expectedBuyAmountCryptoBaseUnit: '1000000000000000000',
  actualBuyAmountCryptoBaseUnit: null,
  buyAssetUsd: '2000',
  actualAffiliateFeeAmountCryptoBaseUnit: null,
  affiliateAssetUsd: null,
  affiliateFeeAssetId: null,
  partnerFeeUsd: null,
  attributionStatus: 'ACCEPTED',
  verificationStatus: 'SUCCESS',
  affiliateBps: 30,
  partnerBps: 20,
  shapeshiftBps: 10,
  affiliateVerificationDetails: { hasAffiliate: true, affiliateBps: 30 },
  swapperName: 'Relay',
  sellTxHash: '0xabc',
  buyTxHash: null,
  isAffiliateVerified: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

describe('resolveAffiliateFeeStatus', () => {
  it('is earned once swap-service reports the fee it will pay', () => {
    expect(resolveAffiliateFeeStatus(makeSwap({ partnerFeeUsd: '1.5' }))).toEqual({
      status: 'earned',
      reason: null,
    })
  })

  it('is pending, with what it is waiting on, while the swap, verification or attribution settles', () => {
    expect(resolveAffiliateFeeStatus(makeSwap({ status: 'PENDING' }))).toEqual({
      status: 'pending',
      reason: 'swap-pending',
    })
    expect(
      resolveAffiliateFeeStatus(
        makeSwap({ verificationStatus: 'PENDING', isAffiliateVerified: null }),
      ),
    ).toEqual({ status: 'pending', reason: 'verification-pending' })
    expect(resolveAffiliateFeeStatus(makeSwap({ attributionStatus: 'PENDING' }))).toEqual({
      status: 'pending',
      reason: 'attribution-pending',
    })
  })

  it('is failed, with why, for a swap that will not be paid', () => {
    expect(resolveAffiliateFeeStatus(makeSwap({ status: 'FAILED' }))).toEqual({
      status: 'failed',
      reason: 'swap-failed',
    })
    expect(resolveAffiliateFeeStatus(makeSwap({ attributionStatus: 'REJECTED' }))).toEqual({
      status: 'failed',
      reason: 'not-attributed',
    })
    expect(resolveAffiliateFeeStatus(makeSwap({ attributionStatus: 'DISPUTED' }))).toEqual({
      status: 'failed',
      reason: 'not-attributed',
    })
    expect(
      resolveAffiliateFeeStatus(
        makeSwap({ verificationStatus: 'FAILED', isAffiliateVerified: false }),
      ),
    ).toEqual({ status: 'failed', reason: 'fee-not-verified' })
    expect(resolveAffiliateFeeStatus(makeSwap({ isAffiliateVerified: false }))).toEqual({
      status: 'failed',
      reason: 'no-affiliate-fee',
    })
    expect(
      resolveAffiliateFeeStatus(
        makeSwap({ affiliateVerificationDetails: { hasAffiliate: true, affiliateBps: 0 } }),
      ),
    ).toEqual({ status: 'failed', reason: 'fee-waived' })
  })

  it('is held for review when verified and attributed but not payable', () => {
    expect(resolveAffiliateFeeStatus(makeSwap())).toEqual({
      status: 'review',
      reason: 'fee-under-review',
    })
    expect(resolveAffiliateFeeStatus(makeSwap({ partnerBps: 0 }))).toEqual({
      status: 'review',
      reason: 'no-partner-share',
    })
  })
})
