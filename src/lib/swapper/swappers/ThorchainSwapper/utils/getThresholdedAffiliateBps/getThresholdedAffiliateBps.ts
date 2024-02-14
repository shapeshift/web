import type { Asset, MidgardPoolResponse } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { bn, convertPrecision } from 'lib/bignumber/bignumber'
import { convertBasisPointsToDecimalPercentage } from 'state/slices/tradeQuoteSlice/utils'

import { THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT } from '../../constants'
import { THORCHAIN_FIXED_PRECISION } from '../constants'
import { isRune } from '../isRune/isRune'
import { assetIdToPoolAssetId } from '../poolAssetHelpers/poolAssetHelpers'
import { thorService } from '../thorService'

export const getOutboundFeeInSellAssetThorBaseUnit = (runePerAsset: string) => {
  return bn(THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT).dividedBy(runePerAsset)
}

export const getExpectedAffiliateFeeSellAssetThorUnit = (
  sellAmountCryptoBaseUnit: string,
  sellAsset: Asset,
  affiliateBps: string,
) => {
  const sellAmountThorUnit = convertPrecision({
    value: sellAmountCryptoBaseUnit,
    inputExponent: sellAsset.precision,
    outputExponent: THORCHAIN_FIXED_PRECISION,
  })

  const affiliatePercent = convertBasisPointsToDecimalPercentage(affiliateBps)

  return sellAmountThorUnit.times(affiliatePercent)
}

// don't apply an affiliate fee if it's below the outbound fee for the inbound pool
export const getThresholdedAffiliateBps = async ({
  sellAsset,
  affiliateBps,
  sellAmountCryptoBaseUnit,
}: {
  sellAsset: Asset
  affiliateBps: string
  sellAmountCryptoBaseUnit: string
}) => {
  const outboundFeeSellAssetThorUnit = await (async () => {
    if (isRune(sellAsset.assetId)) return THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT

    const midgardUrl = getConfig().REACT_APP_MIDGARD_URL
    const sellPoolId = assetIdToPoolAssetId({ assetId: sellAsset.assetId })

    // get pool data for the sell asset
    const poolResult = await thorService.get<MidgardPoolResponse>(
      `${midgardUrl}/pool/${sellPoolId}`,
    )
    if (poolResult.isErr()) throw poolResult.unwrapErr()
    const pool = poolResult.unwrap().data

    // calculate the rune outbound fee denominated in the sell asset, in thor units
    return getOutboundFeeInSellAssetThorBaseUnit(pool.assetPrice)
  })()

  // calculate the expected affiliate fee, in thor units
  const expectedAffiliateFeeSellAssetThorUnit = getExpectedAffiliateFeeSellAssetThorUnit(
    sellAmountCryptoBaseUnit,
    sellAsset,
    affiliateBps,
  )

  const isAffiliateFeeBelowOutboundFee = expectedAffiliateFeeSellAssetThorUnit.lte(
    outboundFeeSellAssetThorUnit,
  )

  return isAffiliateFeeBelowOutboundFee ? '0' : affiliateBps
}
