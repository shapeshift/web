import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { assertQuoteAddresses, makeSwapErrorRight } from '../../../utils'
import type { FyndTradeQuoteInput } from '../types'
import { fetchFromFynd } from '../utils/fetchFromFynd'
import { getFyndStepData } from '../utils/getFyndStepData'
import { getFyndTradeContext } from '../utils/getFyndTradeContext'
import { assertValidTrade } from '../utils/helpers'

export const getTradeQuote = async (
  input: FyndTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const maybeAddresses = assertQuoteAddresses(input)
  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  const validation = assertValidTrade(input)
  if (validation.isErr()) return Err(validation.unwrapErr())

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Fynd)
  const maybeFynd = await fetchFromFynd({
    sellAsset: input.sellAsset,
    buyAsset: input.buyAsset,
    sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sender: sendAddress,
    receiver: receiveAddress,
    slippageTolerancePercentageDecimal,
    baseUrl: deps.config.VITE_FYND_ETHEREUM_BASE_URL,
    quoteOrRate: 'quote',
  })
  if (maybeFynd.isErr()) return Err(maybeFynd.unwrapErr())
  const { quote, routerAddress } = maybeFynd.unwrap()
  if (!quote.transaction) {
    return Err(
      makeSwapErrorRight({
        message: 'Fynd returned an unencoded quote',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const maybeContext = getFyndTradeContext({
    input,
    quote,
    routerAddress,
    slippageTolerancePercentageDecimal,
  })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees } = maybeContext.unwrap()

  const maybeStepData = await getFyndStepData({
    type: 'quote',
    input,
    deps,
    sellAsset: input.sellAsset,
    transaction: quote.transaction,
    from: sendAddress,
  })
  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote',
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber: input.accountNumber,
        transactionData,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ] as SingleHopTradeQuoteSteps,
  }

  return Ok([tradeQuote])
}
