import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import type { ArbitrumBridgeTradeRateInput } from '../types'
import { getArbitrumBridgeStepData } from '../utils/getArbitrumBridgeStepData'
import { getArbitrumBridgeTradeContext } from '../utils/getArbitrumBridgeTradeContext'

export const getTradeRate = async (
  input: ArbitrumBridgeTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, receiveAddress } = input

  const maybeContext = await getArbitrumBridgeTradeContext({ input, deps })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getArbitrumBridgeStepData({ ...stepDataArgs, type: 'rate', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate',
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        feeData: { protocolFees: {}, networkFeeCryptoBaseUnit },
      },
    ],
  }

  return Ok([tradeRate])
}
