import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  MultiHopTradeQuoteSteps,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeQuoteStep,
} from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import { FALLBACK_QUOTE_DEADLINE_MS } from '../../../utils/helpers'
import type { chainIdToRelayChainId as relayChainMapImplementation } from '../constant'
import { getRelayStepData } from '../utils/getRelayStepData'
import { getRelayTradeContext } from '../utils/getRelayTradeContext'
import type { RelayTradeQuoteInput } from '../utils/types'

export const getTradeQuote = async (
  input: RelayTradeQuoteInput,
  deps: SwapperDeps,
  relayChainMap: typeof relayChainMapImplementation,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  const addresses = assertQuoteAddresses(input)
  if (addresses.isErr()) return Err(addresses.unwrapErr())
  const { receiveAddress } = addresses.unwrap()

  const maybeContext = await getRelayTradeContext({ input, deps, relayChainMap })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, relayStepInputs, stepDataArgs, relayId } =
    maybeContext.unwrap()

  const stepResults = await Promise.all(
    relayStepInputs.map(async ({ data, allowanceContract }) => {
      const maybeStepData = await getRelayStepData({
        ...stepDataArgs,
        data,
        spenderAddress: allowanceContract,
        type: 'quote',
        input,
      })

      return maybeStepData.map(
        ({
          transactionData,
          relayTransactionMetadata,
          networkFeeCryptoBaseUnit,
        }): TradeQuoteStep => ({
          ...stepCommon,
          accountNumber,
          allowanceContract,
          transactionData,
          relayTransactionMetadata,
          swapperMetadata: {
            name: 'relay',
            relayId,
            data: transactionData?.type === 'evm' ? transactionData.data : undefined,
          },
          feeData: { networkFeeCryptoBaseUnit, protocolFees },
        }),
      )
    }),
  )

  for (const stepResult of stepResults) {
    if (stepResult.isErr()) return Err(stepResult.unwrapErr())
  }

  const steps = stepResults.map(stepResult => stepResult.unwrap()) as
    | SingleHopTradeQuoteSteps
    | MultiHopTradeQuoteSteps

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    deadline: Date.now() + FALLBACK_QUOTE_DEADLINE_MS,
    receiveAddress,
    steps,
  }

  return Ok([tradeQuote])
}
