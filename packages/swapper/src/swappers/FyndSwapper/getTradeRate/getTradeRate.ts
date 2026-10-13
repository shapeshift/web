import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { EVM_PLACEHOLDER_ADDRESS } from '../../../utils/evm/constants'
import type { FyndTradeRateInput } from '../types'
import { getFyndStepData } from '../utils/getFyndStepData'
import { getFyndTradeContext } from '../utils/getFyndTradeContext'

export const getTradeRate = async (
  input: FyndTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, sendAddress, receiveAddress } = input

  const from = sendAddress ?? EVM_PLACEHOLDER_ADDRESS
  const to = receiveAddress ?? from

  const maybeContext = await getFyndTradeContext({ input, deps, from, to })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getFyndStepData({ ...stepDataArgs, type: 'rate', input })

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
