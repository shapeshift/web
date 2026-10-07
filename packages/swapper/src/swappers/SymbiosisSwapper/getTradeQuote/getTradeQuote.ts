import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import { FALLBACK_QUOTE_DEADLINE_MS } from '../../../utils/helpers'
import { getSymbiosisStepData } from '../utils/getSymbiosisStepData'
import { getSymbiosisTradeContext } from '../utils/getSymbiosisTradeContext'
import type { SymbiosisTradeQuoteInput } from '../utils/types'

export const getTradeQuote = async (
  input: SymbiosisTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  const maybeAddresses = assertQuoteAddresses(input)
  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  const maybeContext = await getSymbiosisTradeContext({
    input,
    deps,
    from: sendAddress,
    to: receiveAddress,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getSymbiosisStepData({ ...stepDataArgs, type: 'quote', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    deadline: Date.now() + FALLBACK_QUOTE_DEADLINE_MS,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        transactionData,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeQuote])
}
