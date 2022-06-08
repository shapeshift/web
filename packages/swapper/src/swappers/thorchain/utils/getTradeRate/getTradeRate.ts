import { adapters, AssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { BN, bn } from '../../../utils/bignumber'
import { PoolResponse, ThorchainSwapperDeps } from '../../types'
import { fromBaseUnit, toBaseUnit } from '../ethereum/makeTradeTx'
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
  deps: ThorchainSwapperDeps
): Promise<string> => {
  const buyPoolId = adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
  const sellPoolId = adapters.assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  if (!buyPoolId || !sellPoolId)
    throw new SwapError(`[getPriceRatio]: No thorchain pool found`, {
      code: SwapErrorTypes.POOL_NOT_FOUND,
      fn: 'getPriceRatio',
      details: { buyPoolId, sellPoolId }
    })

  const { data: responseData } = await thorService.get<PoolResponse[]>(`${deps.midgardUrl}/pools`)

  const buyPool = responseData.find((response) => response.asset === buyPoolId)
  const sellPool = responseData.find((response) => response.asset === sellPoolId)

  if (!buyPool || !sellPool)
    throw new SwapError(`[getPriceRatio]: no pools found for`, {
      code: SwapErrorTypes.POOL_NOT_FOUND,
      fn: 'getPriceRatio',
      details: { buyPoolId, sellPoolId }
    })

  // All thorchain pool amounts are base 8 regardless of token precision
  const sellBaseAmount = bn(
    toBaseUnit(fromBaseUnit(sellAmount, sellAsset.precision), THOR_PRECISION)
  )

  const sellAssetPoolData = {
    assetBalance: bn(sellPool.assetDepth),
    runeBalance: bn(sellPool.runeDepth)
  }
  const buyAssetPoolData = {
    assetBalance: bn(buyPool.assetDepth),
    runeBalance: bn(buyPool.runeDepth)
  }
  const outputAmountBase8 = getDoubleSwapOutput(sellBaseAmount, sellAssetPoolData, buyAssetPoolData)

  const outputAmount = fromBaseUnit(outputAmountBase8, THOR_PRECISION)

  return bn(outputAmount).div(fromBaseUnit(sellAmount, sellAsset.precision)).toString()
}
