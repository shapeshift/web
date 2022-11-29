import { adapters, AssetId } from '@shapeshiftoss/caip'

import { assertIsDefined } from '../../../utils'
import { BN } from '../../utils/bignumber'
import { ThornodePoolResponse } from '../types'
import { getSwapOutput } from '../utils/getTradeRate/getTradeRate'
import { isRune } from '../utils/isRune/isRune'
import { thorService } from '../utils/thorService'

type GetSingleSwapSlippageArgs = {
  inputAmountThorPrecision: BN
  pool: ThornodePoolResponse
  toRune: boolean
}

export const getSingleSwapSlippage = ({
  inputAmountThorPrecision,
  pool,
  toRune,
}: GetSingleSwapSlippageArgs): BN => {
  // formula: (inputAmount) / (inputAmount + inputBalance)
  const inputBalance = toRune ? pool.balance_asset : pool.balance_rune // input is asset if toRune
  const denominator = inputAmountThorPrecision.plus(inputBalance)
  return inputAmountThorPrecision.div(denominator)
}

type GetDoubleSwapSlippageArgs = {
  inputAmountThorPrecision: BN
  sellPool: ThornodePoolResponse
  buyPool: ThornodePoolResponse
}

export const getDoubleSwapSlippage = ({
  inputAmountThorPrecision,
  sellPool,
  buyPool,
}: GetDoubleSwapSlippageArgs): BN => {
  // formula: getSwapOutput(input1) + getSingleSwapSlippage(getSwapOutput(input1) => input2)
  const firstSwapSlippage = getSingleSwapSlippage({
    inputAmountThorPrecision,
    pool: sellPool,
    toRune: true,
  })
  const firstSwapOutput = getSwapOutput(inputAmountThorPrecision, sellPool, true)
  const secondSwapSlippage = getSingleSwapSlippage({
    inputAmountThorPrecision: firstSwapOutput,
    pool: buyPool,
    toRune: false,
  })
  return firstSwapSlippage.plus(secondSwapSlippage)
}

type GetSlippageArgs = {
  inputAmountThorPrecision: BN
  daemonUrl: string
  buyAssetId: AssetId
  sellAssetId: AssetId
}

export const getSlippage = async ({
  inputAmountThorPrecision,
  daemonUrl,
  buyAssetId,
  sellAssetId,
}: GetSlippageArgs): Promise<BN> => {
  try {
    const { data: poolData } = await thorService.get<ThornodePoolResponse[]>(
      `${daemonUrl}/lcd/thorchain/pools`,
    )

    const buyPoolId = adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
    const sellPoolId = adapters.assetIdToPoolAssetId({ assetId: sellAssetId })
    const buyPool = buyPoolId ? poolData.find((response) => response.asset === buyPoolId) : null
    const sellPool = sellPoolId ? poolData.find((response) => response.asset === sellPoolId) : null
    const toRune = isRune(buyAssetId)
    const fromRune = isRune(sellAssetId)

    switch (true) {
      case toRune: {
        assertIsDefined(sellPool)
        return getSingleSwapSlippage({
          inputAmountThorPrecision,
          pool: sellPool,
          toRune,
        })
      }
      case fromRune: {
        assertIsDefined(buyPool)
        return getSingleSwapSlippage({
          inputAmountThorPrecision,
          pool: buyPool,
          toRune,
        })
      }
      default: {
        assertIsDefined(sellPool)
        assertIsDefined(buyPool)
        return getDoubleSwapSlippage({ inputAmountThorPrecision, sellPool, buyPool })
      }
    }
  } catch (e) {
    throw new Error(`Failed to get pool data: ${e}`)
  }
}
