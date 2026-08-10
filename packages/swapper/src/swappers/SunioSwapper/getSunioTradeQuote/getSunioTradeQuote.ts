import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import { FALLBACK_QUOTE_DEADLINE_MS } from '../../../utils/helpers'
import type { SunioTradeQuoteInput } from '../types'
import { getSunioStepData } from '../utils/getSunioStepData'
import { getSunioTradeContext } from '../utils/getSunioTradeContext'

export const getSunioTradeQuote = async (
  input: SunioTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  const addresses = assertQuoteAddresses(input)
  if (addresses.isErr()) return Err(addresses.unwrapErr())
  const { sendAddress, receiveAddress } = addresses.unwrap()

  const maybeContext = await getSunioTradeContext({ input, deps })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getSunioStepData({
    ...stepDataArgs,
    type: 'quote',
    input,
    from: sendAddress,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit, sunioTransactionData } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    deadline: Date.now() + FALLBACK_QUOTE_DEADLINE_MS,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        sunioTransactionData,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeQuote])
}
