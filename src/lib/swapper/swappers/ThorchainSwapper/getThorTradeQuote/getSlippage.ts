import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import type { BigNumber } from 'lib/bignumber/bignumber'
import type { SwapErrorRight } from 'lib/swapper/api'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getSwapOutput } from 'lib/swapper/swappers/ThorchainSwapper/utils/getTradeRate/getTradeRate'
import { isRune } from 'lib/swapper/swappers/ThorchainSwapper/utils/isRune/isRune'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import { assertIsDefined } from 'lib/swapper/utils'

type GetSingleSwapSlippageArgs = {
  inputAmountThorPrecision: BigNumber
  pool: ThornodePoolResponse
  toRune: boolean
}

export const getSingleSwapSlippage = ({
  inputAmountThorPrecision,
  pool,
  toRune,
}: GetSingleSwapSlippageArgs): BigNumber => {
  // formula: (inputAmount) / (inputAmount + inputBalance)
  const inputBalance = toRune ? pool.balance_asset : pool.balance_rune // input is asset if toRune
  const denominator = inputAmountThorPrecision.plus(inputBalance)
  return inputAmountThorPrecision.div(denominator)
}

type GetDoubleSwapSlippageArgs = {
  inputAmountThorPrecision: BigNumber
  sellPool: ThornodePoolResponse
  buyPool: ThornodePoolResponse
}

export const getDoubleSwapSlippage = ({
  inputAmountThorPrecision,
  sellPool,
  buyPool,
}: GetDoubleSwapSlippageArgs): BigNumber => {
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
  inputAmountThorPrecision: BigNumber
  daemonUrl: string
  buyAssetId: AssetId
  sellAssetId: AssetId
}

export const getSlippage = async ({
  inputAmountThorPrecision,
  daemonUrl,
  buyAssetId,
  sellAssetId,
}: GetSlippageArgs): Promise<Result<BigNumber, SwapErrorRight>> => {
  return (await thorService.get<ThornodePoolResponse[]>(`${daemonUrl}/lcd/thorchain/pools`)).map(
    ({ data: poolData }) => {
      const buyPoolId = adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
      const sellPoolId = adapters.assetIdToPoolAssetId({ assetId: sellAssetId })
      const buyPool = buyPoolId ? poolData.find(response => response.asset === buyPoolId) : null
      const sellPool = sellPoolId ? poolData.find(response => response.asset === sellPoolId) : null
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
    },
  )
}
