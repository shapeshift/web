import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetSolanaTradeQuoteInput,
  GetSolanaTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { BebopSolanaQuoteResponse } from '../types'
import { fetchBebopSolanaQuote } from './fetchFromBebop'
import { assertValidTrade, calculateRate } from './helpers'

type BebopSolanaTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  response: BebopSolanaQuoteResponse
}

export const getBebopSolanaTradeContext = async ({
  input,
  deps,
  takerAddress,
  receiverAddress,
}: {
  input: GetSolanaTradeQuoteInput | GetSolanaTradeRateInput
  deps: SwapperDeps
  takerAddress: string
  receiverAddress: string
}): Promise<Result<BebopSolanaTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, affiliateBps, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  const maybeBebopQuoteResponse = await fetchBebopSolanaQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress,
    receiverAddress,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    apiKey: deps.config.VITE_BEBOP_API_KEY,
  })

  if (maybeBebopQuoteResponse.isErr()) return Err(maybeBebopQuoteResponse.unwrapErr())
  const response = maybeBebopQuoteResponse.unwrap()

  const sellTokenAddress = Object.keys(response.sellTokens)[0]
  const buyTokenAddress = Object.keys(response.buyTokens)[0]

  if (!sellTokenAddress || !buyTokenAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid token addresses in response',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const sellAmount = response.sellTokens[sellTokenAddress].amount
  const buyAmount = response.buyTokens[buyTokenAddress].amount

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const buyTokenData = response.buyTokens[buyTokenAddress]
  const buyAmountBeforeFeesCryptoBaseUnit = buyTokenData.amountBeforeFee || buyAmount
  const buyAmountAfterFeesCryptoBaseUnit = buyAmount

  return Ok({
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.Bebop,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      allowanceContract: '',
      rate,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      source: SwapperName.Bebop,
      estimatedExecutionTimeMs: 0,
    },
    response,
  })
}
