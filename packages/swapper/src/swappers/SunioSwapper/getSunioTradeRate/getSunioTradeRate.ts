import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import type { SunioTradeRateInput } from '../types'
import { getSunioStepData } from '../utils/getSunioStepData'
import { getSunioTradeContext } from '../utils/getSunioTradeContext'

export const getSunioTradeRate = async (
  input: SunioTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, receiveAddress } = input

  const maybeContext = await getSunioTradeContext({ input, deps })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  // Sun.io is tron-only, so the receive address is also the seller's account to simulate from
  const maybeStepData = await getSunioStepData({
    ...stepDataArgs,
    type: 'rate',
    input,
    from: input.sendAddress ?? receiveAddress,
  })

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
