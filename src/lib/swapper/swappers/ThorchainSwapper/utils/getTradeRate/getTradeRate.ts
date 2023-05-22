import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, bchAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import qs from 'qs'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import type {
  ThorchainSwapperDeps,
  ThornodeQuoteResponse,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import {
  THORCHAIN_AFFILIATE_NAME,
  THORCHAIN_FIXED_PRECISION,
} from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'

import { getPriceRatio } from '../getPriceRatio/getPriceRatio'
import { isRune } from '../isRune/isRune'
import { thorService } from '../thorService'

// https://docs.thorchain.org/how-it-works/prices
// TODO this does not support swaps between native "RUNE"
// Rune swaps use a different calculation because its 1 hop between pools instead of 2
export const getTradeRate = async ({
  sellAsset,
  buyAssetId,
  sellAmountCryptoBaseUnit,
  receiveAddress,
  affiliateBps,
  deps,
}: {
  sellAsset: Asset
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  receiveAddress: string | undefined
  affiliateBps: string
  deps: ThorchainSwapperDeps
}): Promise<Result<string, SwapErrorRight>> => {
  // we can't get a quote for a zero amount so use getPriceRatio between pools instead
  if (bnOrZero(sellAmountCryptoBaseUnit).eq(0)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate]: Sell amount is zero, cannot get a trade rate from Thorchain.`,
        code: SwapErrorType.TRADE_BELOW_MINIMUM,
        details: { sellAssetId: sellAsset.assetId, buyAssetId },
      }),
    )
  }

  const buyPoolId = adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
  const sellPoolId = adapters.assetIdToPoolAssetId({ assetId: sellAsset.assetId })

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

  // The THORChain swap endpoint expects BCH receiveAddress's to be stripped of the "bitcoincash:" prefix
  const parsedReceiveAddress =
    receiveAddress && buyAssetId === bchAssetId
      ? receiveAddress.replace('bitcoincash:', '')
      : receiveAddress

  const queryString = qs.stringify({
    amount: sellAmountCryptoThorBaseUnit.toString(),
    from_asset: sellPoolId,
    to_asset: buyPoolId,
    destination: parsedReceiveAddress,
    affiliate_bps: affiliateBps,
    affiliate: THORCHAIN_AFFILIATE_NAME,
  })
  return (
    await thorService.get<ThornodeQuoteResponse>(
      `${deps.daemonUrl}/lcd/thorchain/quote/swap?${queryString}`,
    )
  ).andThen<string>(({ data }) => {
    // Massages the error so we know whether it is a below minimum error, or a more generic THOR quote response error
    if ('error' in data) {
      if (/not enough fee/.test(data.error)) {
        // TODO(gomes): How much do we want to bubble the error property up?
        // In other words, is the consumer calling getTradeRateBelowMinimum() in case of a sell amount below minimum enough,
        // or do we need to bubble the error up all the way so "web" is aware that the rate that was gotten was a below minimum one?
        return Err(
          makeSwapErrorRight({
            message: `[getTradeRate]: Sell amount is below the THOR minimum, cannot get a trade rate from Thorchain.`,
            code: SwapErrorType.TRADE_BELOW_MINIMUM,
            details: { sellAssetId: sellAsset.assetId, buyAssetId },
          }),
        )
      }

      return Err(
        makeSwapErrorRight({
          message: `[getTradeRate]: THORChain quote returned an error: ${data.error}`,
          code: SwapErrorType.TRADE_QUOTE_FAILED,
          details: { sellAssetId: sellAsset.assetId, buyAssetId },
        }),
      )
    }

    // No error in response, meaning we have a valid quote

    const { slippage_bps, fees, expected_amount_out: expectedAmountOutThorBaseUnit } = data
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
      expectedAmountPlusFeesAndSlippageCryptoThorBaseUnit
        .div(sellAmountCryptoThorBaseUnit)
        .toFixed(),
    )
  })
}

// getTradeRate gets an *actual* trade rate from quote
// In case it fails, we handle the error on the consumer and call this guy instead, which returns a price ratio from THOR pools instead
// TODO(gomes): should this return a Result also?
export const getTradeRateBelowMinimum = ({
  sellAssetId,
  buyAssetId,
  deps,
}: {
  sellAssetId: AssetId
  buyAssetId: AssetId
  deps: ThorchainSwapperDeps
}) =>
  getPriceRatio(deps, {
    sellAssetId,
    buyAssetId,
  })
