import { Asset } from '@shapeshiftoss/asset-service'
import { adapters, AssetId, thorchainAssetId } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { BN, bn, bnOrZero, fromBaseUnit, toBaseUnit } from '../../../utils/bignumber'
import { PoolResponse, ThorchainSwapperDeps } from '../../types'
import { getPriceRatio } from '../getPriceRatio/getPriceRatio'
import { isRune } from '../isRune/isRune'
import { thorService } from '../thorService'

const THOR_PRECISION = 8

type PoolData = {
  assetBalance: BN
  runeBalance: BN
}

const getSwapOutput = (inputAmount: BN, poolData: PoolData, toRune: boolean): BN => {
  const x = inputAmount
  const X = toRune ? poolData.assetBalance : poolData.runeBalance
  const Y = toRune ? poolData.runeBalance : poolData.assetBalance
  const numerator = x.times(X).times(Y)
  const denominator = x.plus(X).pow(2)
  return numerator.div(denominator)
}

const getDoubleSwapOutput = (input: BN, inputPool: PoolData, outputPool: PoolData): BN => {
  const runeToOutput = getSwapOutput(input, inputPool, true)
  return getSwapOutput(runeToOutput, outputPool, false)
}

// https://docs.thorchain.org/how-it-works/prices
// TODO this does not support swaps between native "RUNE"
// Rune swaps use a different calculation because its 1 hop between pools instead of 2
export const getTradeRate = async (
  sellAsset: Asset,
  buyAssetId: AssetId,
  sellAmount: string,
  deps: ThorchainSwapperDeps,
): Promise<string> => {
  // we can't get a quote for a zero amount so use getPriceRatio between pools instead
  if (bnOrZero(sellAmount).eq(0)) {
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

  const { data: responseData } = await thorService.get<PoolResponse[]>(`${deps.midgardUrl}/pools`)

  const buyPool = buyPoolId && responseData.find((response) => response.asset === buyPoolId)
  const sellPool = sellPoolId && responseData.find((response) => response.asset === sellPoolId)

  if (buyPoolId && !buyPool) {
    throw new SwapError(`[getTradeRate]: No buyPool for poolId ${buyPoolId}`, {
      code: SwapErrorTypes.POOL_NOT_FOUND,
      fn: 'getTradeRate',
      details: { buyPoolId },
    })
  }

  if (sellPoolId && !sellPool) {
    throw new SwapError(`[getTradeRate]: No sellPool for poolId ${sellPoolId}`, {
      code: SwapErrorTypes.POOL_NOT_FOUND,
      fn: 'getTradeRate',
      details: { sellPoolId },
    })
  }

  // All thorchain pool amounts are base 8 regardless of token precision
  const sellBaseAmount = bn(
    toBaseUnit(fromBaseUnit(sellAmount, sellAsset.precision), THOR_PRECISION),
  )

  const doubleSwap = buyPool != undefined && sellPool != undefined
  const toRune = buyAssetId === thorchainAssetId
  const outputAmountBase8: BN = (() => {
    if (doubleSwap && sellPool && buyPool) {
      const sellAssetPoolData = {
        assetBalance: bn(sellPool.assetDepth),
        runeBalance: bn(sellPool.runeDepth),
      }
      const buyAssetPoolData = {
        assetBalance: bn(buyPool.assetDepth),
        runeBalance: bn(buyPool.runeDepth),
      }
      return getDoubleSwapOutput(sellBaseAmount, sellAssetPoolData, buyAssetPoolData)
    } else {
      const poolData = sellPool
        ? {
            assetBalance: bn(sellPool.assetDepth),
            runeBalance: bn(sellPool.runeDepth),
          }
        : buyPool && {
            assetBalance: bn(buyPool.assetDepth),
            runeBalance: bn(buyPool.runeDepth),
          }
      if (!poolData) {
        throw new SwapError(`[getPriceRatio]: No pool data for rune swap`, {
          code: SwapErrorTypes.POOL_NOT_FOUND,
          fn: 'getPriceRatio',
          details: { buyAssetId, sellAsset, buyPool, sellPool },
        })
      }
      return getSwapOutput(sellBaseAmount, poolData, toRune)
    }
  })()

  const outputAmount = fromBaseUnit(outputAmountBase8, THOR_PRECISION)

  return bn(outputAmount).div(fromBaseUnit(sellAmount, sellAsset.precision)).toString()
}
