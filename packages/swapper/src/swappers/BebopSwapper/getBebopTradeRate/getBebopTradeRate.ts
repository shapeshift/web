import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import { isAddress } from 'viem'

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

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  const maybeBebopPriceResponse = await fetchBebopPrice({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
    apiKey,
  })

  if (maybeBebopPriceResponse.isErr()) return Err(maybeBebopPriceResponse.unwrapErr())
  const bebopPriceResponse = maybeBebopPriceResponse.unwrap()

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
        estimatedExecutionTimeMs: 0,
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
