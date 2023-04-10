import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorType } from '../../../../api'
import type { BN } from '../../../utils/bignumber'
import { bn, bnOrZero, toBaseUnit } from '../../../utils/bignumber'
import type { ThorchainSwapperDeps, ThornodePoolResponse, ThornodeQuoteResponse } from '../../types'
import { getPriceRatio } from '../getPriceRatio/getPriceRatio'
import { isRune } from '../isRune/isRune'
import { thorService } from '../thorService'

const THOR_PRECISION = 8

export const getSwapOutput = (inputAmount: BN, pool: ThornodePoolResponse, toRune: boolean): BN => {
  const inputBalance = toRune ? pool.balance_asset : pool.balance_rune
  const outputBalance = toRune ? pool.balance_rune : pool.balance_asset
  const numerator = inputAmount.times(inputBalance).times(outputBalance)
  const denominator = inputAmount.plus(inputBalance).pow(2)
  return numerator.div(denominator)
}

// https://docs.thorchain.org/how-it-works/prices
// TODO this does not support swaps between native "RUNE"
// Rune swaps use a different calculation because its 1 hop between pools instead of 2
export const getTradeRate = async ({
  sellAsset,
  buyAssetId,
  sellAmountCryptoBaseUnit,
  receiveAddress,
  deps,
}: {
  sellAsset: Asset
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  receiveAddress: string
  deps: ThorchainSwapperDeps
}): Promise<string> => {
  // TODO(gomes): is this still valid?
  // we can't get a quote for a zero amount so use getPriceRatio between pools instead
  if (bnOrZero(sellAmountCryptoBaseUnit).eq(0)) {
    return getPriceRatio(deps, {
      sellAssetId: sellAsset.assetId,
      buyAssetId,
    })
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
  const sellAmountCryptoThorBaseUnit = bn(toBaseUnit(sellAmountCryptoPrecision, THOR_PRECISION))

  const { data } = await thorService.get<ThornodeQuoteResponse>(
    `${deps.daemonUrl}/lcd/thorchain/quote/swap?amount=${sellAmountCryptoThorBaseUnit}&from_asset=${sellPoolId}&to_asset=${buyPoolId}&destination=${receiveAddress}`,
  )

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

  return expectedAmountPlusFeesAndSlippageCryptoThorBaseUnit
    .div(sellAmountCryptoThorBaseUnit)
    .toFixed()
}
