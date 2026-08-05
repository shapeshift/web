import { Err, Ok } from '@sniptt/monads'

import type { SwapperDeps, TradeQuote, TradeQuoteResult } from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import { normalizeEpochToMs } from '../../../utils/helpers'
import type { StonfiTradeQuoteInput } from '../types'
import { getStonfiStepData } from '../utils/getStonfiStepData'
import { getStonfiTradeContext } from '../utils/getStonfiTradeContext'

export const getTradeQuote = async (
  input: StonfiTradeQuoteInput,
  deps: SwapperDeps,
): Promise<TradeQuoteResult> => {
  const { accountNumber } = input

  const addresses = assertQuoteAddresses(input)
  if (addresses.isErr()) return Err(addresses.unwrapErr())
  const { sendAddress, receiveAddress } = addresses.unwrap()

  const maybeContext = await getStonfiTradeContext({ input, deps })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = getStonfiStepData({
    ...stepDataArgs,
    type: 'quote',
    input,
    from: sendAddress,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit, stonfiTransactionData } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    deadline: normalizeEpochToMs(stonfiTransactionData.tradeStartDeadline),
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        stonfiTransactionData,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeQuote])
}
