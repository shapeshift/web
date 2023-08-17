import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { THORCHAIN_FIXED_PRECISION } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { createTradeAmountTooSmallErr } from 'lib/swapper/utils'

import type { ThornodeQuoteResponseSuccess } from '../../types'
import { getPriceRatio } from '../getPriceRatio/getPriceRatio'
import { isRune } from '../isRune/isRune'

// https://docs.thorchain.org/how-it-works/prices
// TODO: this does not support swaps between native "RUNE"
// TODO: just use data in TradeQuote2 to compute the rate
// Rune swaps use a different calculation because its 1 hop between pools instead of 2
export const getTradeRate = ({
  sellAsset,
  buyAssetId,
  sellAmountCryptoBaseUnit,
  thornodeQuote,
}: {
  sellAsset: Asset
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  thornodeQuote: ThornodeQuoteResponseSuccess
}): Result<string, SwapErrorRight> => {
  // we can't get a quote for a zero amount so use getPriceRatio between pools instead
  if (bnOrZero(sellAmountCryptoBaseUnit).eq(0)) {
    return Err(createTradeAmountTooSmallErr())
  }

  const buyPoolId = assetIdToPoolAssetId({ assetId: buyAssetId })
  const sellPoolId = assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  if (!buyPoolId && !isRune(buyAssetId)) {
    throw new SwapError(`[getTradeRate]: No buyPoolId for asset ${buyAssetId}`, {
      code: SwapErrorType.POOL_NOT_FOUND,
      fn: 'getTradeRate',
      details: { buyAssetId },
    })
  }

  if (!sellPoolId && !isRune(sellAsset.assetId)) {
    throw new SwapError(`[getTradeRate]: No sellPoolId for asset ${sellAsset.assetId}`, {
      code: SwapErrorType.POOL_NOT_FOUND,
      fn: 'getTradeRate',
      details: { sellAsset: sellAsset.assetId },
    })
  }

  const sellAmountCryptoPrecision = bn(sellAmountCryptoBaseUnit).div(
    bn(10).pow(sellAsset.precision),
  )
  // All thorchain pool amounts are base 8 regardless of token precision
  const sellAmountCryptoThorBaseUnit = bn(
    toBaseUnit(sellAmountCryptoPrecision, THORCHAIN_FIXED_PRECISION),
  )

  const { slippage_bps, fees, expected_amount_out: expectedAmountOutThorBaseUnit } = thornodeQuote
  // Add back the outbound fees
  const expectedAmountPlusFeesCryptoThorBaseUnit = bn(expectedAmountOutThorBaseUnit).plus(
    fees.outbound,
  )
  // Calculate the slippage percentage
  const slippagePercentage = bn(slippage_bps).div(10000)
  // Find the original amount before fees and slippage
  const expectedAmountPlusFeesAndSlippageCryptoThorBaseUnit =
    expectedAmountPlusFeesCryptoThorBaseUnit.div(bn(1).minus(slippagePercentage))

  return Ok(
    expectedAmountPlusFeesAndSlippageCryptoThorBaseUnit.div(sellAmountCryptoThorBaseUnit).toFixed(),
  )
}

// getTradeRate gets an *actual* trade rate from quote
// In case it fails, we handle the error on the consumer and call this guy instead, which returns a price ratio from THOR pools instead
export const getTradeRateBelowMinimum = ({
  sellAssetId,
  buyAssetId,
}: {
  sellAssetId: AssetId
  buyAssetId: AssetId
}): Promise<Result<string, SwapErrorRight>> => {
  try {
    return getPriceRatio({
      sellAssetId,
      buyAssetId,
    })
  } catch {
    return Promise.resolve(
      Err(
        makeSwapErrorRight({
          message: `[getTradeRateBelowMinimum]: Could not get a trade rate from Thorchain.`,
          code: SwapErrorType.TRADE_QUOTE_FAILED,
          details: { sellAssetId, buyAssetId },
        }),
      ),
    )
  }
}
