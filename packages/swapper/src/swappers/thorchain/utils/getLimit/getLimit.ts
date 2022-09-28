import { Asset } from '@shapeshiftoss/asset-service'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { bn, bnOrZero, fromBaseUnit, toBaseUnit } from '../../../utils/bignumber'
import { ThorchainSwapperDeps } from '../../types'
import { THORCHAIN_FIXED_PRECISION } from '../constants'
import { getTradeRate } from '../getTradeRate/getTradeRate'

export const getLimit = async ({
  sellAsset,
  buyAsset,
  sellAmount,
  deps,
  slippageTolerance,
  buyAssetTradeFeeUsd,
}: {
  buyAssetId: string
  destinationAddress: string
  sellAsset: Asset
  buyAsset: Asset
  sellAmount: string
  deps: ThorchainSwapperDeps
  slippageTolerance: string
  buyAssetTradeFeeUsd: string
}): Promise<string> => {
  const tradeRate = await getTradeRate(sellAsset, buyAsset.assetId, sellAmount, deps)
  const expectedBuyAmountPrecision8 = toBaseUnit(
    fromBaseUnit(bnOrZero(sellAmount).times(tradeRate), sellAsset.precision),
    THORCHAIN_FIXED_PRECISION,
  )

  const isValidSlippageRange =
    bnOrZero(slippageTolerance).gte(0) && bnOrZero(slippageTolerance).lte(1)
  if (bnOrZero(expectedBuyAmountPrecision8).lt(0) || !isValidSlippageRange)
    throw new SwapError('[getThorTxInfo]: bad expected buy amount or bad slippage tolerance', {
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
      details: { expectedBuyAmountPrecision8, slippageTolerance },
    })

  const tradeFeePrecision8 = toBaseUnit(bnOrZero(buyAssetTradeFeeUsd), THORCHAIN_FIXED_PRECISION)

  return bnOrZero(expectedBuyAmountPrecision8)
    .times(bn(1).minus(slippageTolerance))
    .minus(bnOrZero(tradeFeePrecision8))
    .decimalPlaces(0)
    .toString()
}
