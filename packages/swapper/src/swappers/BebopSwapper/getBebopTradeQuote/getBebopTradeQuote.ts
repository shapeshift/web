import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getAddress } from 'viem'

import type {
  GetEvmTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import { getBebopStepData } from '../utils/getBebopStepData'
import { getBebopTradeContext } from '../utils/getBebopTradeContext'

export const getBebopTradeQuote = async (
  input: GetEvmTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  const maybeAddresses = assertQuoteAddresses(input)
  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

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
