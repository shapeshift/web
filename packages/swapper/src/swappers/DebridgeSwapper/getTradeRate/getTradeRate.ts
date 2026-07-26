import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { DEFAULT_DEBRIDGE_USER_ADDRESS } from '../constant'
import { getDebridgeStepData } from '../utils/getDebridgeStepData'
import { getDebridgeTradeContext } from '../utils/getDebridgeTradeContext'
import type { DebridgeTradeRateInput } from '../utils/types'

export const getTradeRate = async (
  input: DebridgeTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const senderAddress = input.sendAddress ?? DEFAULT_DEBRIDGE_USER_ADDRESS
  const recipientAddress = input.receiveAddress ?? DEFAULT_DEBRIDGE_USER_ADDRESS

  const maybeContext = await getDebridgeTradeContext({
    input,
    deps,
    senderAddress,
    recipientAddress,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getDebridgeStepData({ ...stepDataArgs, type: 'rate', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate' as const,
    receiveAddress: recipientAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber: undefined,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeRate])
}
