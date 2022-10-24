import { Asset } from '@shapeshiftoss/asset-service'
import { adapters, AssetId } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { BN, bn, bnOrZero, fromBaseUnit, toBaseUnit } from '../../../utils/bignumber'
import { ThorchainSwapperDeps, ThornodePoolResponse } from '../../types'
import { getPriceRatio } from '../getPriceRatio/getPriceRatio'
import { isRune } from '../isRune/isRune'
import { thorService } from '../thorService'

const THOR_PRECISION = 8

const getSwapOutput = (inputAmount: BN, pool: ThornodePoolResponse, toRune: boolean): BN => {
  const x = inputAmount
  const X = toRune ? pool.balance_asset : pool.balance_rune
  const Y = toRune ? pool.balance_rune : pool.balance_asset
  const numerator = bn(x).times(X).times(Y)
  const denominator = bn(x).plus(X).pow(2)
  return numerator.div(denominator)
}

const getDoubleSwapOutput = (
  input: BN,
  inputPool: ThornodePoolResponse | null | undefined,
  outputPool: ThornodePoolResponse | null | undefined,
): BN => {
  if (inputPool && outputPool) {
    const runeToOutput = getSwapOutput(input, inputPool, true)
    return getSwapOutput(runeToOutput, outputPool, false)
  }
  if (inputPool && !outputPool) {
    return getSwapOutput(input, inputPool, true)
  }

  if (!inputPool && outputPool) {
    return getSwapOutput(input, outputPool, false)
  }

  return bn(0) // We should never reach this, but this makes tsc happy
}

// https://docs.thorchain.org/how-it-works/prices
// TODO this does not support swaps between native "RUNE"
// Rune swaps use a different calculation because its 1 hop between pools instead of 2
export const getTradeRate = async (
  sellAsset: Asset,
  buyAssetId: AssetId,
  sellAmountCryptoPrecision: string,
  deps: ThorchainSwapperDeps,
): Promise<string> => {
  // we can't get a quote for a zero amount so use getPriceRatio between pools instead
  if (bnOrZero(sellAmountCryptoPrecision).eq(0)) {
    return getPriceRatio(deps, {
      sellAssetId: sellAsset.assetId,
      buyAssetId,
    })
  }

  const buyPoolId = adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
  const sellPoolId = adapters.assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  if (!buyPoolId && !isRune(buyAssetId)) {
    throw new SwapError(`[getTradeRate]: No buyPoolId for asset ${buyAssetId}`, {
      code: SwapErrorTypes.POOL_NOT_FOUND,
      fn: 'getTradeRate',
      details: { buyAssetId },
    })
  }

  if (!sellPoolId && !isRune(sellAsset.assetId)) {
    throw new SwapError(`[getTradeRate]: No sellPoolId for asset ${sellAsset.assetId}`, {
      code: SwapErrorTypes.POOL_NOT_FOUND,
      fn: 'getTradeRate',
      details: { sellAsset: sellAsset.assetId },
    })
  }

  const { data } = await thorService.get<ThornodePoolResponse[]>(
    `${deps.daemonUrl}/lcd/thorchain/pools`,
  )

  const buyPool = buyPoolId ? data.find((response) => response.asset === buyPoolId) : null
  const sellPool = sellPoolId ? data.find((response) => response.asset === sellPoolId) : null

  if (!buyPool && !isRune(buyAssetId)) {
    throw new SwapError(`[getTradeRate]: no pools found`, {
      code: SwapErrorTypes.POOL_NOT_FOUND,
      fn: 'getTradeRate',
      details: { buyPoolId, sellPoolId },
    })
  }

  if (!sellPool && !isRune(sellAsset.assetId)) {
    throw new SwapError(`[getTradeRate]: no pools found`, {
      code: SwapErrorTypes.POOL_NOT_FOUND,
      fn: 'getTradeRate',
      details: { buyPoolId, sellPoolId },
    })
  }

  // All thorchain pool amounts are base 8 regardless of token precision
  const sellBaseAmount = bn(
    toBaseUnit(fromBaseUnit(sellAmountCryptoPrecision, sellAsset.precision), THOR_PRECISION),
  )

  const outputAmountBase8 = getDoubleSwapOutput(sellBaseAmount, sellPool, buyPool)
  const outputAmount = fromBaseUnit(outputAmountBase8, THOR_PRECISION)

  return bn(outputAmount)
    .div(fromBaseUnit(sellAmountCryptoPrecision, sellAsset.precision))
    .toString()
}
