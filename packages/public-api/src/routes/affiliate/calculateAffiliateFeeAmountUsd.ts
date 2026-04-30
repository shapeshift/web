import type { Asset } from '@shapeshiftoss/types'
import { BigAmount, bnOrZero } from '@shapeshiftoss/utils'

import type { SwapServiceAffiliateSwap } from './types'

const BPS_DENOMINATOR = 10000

export const calculateAffiliateFeeAmountUsd = (
  affiliateBps: number | null,
  swap: SwapServiceAffiliateSwap,
  feeAsset: Asset | undefined,
): string | null => {
  // 1. Actual amount paid in the affiliate fee asset
  if (feeAsset && swap.affiliateAssetUsd && swap.actualAffiliateFeeAmountCryptoBaseUnit) {
    return BigAmount.fromBaseUnit({
      value: swap.actualAffiliateFeeAmountCryptoBaseUnit,
      precision: feeAsset.precision,
    })
      .times(swap.affiliateAssetUsd)
      .toFixed()
  }

  // 2. Inferred from volume × bps / 10000
  if (affiliateBps == null) return null

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

  const value = bnOrZero(volumeBaseUnit).times(affiliateBps).div(BPS_DENOMINATOR).toFixed(0)

  return BigAmount.fromBaseUnit({
    value,
    precision: volumeAsset.precision,
  })
    .times(volumePriceUsd)
    .toFixed()
}
