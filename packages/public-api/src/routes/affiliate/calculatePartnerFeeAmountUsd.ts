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
  // Fee-exempt swap (e.g. same-asset bridge) — no on-chain fee was charged, so
  // no partner share to compute regardless of the configured partnerBps.
  if (affiliateBps === 0) return null

  // 1. Actual amount captured on-chain, scaled to the partner's share of the affiliate split
  if (
    feeAsset &&
    swap.affiliateAssetUsd &&
    swap.actualAffiliateFeeAmountCryptoBaseUnit &&
    affiliateBps != null &&
    partnerBps != null
  ) {
    return BigAmount.fromBaseUnit({
      value: swap.actualAffiliateFeeAmountCryptoBaseUnit,
      precision: feeAsset.precision,
    })
      .times(swap.affiliateAssetUsd)
      .times(partnerBps)
      .div(affiliateBps)
      .toFixed()
  }

  // 2. Inferred from volume × partnerBps / 10000
  if (partnerBps == null) return null

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
