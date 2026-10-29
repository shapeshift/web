import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { estimatePartnerFeeAmountUsd } from './estimatePartnerFeeAmountUsd'
import type { SwapServiceAffiliateSwap } from './types'

const ETH = {
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  precision: 18,
} as Asset

const USDC = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  precision: 6,
} as Asset

const FOX = {
  assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
  symbol: 'FOX',
  precision: 18,
} as Asset

// 1 ETH @ $2000 → 2000 USDC @ $1 (matched volumes for easy math)
const makeSwap = (overrides: Partial<SwapServiceAffiliateSwap> = {}): SwapServiceAffiliateSwap => ({
  swapId: 'swap-1',
  status: 'completed',
  sellAsset: ETH,
  buyAsset: USDC,
  sellAmountCryptoBaseUnit: '1000000000000000000',
  sellAssetUsd: '2000',
  expectedBuyAmountCryptoBaseUnit: '2000000000',
  actualBuyAmountCryptoBaseUnit: null,
  buyAssetUsd: '1',
  actualAffiliateFeeAmountCryptoBaseUnit: null,
  affiliateAssetUsd: null,
  affiliateFeeAssetId: null,
  partnerFeeUsd: null,
  attributionStatus: 'PENDING',
  verificationStatus: 'PENDING',
  affiliateBps: 0,
  partnerBps: 0,
  shapeshiftBps: 10,
  affiliateVerificationDetails: null,
  swapperName: '0x',
  sellTxHash: null,
  buyTxHash: null,
  isAffiliateVerified: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

describe('estimatePartnerFeeAmountUsd', () => {
  describe('volume × partnerBps', () => {
    it('uses buy side when feeAssetId matches buyAsset', () => {
      // 2000 USDC × 30bps = 6 USDC × $1 = $6
      const swap = makeSwap({ affiliateFeeAssetId: USDC.assetId })
      expect(estimatePartnerFeeAmountUsd(30, 30, swap)).toBe('6')
    })

    it('uses sell side when feeAssetId matches sellAsset', () => {
      // 1 ETH × 30bps × $2000 = $6
      const swap = makeSwap({ affiliateFeeAssetId: ETH.assetId })
      expect(estimatePartnerFeeAmountUsd(30, 30, swap)).toBe('6')
    })

    it('prefers actualBuyAmount over expectedBuyAmount on the buy-side path', () => {
      // 2100 USDC × 30bps = 6.3
      const swap = makeSwap({
        affiliateFeeAssetId: USDC.assetId,
        actualBuyAmountCryptoBaseUnit: '2100000000',
      })
      expect(estimatePartnerFeeAmountUsd(30, 30, swap)).toBe('6.3')
    })

    it('falls back to expectedBuyAmount when actualBuyAmount is null on the buy-side path', () => {
      // actualBuyAmount: null → use expected (2000 USDC) × 30bps = 6
      const swap = makeSwap({ affiliateFeeAssetId: USDC.assetId })
      expect(estimatePartnerFeeAmountUsd(30, 30, swap)).toBe('6')
    })

    it('falls back to sell side when feeAssetId is a third asset', () => {
      // 1 ETH × 30bps × $2000 = $6
      const swap = makeSwap({ affiliateFeeAssetId: FOX.assetId })
      expect(estimatePartnerFeeAmountUsd(30, 30, swap)).toBe('6')
    })

    it('prefers verifiedSellAmount over sellAmount when present', () => {
      // 1.1 ETH × 30bps × $2000 = $6.6
      const swap = makeSwap({
        affiliateVerificationDetails: {
          hasAffiliate: true,
          verifiedSellAmountCryptoBaseUnit: '1100000000000000000',
        },
      })
      expect(estimatePartnerFeeAmountUsd(30, 30, swap)).toBe('6.6')
    })

    it('returns null when the inferred volume side has no priceUsd', () => {
      const swap = makeSwap({ sellAssetUsd: null })
      expect(estimatePartnerFeeAmountUsd(30, 30, swap)).toBeNull()
    })
  })

  describe('no fee data', () => {
    it('returns null when partnerBps is null', () => {
      expect(estimatePartnerFeeAmountUsd(null, null, makeSwap())).toBeNull()
    })
  })

  describe('fee-exempt swaps', () => {
    it('returns null when affiliateBps is 0, regardless of configured partnerBps', () => {
      // Same-asset bridge: on-chain fee was waived, so the partner earns nothing
      // even though their configured share is non-zero.
      const swap = makeSwap({ affiliateFeeAssetId: USDC.assetId })
      expect(estimatePartnerFeeAmountUsd(50, 0, swap)).toBeNull()
    })
  })
})
