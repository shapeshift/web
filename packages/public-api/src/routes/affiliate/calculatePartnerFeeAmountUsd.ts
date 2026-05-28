import type { Asset } from '@shapeshiftoss/types'
import { BigAmount, bnOrZero } from '@shapeshiftoss/utils'

import type { SwapServiceAffiliateSwap } from './types'

const BPS_DENOMINATOR = 10000

export const calculatePartnerFeeAmountUsd = (
  partnerBps: number | null,
  affiliateBps: number | null,
  swap: SwapServiceAffiliateSwap,
  feeAsset: Asset | undefined,
): string | null => {
  if (!partnerBps || !affiliateBps) return null

  // 1. Actual amount captured on-chain, scaled to the partner's share.
  if (feeAsset && swap.affiliateAssetUsd && swap.actualAffiliateFeeAmountCryptoBaseUnit) {
    const capture = BigAmount.fromBaseUnit({
      value: swap.actualAffiliateFeeAmountCryptoBaseUnit,
      precision: feeAsset.precision,
    }).times(swap.affiliateAssetUsd)
    if (partnerBps >= affiliateBps) return capture.toFixed()
    return capture.times(partnerBps).div(affiliateBps).toFixed()
  }

  // 2. Inferred from volume × partnerBps / 10000.
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
