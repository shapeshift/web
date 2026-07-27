import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName } from '../../../types'
import type { ButterSwapTradeRateInput } from '../types'
import { getButterSwapStepData } from '../utils/getButterSwapStepData'
import { getButterSwapTradeContext } from '../utils/getButterSwapTradeContext'

export const getTradeRate = async (
  input: ButterSwapTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, receiveAddress } = input

  const slippageTolerancePercentageDecimal = getDefaultSlippageDecimalPercentageForSwapper(
    SwapperName.ButterSwap,
  )

  const maybeContext = await getButterSwapTradeContext({
    input,
    deps,
    slippageTolerancePercentageDecimal,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getButterSwapStepData({ ...stepDataArgs, type: 'rate', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate' as const,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeRate])
}
