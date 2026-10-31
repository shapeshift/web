import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { EVM_PLACEHOLDER_ADDRESS } from '../../../utils/evm/constants'
import type { CleaveTradeRateInput } from '../types'
import { getCleaveStepData } from '../utils/getCleaveStepData'
import { getCleaveTradeContext } from '../utils/getCleaveTradeContext'

export const getTradeRate = async (
  input: CleaveTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, sendAddress, receiveAddress } = input

  const from = sendAddress ?? EVM_PLACEHOLDER_ADDRESS
  const to = receiveAddress ?? from

  const maybeContext = await getCleaveTradeContext({ input, deps, from, to })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getCleaveStepData({ ...stepDataArgs, type: 'rate', input })

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
        feeData: { networkFeeCryptoBaseUnit, protocolFees: {} },
      },
    ],
  }

  return Ok([tradeRate])
}
