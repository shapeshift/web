import { BigAmount, bnOrZero } from '@shapeshiftoss/utils'

import type { SwapServiceAffiliateSwap } from './types'

const BPS_DENOMINATOR = 10000

// Estimate for a swap whose on-chain fee isn't confirmed yet: volume × partnerBps on the fee's side
export const estimatePartnerFeeAmountUsd = (
  partnerBps: number | null,
  affiliateBps: number | null,
  swap: SwapServiceAffiliateSwap,
): string | null => {
  if (!partnerBps || !affiliateBps) return null

  const { volumeAsset, volumeBaseUnit, volumePriceUsd } = (() => {
    if (swap.affiliateFeeAssetId === swap.buyAsset.assetId) {
      return {
        volumeAsset: swap.buyAsset,
        volumePriceUsd: swap.buyAssetUsd,
        volumeBaseUnit: swap.actualBuyAmountCryptoBaseUnit ?? swap.expectedBuyAmountCryptoBaseUnit,
      }
    }
    return {
      volumeAsset: swap.sellAsset,
      volumePriceUsd: swap.sellAssetUsd,
      volumeBaseUnit:
        swap.affiliateVerificationDetails?.verifiedSellAmountCryptoBaseUnit ??
        swap.sellAmountCryptoBaseUnit,
    }
  })()

  if (!volumePriceUsd) return null

  const value = bnOrZero(volumeBaseUnit).times(partnerBps).div(BPS_DENOMINATOR).toFixed(0)

  return BigAmount.fromBaseUnit({
    value,
    precision: volumeAsset.precision,
  })
    .times(volumePriceUsd)
    .toFixed()
}
