import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import type { Address } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeRateInput,
  SingleHopTradeRateSteps,
  SwapErrorRight,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { fetchBebopPrice } from '../utils/fetchFromBebop'
import { assertValidTrade, calculateRate } from '../utils/helpers/helpers'

export async function getBebopTradeRate(
  input: GetEvmTradeRateInput,
  _assetsById: AssetsByIdPartial,
  apiKey: string,
): Promise<Result<TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  // Validate the trade
  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  // Get slippage tolerance
  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  // Fetch price from Bebop (price endpoint doesn't require taker address)
  const maybeBebopPriceResponse = await fetchBebopPrice({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
    apiKey,
  })

  if (maybeBebopPriceResponse.isErr()) return Err(maybeBebopPriceResponse.unwrapErr())
  const bebopPriceResponse = maybeBebopPriceResponse.unwrap()

  // Get the best price route by matching the type
  const bestRoute = bebopPriceResponse.routes.find(r => r.type === bebopPriceResponse.bestPrice)
  if (!bestRoute || !bestRoute.quote) {
    return Err(
      makeSwapErrorRight({
        message: 'No best route found',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const quote = bestRoute.quote

  // Get the sell and buy token addresses
  const sellTokenAddress = Object.keys(quote.sellTokens)[0] as Address
  const buyTokenAddress = Object.keys(quote.buyTokens)[0] as Address

  if (!sellTokenAddress || !buyTokenAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid token data in response',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  // Get amounts from the tokens data
  const sellAmount = quote.sellTokens[sellTokenAddress].amount
  const buyAmount = quote.buyTokens[buyTokenAddress].amount

  // Calculate rate
  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  // Use amountBeforeFee if available, otherwise use the regular amount
  const buyTokenData = quote.buyTokens[buyTokenAddress]
  const buyAmountBeforeFeesCryptoBaseUnit = buyTokenData.amountBeforeFee || buyAmount
  const buyAmountAfterFeesCryptoBaseUnit = buyAmount

  // Extract gas fee from the quote
  const networkFeeCryptoBaseUnit = quote.gasFee?.native || '0'

  return Ok({
    id: uuid(),
    quoteOrRate: 'rate' as const,
    accountNumber: undefined,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    rate,
    swapperName: SwapperName.Bebop,
    steps: [
      {
        // Assume instant execution for same-chain swaps
        estimatedExecutionTimeMs: 0,
        // Use approval target from the quote
        allowanceContract: isNativeEvmAsset(sellAsset.assetId) ? undefined : quote.approvalTarget,
        buyAsset,
        sellAsset,
        accountNumber,
        rate,
        feeData: {
          protocolFees: {}, // Bebop doesn't charge protocol fees
          networkFeeCryptoBaseUnit,
        },
        buyAmountBeforeFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        source: SwapperName.Bebop,
      },
    ] as SingleHopTradeRateSteps,
  })
}
