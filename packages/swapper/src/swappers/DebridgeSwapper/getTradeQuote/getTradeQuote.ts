import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import { getDebridgeStepData } from '../utils/getDebridgeStepData'
import { getDebridgeTradeContext } from '../utils/getDebridgeTradeContext'
import type { DebridgeTradeQuoteInput } from '../utils/types'

export const getTradeQuote = async (
  input: DebridgeTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const maybeAddresses = assertQuoteAddresses(input)

  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  const maybeContext = await getDebridgeTradeContext({
    input,
    deps,
    senderAddress: sendAddress,
    recipientAddress: receiveAddress,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getDebridgeStepData({ ...stepDataArgs, type: 'quote', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber: input.accountNumber,
        transactionData,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeQuote])
}
