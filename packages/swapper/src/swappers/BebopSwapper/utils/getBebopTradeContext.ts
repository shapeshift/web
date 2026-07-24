import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import type { Address } from 'viem'
import { isAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { fetchBebopQuote } from './fetchFromBebop'
import type { GetBebopStepDataArgs } from './getBebopStepData'
import { assertValidTrade, calculateRate } from './helpers'

type BebopTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  stepDataArgs: Omit<GetBebopStepDataArgs, 'type' | 'input'>
}

export const getBebopTradeContext = async ({
  input,
  deps,
  from,
  receiver,
}: {
  input: GetEvmTradeQuoteInputBase | GetEvmTradeRateInput
  deps: SwapperDeps
  from: Address
  receiver: Address
}): Promise<Result<BebopTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, affiliateBps, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  const maybeBebopQuoteResponse = await fetchBebopQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress: from,
    receiverAddress: receiver,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    apiKey: deps.config.VITE_BEBOP_API_KEY,
  })

  if (maybeBebopQuoteResponse.isErr()) return Err(maybeBebopQuoteResponse.unwrapErr())
  const quote = maybeBebopQuoteResponse.unwrap()

  const sellTokenAddress = Object.keys(quote.sellTokens)[0]
  const buyTokenAddress = Object.keys(quote.buyTokens)[0]

  if (!isAddress(sellTokenAddress) || !isAddress(buyTokenAddress)) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid token addresses in response',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const sellAmount = quote.sellTokens[sellTokenAddress].amount
  const buyAmount = quote.buyTokens[buyTokenAddress].amount

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const buyTokenData = quote.buyTokens[buyTokenAddress]
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
      allowanceContract: isNativeEvmAsset(sellAsset.assetId) ? '' : quote.approvalTarget,
      rate,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      source: SwapperName.Bebop,
      estimatedExecutionTimeMs: 0,
      affiliateFee: buildAffiliateFee({
        strategy: 'buy_asset',
        affiliateBps,
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
        isEstimate: true,
      }),
    },
    stepDataArgs: {
      tx: quote.tx,
      sellAsset,
      from,
      deps,
    },
  })
}
