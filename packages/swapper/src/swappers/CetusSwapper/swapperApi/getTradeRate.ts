import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import type { CetusTradeRateInput } from '../types'
import { CETUS_FEE_ESTIMATE_DUMMY_ADDRESS } from '../utils/constants'
import { getCetusStepData } from './getCetusStepData'
import { getCetusTradeContext } from './getCetusTradeContext'

export const getTradeRate = async (
  input: CetusTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, receiveAddress } = input

  const from = receiveAddress ?? CETUS_FEE_ESTIMATE_DUMMY_ADDRESS

  const maybeContext = await getCetusTradeContext(input, deps)

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getCetusStepData({ ...stepDataArgs, type: 'rate', input, from })

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
