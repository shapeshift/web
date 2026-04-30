import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { calculateAffiliateFeeAmountUsd } from './calculateAffiliateFeeAmountUsd'
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
  affiliateBps: null,
  shapeshiftBps: 10,
  affiliateVerificationDetails: null,
  swapperName: '0x',
  sellTxHash: null,
  buyTxHash: null,
  isAffiliateVerified: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

describe('calculateAffiliateFeeAmountUsd', () => {
  describe('priority 1: actual amount paid', () => {
    it('uses actualAffiliateFeeAmount priced via affiliateAssetUsd', () => {
      // 5 USDC × $1 = $5
      const swap = makeSwap({
        actualAffiliateFeeAmountCryptoBaseUnit: '5000000',
        affiliateAssetUsd: '1',
      })
      expect(calculateAffiliateFeeAmountUsd(null, swap, USDC)).toBe('5')
    })

    it('falls through to inferred when affiliateAssetUsd is missing', () => {
      // No affiliateAssetUsd → skip path 1, infer from sell side: 1 ETH × 30bps × $2000 = $6
      const swap = makeSwap({ actualAffiliateFeeAmountCryptoBaseUnit: '5000000' })
      expect(calculateAffiliateFeeAmountUsd(30, swap, USDC)).toBe('6')
    })

    it('falls through to inferred when feeAsset is missing (registry miss)', () => {
      const swap = makeSwap({
        actualAffiliateFeeAmountCryptoBaseUnit: '5000000',
        affiliateAssetUsd: '1',
      })
      // No feeAsset → skip path 1; sell-side fallback: 1 ETH × 30bps × $2000 = $6
      expect(calculateAffiliateFeeAmountUsd(30, swap, undefined)).toBe('6')
    })
  })

  describe('priority 2: inferred from volume × bps', () => {
    it('uses buy side when feeAssetId matches buyAsset', () => {
      // 2000 USDC × 30bps = 6 USDC × $1 = $6
      const swap = makeSwap({ affiliateFeeAssetId: USDC.assetId })
      expect(calculateAffiliateFeeAmountUsd(30, swap, USDC)).toBe('6')
    })

    it('prefers actualBuyAmount over expectedBuyAmount', () => {
      // 2100 USDC × 30bps = 6.3
      const swap = makeSwap({
        affiliateFeeAssetId: USDC.assetId,
        actualBuyAmountCryptoBaseUnit: '2100000000',
      })
      expect(calculateAffiliateFeeAmountUsd(30, swap, USDC)).toBe('6.3')
    })

    it('falls back to sell side when feeAssetId is a third asset', () => {
      // 1 ETH × 30bps × $2000 = $6
      const swap = makeSwap({ affiliateFeeAssetId: FOX.assetId })
      expect(calculateAffiliateFeeAmountUsd(30, swap, FOX)).toBe('6')
    })

    it('prefers verifiedSellAmount over sellAmount when present', () => {
      // 1.1 ETH × 30bps × $2000 = $6.6
      const swap = makeSwap({
        affiliateVerificationDetails: {
          hasAffiliate: true,
          verifiedSellAmountCryptoBaseUnit: '1100000000000000000',
        },
      })
      expect(calculateAffiliateFeeAmountUsd(30, swap, undefined)).toBe('6.6')
    })

    it('returns null when the inferred volume side has no priceUsd', () => {
      const swap = makeSwap({ sellAssetUsd: null })
      expect(calculateAffiliateFeeAmountUsd(30, swap, undefined)).toBeNull()
    })
  })

  describe('priority 3: no fee data', () => {
    it('returns null when no actual amount and no bps', () => {
      expect(calculateAffiliateFeeAmountUsd(null, makeSwap(), undefined)).toBeNull()
    })
  })
})
