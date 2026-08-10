import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { validateAndParseAddress } from 'starknet'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { assertQuoteAddresses, makeSwapErrorRight } from '../../../utils'
import { FALLBACK_QUOTE_DEADLINE_MS } from '../../../utils/helpers'
import type { AvnuTradeQuoteInput } from '../types'
import { getAvnuTradeContext } from '../utils/getAvnuTradeContext'

export const getTradeQuote = async (
  input: AvnuTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { sellAsset, accountNumber } = input

  const maybeAddresses = assertQuoteAddresses(input)
  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  try {
    // Starknet addresses can have different representations (with/without leading zeros) - normalize
    // to keep the quote and execution consistent
    const normalizedSendAddress = validateAndParseAddress(sendAddress)
    const normalizedReceiveAddress = validateAndParseAddress(receiveAddress)

    const maybeContext = await getAvnuTradeContext({ input, takerAddress: normalizedSendAddress })

    if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
    const { tradeCommon, stepCommon, protocolFees, quoteId, sellTokenAddress, deadline } =
      maybeContext.unwrap()

    const adapter = deps.assertGetStarknetChainAdapter(sellAsset.chainId)

    const feeData = await adapter.getFeeData({
      to: normalizedReceiveAddress,
      value: stepCommon.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: {
        from: normalizedSendAddress,
        tokenContractAddress: sellTokenAddress,
      },
      sendMax: false,
    })

    const tradeQuote: TradeQuote = {
      ...tradeCommon,
      receiveAddress: normalizedReceiveAddress,
      quoteOrRate: 'quote',
      deadline: deadline ?? Date.now() + FALLBACK_QUOTE_DEADLINE_MS,
      steps: [
        {
          ...stepCommon,
          accountNumber,
          feeData: { protocolFees, networkFeeCryptoBaseUnit: feeData.fast.txFee },
          swapperMetadata: { name: 'avnu', quoteId },
        },
      ],
    }

    return Ok([tradeQuote])
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting AVNU quote',
        code: TradeQuoteError.QueryFailed,
        cause: error,
      }),
    )
  }
}
