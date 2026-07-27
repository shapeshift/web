import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  MultiHopTradeRateSteps,
  SingleHopTradeRateSteps,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
  TradeRateStep,
} from '../../../types'
import type { chainIdToRelayChainId as relayChainMapImplementation } from '../constant'
import { getRelayStepData } from '../utils/getRelayStepData'
import { getRelayTradeContext } from '../utils/getRelayTradeContext'
import type { RelayTradeRateInput } from '../utils/types'

export const getTradeRate = async (
  input: RelayTradeRateInput,
  deps: SwapperDeps,
  relayChainMap: typeof relayChainMapImplementation,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const maybeContext = await getRelayTradeContext({ input, deps, relayChainMap })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, relayStepInputs, stepDataArgs, relayId } =
    maybeContext.unwrap()

  const stepResults = await Promise.all(
    relayStepInputs.map(async ({ data, allowanceContract }) => {
      const maybeStepData = await getRelayStepData({ ...stepDataArgs, data, type: 'rate', input })

      return maybeStepData.map(
        ({ networkFeeCryptoBaseUnit }): TradeRateStep => ({
          ...stepCommon,
          accountNumber: undefined,
          allowanceContract,
          swapperMetadata: { name: 'relay', relayId, data: undefined },
          feeData: { networkFeeCryptoBaseUnit, protocolFees },
        }),
      )
    }),
  )

  for (const stepResult of stepResults) {
    if (stepResult.isErr()) return Err(stepResult.unwrapErr())
  }

  const steps = stepResults.map(stepResult => stepResult.unwrap()) as
    | SingleHopTradeRateSteps
    | MultiHopTradeRateSteps

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate' as const,
    receiveAddress: input.receiveAddress,
    steps,
  }

  return Ok([tradeRate])
}
