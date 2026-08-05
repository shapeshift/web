import { Err, Ok } from '@sniptt/monads'

import type { SwapperDeps, TradeRate, TradeRateResult } from '../../../types'
import type { StonfiTradeRateInput } from '../types'
import { getStonfiStepData } from '../utils/getStonfiStepData'
import { getStonfiTradeContext } from '../utils/getStonfiTradeContext'

export const getTradeRate = async (
  input: StonfiTradeRateInput,
  deps: SwapperDeps,
): Promise<TradeRateResult> => {
  const { accountNumber, receiveAddress } = input

  const maybeContext = await getStonfiTradeContext({ input, deps })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = getStonfiStepData({ ...stepDataArgs, type: 'rate', input })
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
