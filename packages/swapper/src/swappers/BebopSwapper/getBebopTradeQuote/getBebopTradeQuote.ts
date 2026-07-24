import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getAddress } from 'viem'

import type {
  GetEvmTradeQuoteInputBase,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getBebopStepData } from '../utils/getBebopStepData'
import { getBebopTradeContext } from '../utils/getBebopTradeContext'

export const getBebopTradeQuote = async (
  input: GetEvmTradeQuoteInputBase,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { sendAddress, receiveAddress, accountNumber } = input

  if (!sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getBebopTradeQuote] sendAddress is required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getBebopTradeQuote] receiveAddress is required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const maybeContext = await getBebopTradeContext({
    input,
    deps,
    from: getAddress(sendAddress),
    receiver: getAddress(receiveAddress),
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getBebopStepData({ ...stepDataArgs, type: 'quote', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote',
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        transactionData,
        feeData: { protocolFees: {}, networkFeeCryptoBaseUnit },
      },
    ],
  }

  return Ok([tradeQuote])
}
