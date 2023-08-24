import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { getMinimumDonationUsdSellAmountByChainId } from 'lib/swapper/swappers/utils/getMinimumDonationUsdSellAmountByChainId'

export const getIsDonationAmountBelowMinimum = (
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string,
  sellAsset: Asset,
  sellAssetUsdRate: string,
) => {
  const sellAmountIncludingFeesCryptoPrecision = fromBaseUnit(
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sellAsset.precision,
  )
  const sellAmountBeforeFeesUsd = bnOrZero(sellAmountIncludingFeesCryptoPrecision).times(
    sellAssetUsdRate,
  )
  // We use the sell amount so we don't have to make 2 network requests, as the receive amount requires a quote
  return sellAmountBeforeFeesUsd.lt(getMinimumDonationUsdSellAmountByChainId(sellAsset.chainId))
}
