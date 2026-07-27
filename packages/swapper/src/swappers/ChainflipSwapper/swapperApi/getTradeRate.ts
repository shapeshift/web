import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import type { ChainflipTradeRateInput } from '../types'
import { getChainflipStepData } from '../utils/getChainflipStepData'
import { getChainflipTradeContexts } from '../utils/getChainflipTradeContexts'

export const getTradeRate = async (
  input: ChainflipTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber } = input

  const maybeTradeContexts = await getChainflipTradeContexts(input, deps)

  if (maybeTradeContexts.isErr()) return Err(maybeTradeContexts.unwrapErr())
  const tradeContexts = maybeTradeContexts.unwrap()

  const tradeRates: TradeRate[] = []

  for (const { tradeCommon, stepCommon, protocolFees, stepDataArgs } of tradeContexts) {
    const maybeStepData = await getChainflipStepData({
      ...stepDataArgs,
      type: 'rate',
      input,
      from: input.sendAddress,
    })

    if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
    const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

    tradeRates.push({
      ...tradeCommon,
      quoteOrRate: 'rate' as const,
      receiveAddress: input.receiveAddress,
      steps: [
        {
          ...stepCommon,
          accountNumber,
          feeData: { networkFeeCryptoBaseUnit, protocolFees },
        },
      ],
    })
  }

  return Ok(tradeRates)
}
