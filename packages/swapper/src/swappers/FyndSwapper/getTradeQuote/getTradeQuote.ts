import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import type { FyndTradeQuoteInput } from '../types'
import { getFyndStepData } from '../utils/getFyndStepData'
import { getFyndTradeContext } from '../utils/getFyndTradeContext'

export const getTradeQuote = async (
  input: FyndTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  const maybeAddresses = assertQuoteAddresses(input)
  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  const maybeContext = await getFyndTradeContext({
    input,
    deps,
    from: sendAddress,
    to: receiveAddress,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, deadline, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getFyndStepData({ ...stepDataArgs, type: 'quote', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    receiveAddress,
    deadline,
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
