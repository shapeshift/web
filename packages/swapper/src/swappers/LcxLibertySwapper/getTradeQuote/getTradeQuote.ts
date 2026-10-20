import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import { normalizeEpochToMs } from '../../../utils/helpers'
import type { LcxLibertyTradeQuoteInput } from '../types'
import { fetchLcxLibertySwap } from '../utils/fetchFromLcxLiberty'
import { getLcxLibertyStepData } from '../utils/getLcxLibertyStepData'
import { getLcxLibertyTradeContext } from '../utils/getLcxLibertyTradeContext'

export const getTradeQuote = async (
  input: LcxLibertyTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber, sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
    input

  const maybeAddresses = assertQuoteAddresses(input)
  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  const maybeContext = await getLcxLibertyTradeContext({ input, deps })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, chainId, quote, stepDataArgs } =
    maybeContext.unwrap()

  const maybeSwap = await fetchLcxLibertySwap({
    quote,
    chainId,
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    baseUrl: deps.config.VITE_LCX_LIBERTY_BASE_URL,
  })

  if (maybeSwap.isErr()) return Err(maybeSwap.unwrapErr())
  const { transaction, deadlineSeconds } = maybeSwap.unwrap()

  const maybeStepData = await getLcxLibertyStepData({
    ...stepDataArgs,
    type: 'quote',
    input,
    from: sendAddress,
    transaction,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    receiveAddress,
    // The router rejects the swap after the deadline encoded in the calldata
    deadline: normalizeEpochToMs(deadlineSeconds),
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
