import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import { FALLBACK_QUOTE_DEADLINE_MS } from '../../../utils/helpers'
import type { CetusTradeQuoteInput } from '../types'
import { getCetusStepData } from './getCetusStepData'
import { getCetusTradeContext } from './getCetusTradeContext'

export const getTradeQuote = async (
  input: CetusTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber, receiveAddress } = input

  const maybeAddresses = assertQuoteAddresses(input)

  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress } = maybeAddresses.unwrap()

  const maybeContext = await getCetusTradeContext(input, deps)

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getCetusStepData({
    ...stepDataArgs,
    type: 'quote',
    input,
    from: sendAddress,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    deadline: Date.now() + FALLBACK_QUOTE_DEADLINE_MS,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeQuote])
}
