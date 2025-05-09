import { thorchain } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bn, convertBasisPointsToDecimalPercentage, convertPrecision } from '@shapeshiftoss/utils'

import type { MidgardPoolResponse } from '../../../../thorchain-utils'
import { service } from '../../../../thorchain-utils'
import type { SwapperConfig } from '../../../../types'
import { isRune } from '../../../ThorchainSwapper'
import { THOR_PRECISION } from '../../constants'
import { assetIdToPoolAssetId } from '../poolAssetHelpers/poolAssetHelpers'

export const getOutboundFeeInSellAssetThorBaseUnit = (runePerAsset: string) => {
  return bn(thorchain.NATIVE_FEE).dividedBy(runePerAsset)
}

export const getExpectedAffiliateFeeSellAssetThorUnit = (
  sellAmountCryptoBaseUnit: string,
  sellAsset: Asset,
  affiliateBps: string,
) => {
  const sellAmountThorUnit = convertPrecision({
    value: sellAmountCryptoBaseUnit,
    inputExponent: sellAsset.precision,
    outputExponent: THOR_PRECISION,
  })

  const affiliatePercent = convertBasisPointsToDecimalPercentage(affiliateBps)

  return sellAmountThorUnit.times(affiliatePercent)
}

// don't apply an affiliate fee if it's below the outbound fee for the inbound pool
export const getThresholdedAffiliateBps = async ({
  sellAsset,
  affiliateBps,
  sellAmountCryptoBaseUnit,
  config,
}: {
  sellAsset: Asset
  affiliateBps: string
  sellAmountCryptoBaseUnit: string
  config: SwapperConfig
}) => {
  const outboundFeeSellAssetThorUnit = await (async () => {
    if (isRune(sellAsset.assetId)) return thorchain.NATIVE_FEE

    const midgardUrl = config.VITE_THORCHAIN_MIDGARD_URL
    const sellPoolId = assetIdToPoolAssetId({ assetId: sellAsset.assetId })

    // get pool data for the sell asset
    const poolResult = await service.get<MidgardPoolResponse>(`${midgardUrl}/pool/${sellPoolId}`)
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
